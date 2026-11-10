import { useEffect, useRef, type RefObject } from 'react'
import {
  BoxGeometry, CircleGeometry, Color, CylinderGeometry, DirectionalLight, ExtrudeGeometry, Fog, Group, HemisphereLight,
  IcosahedronGeometry, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PCFShadowMap,
  PerspectiveCamera, RingGeometry, Scene, Shape, Vector3, WebGLRenderer, type BufferGeometry, type Material,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { attentionStatus, initialHomes, needsAttention, plots, type DemoHome } from './demoData'

type Filter = 'unresolved_concern' | 'unusual_inactivity' | null
type SceneProps = { homes: DemoHome[]; selected: string; filter: Filter; top: boolean; zoom: number; reset: number; onUnavailable: () => void; labels: RefObject<HTMLDivElement | null> }
type WorldState = { homes: DemoHome[]; selected: string; filter: Filter }

// "Paper model" palette: a presentation-model look with soft, warm neutrals.
const P = {
  guardWall: '#f0e2c8', guardRoof: '#8e7c66', guardTrim: '#a78b67', boomA: '#fbf8f1', boomB: '#b8a27f',
  bg: '#ebe5d6', plinthSide: '#c9bda7', plinthEdge: '#f7f2e8', lawn: '#dcdcc8', park: '#c9cfaf',
  road: '#c4bfb5', roadLine: '#f7f3ea', path: '#efe9dd', wall: '#fbf8f1', roof: '#d6ccbd', fin: '#efe8dc', window: '#7f8a8a', door: '#a39280',
  porch: '#e3dbcd', yard: '#eee9de', gate: '#d9d0c1', tree: '#a3b08a', tree2: '#8d9c76', trunk: '#9a8a73', water: '#bccbc6',
  concern: '#b05a36', inactivity: '#e8892e', ring: '#8b4429',
}
const ANCHOR_Y = 7.4
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const isActive = (home: DemoHome | undefined, filter: Filter): home is DemoHome => !!home && needsAttention(home) && (!filter || attentionStatus(home) === filter)

function gableGeometry(halfDepth: number, height: number, length: number) {
  const s = new Shape(); s.moveTo(-halfDepth, 0); s.lineTo(halfDepth, 0); s.lineTo(0, height); s.closePath()
  const g = new ExtrudeGeometry(s, { depth: length, bevelEnabled: false })
  g.rotateY(Math.PI / 2); g.translate(-length / 2, 0, 0); g.computeVertexNormals(); return g
}

function buildModel(scene: Scene) {
  scene.background = new Color(P.bg)
  scene.fog = new Fog(P.bg, 420, 800)
  scene.add(new HemisphereLight('#ffffff', '#d6cebf', 1.25))
  const sun = new DirectionalLight('#fff8ee', 1.9)
  sun.position.set(-70, 120, 45); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096)
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 10, far: 400 })
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.target.position.set(5, 0, 7); scene.add(sun, sun.target)

  const mats: Record<string, MeshStandardMaterial> = {}
  const mat = (c: string, roughness = 0.95) => mats[c + roughness] ??= new MeshStandardMaterial({ color: c, roughness })
  const unitBox = new BoxGeometry(1, 1, 1)
  const add = (geo: BufferGeometry, m: Material, at: [number, number, number], scale?: [number, number, number], cast = true) => {
    const mesh = new Mesh(geo, m); mesh.position.set(...at); if (scale) mesh.scale.set(...scale)
    mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); return mesh
  }
  const slab = (at: [number, number, number], size: [number, number, number], c: string, cast = true) => add(unitBox, mat(c), at, size, cast)

  // Plinth with a lighter lip, like a presentation model base.
  slab([8, -1.6, 7], [136, 3.2, 90], P.plinthSide, false)
  slab([8, -0.02, 7], [136.4, 0.12, 90.4], P.plinthEdge, false)
  slab([8, 0.02, 7], [133, 0.1, 87], P.lawn, false)
  // Roads with kerbs and centre dashes.
  const roads = [[4, -18, 116, 5], [4, 2, 116, 5], [24, 21, 76, 5], [24, 35, 76, 5]]
  roads.forEach(([x, z, w, d], i) => {
    slab([x, 0.09, z], [w, 0.06, d], P.road, false)
    slab([x, 0.1, z - d / 2 - 0.25], [w, 0.1, 0.5], P.path, false)
    slab([x, 0.1, z + d / 2 + 0.25], [w, 0.1, 0.5], P.path, false)
    for (let j = 0; j < (i > 1 ? 15 : 24); j++) slab([(i > 1 ? -10 : -51) + j * 4.7, 0.125, z], [1.6, 0.01, 0.14], P.roadLine, false)
  })
  ;[[56, 4.5, 5, 57], [17, 14, 5, 42], [-51, -19, 5, 12]].forEach(([x, z, w, d]) => slab([x, 0.095, z], [w, 0.07, d], P.road, false))

  // Communal courtyard: lawn, cross paths, pond, pavilion.
  slab([35, 0.1, 20], [29, 0.08, 12], P.park, false)
  slab([35, 0.15, 20], [26, 0.04, 1.4], P.path, false)
  slab([33, 0.15, 20], [1.4, 0.04, 11], P.path, false)
  add(new CylinderGeometry(1, 1, 0.06, 40), mat(P.water, 0.3), [26.5, 0.16, 23], [2.6, 1, 1.6], false)
  slab([40, 0.25, 20], [5, 0.3, 4], P.path, false)
  ;[[38, 18.6], [42, 18.6], [38, 21.4], [42, 21.4]].forEach(([x, z]) => slab([x, 1.4, z], [0.3, 2.4, 0.3], P.wall))
  add(gableGeometry(2.6, 1.3, 5.6), mat(P.roof), [40, 2.6, 20])

  // Guardhouse and entrance.
  slab([61, 0.15, 1], [7, 0.2, 7], P.path, false)
  slab([61, 1.6, 1], [5, 3, 5], P.guardWall); slab([61, 3.35, 1], [6.6, 0.5, 6.6], P.guardRoof)
  slab([61, 3.75, 1], [6.8, 0.3, 6.8], P.guardTrim)
  slab([58.46, 1.9, 1], [0.08, 1.2, 3.4], P.window, false)
  slab([58.46, 1.0, -1.4], [0.08, 1.9, 0.9], P.door, false)
  slab([59, 1.6, -3.2], [0.8, 3.2, 0.8], P.guardWall); slab([59, 1.6, 5.2], [0.8, 3.2, 0.8], P.guardWall)
  slab([59, 3.3, 1], [1.0, 0.3, 9.4], P.guardRoof)
  for (let k = 0; k < 6; k++) slab([58.5, 1.2, -2.5 + k * 1.2], [0.16, 0.16, 1.2], k % 2 ? P.boomB : P.boomA)
  slab([71, 0.12, 4.5], [3, 0.1, 57], P.path, false)

  // Terraced homes (instanced). Facing: +1 means the front door faces +z.
  const facing = (z: number) => [-25, -5, 15, 30].includes(z) ? 1 : -1
  const N = plots.length, D = 5, H = 3.5
  const bodies = new InstancedMesh(unitBox, mat('#ffffff'), N)
  const roofs = new InstancedMesh(gableGeometry(2.85, 1.7, 1), mat('#ffffff'), N)
  const fins = new InstancedMesh(gableGeometry(2.62, 1.95, 0.18), mat(P.fin), N * 2)
  const porches = new InstancedMesh(unitBox, mat(P.porch), N)
  const yards = new InstancedMesh(unitBox, mat(P.yard), N)
  const gates = new InstancedMesh(unitBox, mat(P.gate), N)
  const wins = new InstancedMesh(unitBox, mat(P.window, 0.35), N * 3)
  const doors = new InstancedMesh(unitBox, mat(P.door), N)
  ;[bodies, roofs, fins, porches, gates, doors].forEach(m => { m.castShadow = true; m.receiveShadow = true })
  yards.receiveShadow = true; wins.receiveShadow = true
  const o = new Object3D()
  const set = (mesh: InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(0, 0, 0); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix)
  }
  plots.forEach((p, i) => {
    const w = (p.twin ? 4.5 : 3.35) - 0.02, f = facing(p.z), front = p.z + f * D / 2
    set(bodies, i, p.x, H / 2, p.z, w, H, D)
    set(roofs, i, p.x, H, p.z, w + 0.02, 1, 1)
    set(fins, i * 2, p.x - w / 2, H, p.z, 1, 1, 1); set(fins, i * 2 + 1, p.x + w / 2, H, p.z, 1, 1, 1)
    set(porches, i, p.x, 2.35, front + f * 0.75, w - 0.4, 0.14, 1.5)
    set(yards, i, p.x, 0.12, front + f * 0.75, w - 0.15, 0.05, 1.5)
    set(gates, i, p.x - 0.4, 0.3, front + f * 1.48, w - 1.0, 0.45, 0.08)
    set(wins, i * 3, p.x - w * 0.14, 2.65, front + f * 0.02, w * 0.48, 0.85, 0.06)
    set(wins, i * 3 + 1, p.x - w * 0.22, 1.15, front + f * 0.02, w * 0.36, 0.95, 0.06)
    set(wins, i * 3 + 2, p.x, 2.65, p.z - f * (D / 2 + 0.02), w * 0.5, 0.75, 0.06)
    set(doors, i, p.x + w * 0.24, 0.85, front + f * 0.02, 0.8, 1.7, 0.06)
  })
  const cWall = new Color(P.wall), cRoof = new Color(P.roof), cWin = new Color(P.window)
  plots.forEach((_, i) => {
    bodies.setColorAt(i, cWall); roofs.setColorAt(i, cRoof)
    for (let k = 0; k < 3; k++) wins.setColorAt(i * 3 + k, cWin)
  })
  scene.add(bodies, roofs, fins, porches, yards, gates, wins, doors)

  // Trees: two stacked crowns on a trunk, instanced.
  const spots: [number, number, number][] = []
  for (let i = 0; i < 25; i++) spots.push([-54 + i * 4.7, -32, i % 3 === 0 ? 0.75 : 1])
  for (let i = 0; i < 12; i++) spots.push([-52 + i * 3.6, -5 + i * 4.5, 1])
  ;[23, 28, 43, 48, 30, 45].forEach((x, k) => spots.push([x, k > 3 ? 23.5 : 16.5, 0.7]))
  for (let i = 0; i < 12; i++) spots.push([2 + i * 4.7, 47.5, 0.8])
  for (let i = 0; i < 9; i++) spots.push([74, -30 + i * 7, 0.85])
  const trunks = new InstancedMesh(new CylinderGeometry(0.16, 0.22, 1, 8), mat(P.trunk), spots.length)
  const crownGeo = new IcosahedronGeometry(1, 2)
  const crownA = new InstancedMesh(crownGeo, mat(P.tree), spots.length)
  const crownB = new InstancedMesh(crownGeo, mat(P.tree2), spots.length)
  spots.forEach(([x, z, s], i) => {
    const r = 0.85 + ((i * 37) % 10) / 30
    set(trunks, i, x, 0.9 * s, z, s, 1.8 * s, s)
    set(crownA, i, x, 2.7 * s * r, z, 1.6 * s * r, 1.45 * s * r, 1.6 * s * r)
    set(crownB, i, x + 0.7 * s, 2.0 * s * r, z + 0.5 * s, 1.05 * s * r, 0.95 * s * r, 1.05 * s * r)
  })
  ;[trunks, crownA, crownB].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m) })

  // Highlights for homes that need attention, rebuilt on every update.
  const hl = new Group(); scene.add(hl)
  const ringGeo = new RingGeometry(4.2, 4.55, 72).rotateX(-Math.PI / 2)
  const padGeo = new CircleGeometry(4.2, 60).rotateX(-Math.PI / 2)
  let rings: Mesh<RingGeometry, MeshBasicMaterial>[] = []
  return {
    update({ homes, selected, filter }: WorldState) {
      hl.children.slice().forEach(c => {
        hl.remove(c)
        const m = c as Mesh
        if (m.geometry !== ringGeo && m.geometry !== padGeo) m.geometry.dispose()
        ;(m.material as Material).dispose()
      })
      rings = []
      plots.forEach(p => {
        const home = homes.find(h => h.x === p.x && h.z === p.z)
        if (!isActive(home, filter)) return
        const col = home.status === 'inactivity' ? P.inactivity : P.concern
        const roof = new Mesh(gableGeometry(2.9, 1.74, (p.twin ? 4.5 : 3.35) + 0.06), new MeshStandardMaterial({ color: col, roughness: 0.8 }))
        roof.position.set(p.x, H + 0.005, p.z); roof.castShadow = true; hl.add(roof)
        if (home.id === selected) {
          const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: P.ring, transparent: true, opacity: 0.9, depthWrite: false }))
          ring.position.set(p.x, 0.2, p.z); hl.add(ring); rings.push(ring)
          const pad = new Mesh(padGeo, new MeshBasicMaterial({ color: P.ring, transparent: true, opacity: 0.12, depthWrite: false }))
          pad.position.set(p.x, 0.18, p.z); hl.add(pad)
        }
      })
    },
    tick(t: number) {
      if (reduceMotion()) return
      const k = (t / 1800) % 1
      rings.forEach(r => { const s = 1 + k * 0.35; r.scale.set(s, 1, s); r.material.opacity = 0.9 * (1 - k) })
    },
  }
}

function projectLabels(layer: HTMLDivElement | null, camera: PerspectiveCamera, W: number, H: number, v: Vector3) {
  if (!layer) return
  const placed: { left: number; right: number; top: number; bottom: number }[] = []
  layer.querySelectorAll<HTMLElement>('[data-map-x]').forEach(el => {
    v.set(Number(el.dataset.mapX), Number(el.dataset.mapY ?? ANCHOR_Y), Number(el.dataset.mapZ)).project(camera)
    const visible = v.z >= -1 && v.z <= 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1
    const ax = (v.x * 0.5 + 0.5) * W, ay = (-v.y * 0.5 + 0.5) * H
    const w = el.offsetWidth, h = el.offsetHeight
    const cx = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, ax))
    let bottom = ay
    if (el instanceof HTMLButtonElement && visible) {
      for (const o of placed) if (cx - w / 2 < o.right + 8 && cx + w / 2 > o.left - 8 && bottom - h < o.bottom + 8 && bottom > o.top - 8) bottom = o.top - 8
      bottom = Math.max(h + 8, bottom)
      placed.push({ left: cx - w / 2, right: cx + w / 2, top: bottom - h, bottom })
    }
    el.style.transform = `translate(${cx}px, ${bottom}px) translate(-50%, -100%)`
    el.style.visibility = visible ? 'visible' : 'hidden'
    const id = el.dataset.homeId
    const line = id && layer.querySelector<SVGLineElement>(`[data-map-leader="${id}"]`)
    if (line) {
      line.setAttribute('x1', String(ax)); line.setAttribute('y1', String(ay))
      line.setAttribute('x2', String(cx)); line.setAttribute('y2', String(bottom))
      line.style.visibility = visible ? 'visible' : 'hidden'
    }
  })
}

type Engine = { update: (s: WorldState) => void; setCamera: (top: boolean, zoom: number) => void; dispose: () => void }

function createEngine(container: HTMLDivElement, labels: RefObject<HTMLDivElement | null>, onUnavailable: () => void, init: WorldState & { top: boolean; zoom: number }): Engine {
  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' })
  container.appendChild(renderer.domElement)
  const canvas = renderer.domElement
  canvas.addEventListener('webglcontextlost', () => { if (canvas.isConnected) onUnavailable() }, { once: true })

  const scene = new Scene()
  const camera = new PerspectiveCamera(26, 1, 1, 1500)
  const controls = new OrbitControls(camera, canvas)
  controls.minDistance = 40; controls.maxDistance = 520; controls.enableDamping = true; controls.dampingFactor = 0.08
  controls.maxPolarAngle = Math.PI / 2.15
  const world = buildModel(scene)
  world.update(init)
  let top = init.top, zoom = init.zoom, W = 1, H = 1

  const placeCamera = () => {
    const aspect = W / H
    camera.aspect = aspect
    const t = Math.tan(MathUtils.degToRad(13))
    const d = Math.max(top ? 68 / (t * aspect) : 88 / (t * aspect), top ? 50 / t : 56 / t) / zoom
    if (top) camera.position.set(6, d, 6.01)
    else { const dir = new Vector3(92, 118, 124).normalize(); camera.position.set(12 + dir.x * d, dir.y * d, 15 + dir.z * d) }
    const tg: [number, number, number] = top ? [6, 0, 6.5] : [12, 0, 15]
    camera.up.set(0, 1, 0); controls.target.set(...tg); camera.lookAt(...tg)
    controls.enableRotate = !top
    camera.updateProjectionMatrix(); controls.update()
  }
  const resize = () => {
    W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight)
    renderer.setSize(W, H, false); placeCamera()
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize()

  const v = new Vector3()
  let raf = 0, timer = 0, alive = true
  const loop = (t: number) => {
    if (!alive) return
    controls.update(); world.tick(t); renderer.render(scene, camera); projectLabels(labels.current, camera, W, H, v)
    if (document.hidden) timer = window.setTimeout(() => loop(performance.now()), 120)
    else raf = requestAnimationFrame(loop)
  }
  loop(performance.now())

  return {
    update: s => world.update(s),
    setCamera: (nextTop, nextZoom) => { top = nextTop; zoom = nextZoom; placeCamera() },
    dispose() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(timer); ro.disconnect(); controls.dispose()
      scene.traverse(obj => {
        const m = obj as Mesh
        m.geometry?.dispose()
        const mt = m.material as Material | Material[] | undefined
        if (Array.isArray(mt)) mt.forEach(x => x.dispose()); else mt?.dispose()
      })
      renderer.dispose(); canvas.remove()
    },
  }
}

export default function LandedScene({ homes, selected, filter, top, zoom, reset, onUnavailable, labels }: SceneProps) {
  const container = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine | null>(null)
  const unavailable = useRef(onUnavailable)
  const list = homes.length ? homes : initialHomes
  const latest = useRef({ homes: list, selected, filter, top, zoom })
  useEffect(() => {
    unavailable.current = onUnavailable
    latest.current = { homes: list, selected, filter, top, zoom }
  })

  useEffect(() => {
    const el = container.current
    if (!el) return
    try { engine.current = createEngine(el, labels, () => unavailable.current(), latest.current) }
    catch (error) { console.error(error); unavailable.current(); return }
    return () => { engine.current?.dispose(); engine.current = null }
  }, [labels])

  useEffect(() => { engine.current?.update({ homes: list, selected, filter }) }, [list, selected, filter])
  useEffect(() => { engine.current?.setCamera(top, zoom) }, [top, zoom, reset])

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />
}
