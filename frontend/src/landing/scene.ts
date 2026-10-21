import * as THREE from 'three'

const HEADER_HEIGHT = 72

// Ported from the design export: a scroll-driven camera flies from the township into Madam Lee's living room.
export function startScene(root: HTMLElement, mode: 'landing' | 'presentation' = 'landing') {
  const q = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-lp="${name}"]`)!
  const canvas = q<HTMLCanvasElement>('canvas')
  const track = mode === 'landing' ? q('track') : null
  const intro = mode === 'landing' ? q('intro') : null
  const cap1 = mode === 'landing' ? q('cap1') : null
  const cap2 = mode === 'landing' ? q('cap2') : null
  const hero = mode === 'landing' ? q('hero') : null
  const powerLabel = mode === 'landing' ? q('power') : null
  const doorLabel = mode === 'landing' ? q('door') : null
  const state = { lightOn: true, doorOpen: false }
  const showHeroOnly = () => {
    if (hero) {
      hero.style.opacity = '1'
      hero.style.pointerEvents = 'auto'
    }
    if (intro) intro.style.opacity = '0'
  }

  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: mode === 'presentation' }) } catch {
    showHeroOnly()
    return () => {}
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // The design was authored on three r149 (no colour management, legacy lights); keep its palette while building.
  const colorManagement = THREE.ColorManagement.enabled
  THREE.ColorManagement.enabled = false
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#fef9ef')
  scene.fog = new THREE.Fog('#fef9ef', 90, 220)
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 500)
  scene.add(new THREE.HemisphereLight('#fff8ee', '#d9c7ad', 0.85 * Math.PI))
  const sun = new THREE.DirectionalLight('#ffe6c4', 0.95 * Math.PI)
  sun.position.set(40, 60, 45)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 200 })
  scene.add(sun)

  const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, ...o })
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    b.position.set(x, y, z)
    b.castShadow = true
    b.receiveShadow = true
    parent.add(b)
    return b
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat('#efe5d4'))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  box(80, .1, 16, mat('#e3d5c1'), 0, .05, 16)
  box(120, .12, 9, mat('#ded3c6'), 0, .06, 30)

  const U = 4.2, FH = 3.4, D = 12
  const M = {
    wall: mat('#f5eee1'), trim: mat('#b05a36'), frame: mat('#d1c9bf'),
    litGlass: mat('#ffd36c', { emissive: new THREE.Color('#ffb04a'), emissiveIntensity: .55, roughness: .4 }),
    offGlass: mat('#304e63', { roughness: .3 }), neutralGlass: mat('#c3ced0', { roughness: .3, metalness: .1 }),
    rail: mat('#8b4429'), slab: mat('#e9dfd0'), muted: mat('#ece3d4'), mutedGlass: mat('#d5dcdb', { roughness: .4 }),
  }
  const glassOn = new THREE.Color('#ffd36c'), glassOff = new THREE.Color('#304e63')
  let heroGlass: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | undefined
  let heroFrame: THREE.Mesh | undefined
  let hp = new THREE.Vector3()
  const block = (cx: number, cz: number, floors: number, cols: number, kind: 'main' | 'muted') => {
    const W = cols * U + 1.2, H = floors * FH + .8
    box(W, H, D, kind === 'main' ? M.wall : M.muted, cx, H / 2, cz)
    box(W + .8, .5, D + .8, kind === 'main' ? M.trim : M.slab, cx, H + .25, cz)
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const x = cx - W / 2 + .6 + c * U + U / 2, y = .6 + f * FH + FH / 2, z = cz + D / 2
      const isHero = kind === 'main' && f === 0 && c === 4
      const fr = box(U - .5, FH - .7, .25, M.frame, x, y + .1, z + .05)
      let g = M.mutedGlass
      if (kind === 'main') g = f === 0 ? (c === 1 ? M.offGlass : M.litGlass) : M.neutralGlass
      const gm = box(U - 1.1, FH - 1.3, .2, isHero ? g.clone() : g, x, y + .15, z + .12)
      if (kind === 'main') {
        box(U - .2, .18, 1.1, M.slab, x, y - FH / 2 + .45, z + .6)
        box(U - .2, .7, .08, f === 0 ? M.rail : M.frame, x, y - FH / 2 + .9, z + 1.12)
      }
      if (isHero) {
        heroFrame = fr
        heroGlass = gm as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
        hp = new THREE.Vector3(x, y + .15, z)
      }
    }
  }
  block(0, 0, 4, 6, 'main')
  block(-40, -22, 11, 5, 'muted')
  block(38, -26, 14, 5, 'muted')
  block(4, -48, 9, 8, 'muted')
  const trunk = mat('#8d6e5d'), leaf1 = mat('#9bbd70'), leaf2 = mat('#88a95f');
  [[-22, 12], [22, 12], [-30, 26], [30, 26], [-12, 34], [14, 36], [-46, 8], [48, 10], [0, 40]].forEach(([x, z], i) => {
    box(.5, 2.4, .5, trunk, x, 1.2, z)
    const s = new THREE.Mesh(new THREE.SphereGeometry(2 + (i % 3) * .4, 16, 12), i % 2 ? leaf1 : leaf2)
    s.position.set(x, 3.6 + (i % 3) * .3, z)
    s.castShadow = true
    scene.add(s)
  })

  // A small greeting on the cover gives the township a human, community-focused moment.
  if (mode === 'presentation') {
    const skin = mat('#d7a886'), hair = mat('#554235'), trousers = mat('#514d51')
    const person = (x: number, z: number, coat: string, facing: number) => {
      const group = new THREE.Group()
      group.position.set(x, .1, z)
      group.rotation.y = facing
      scene.add(group)
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.42, .52, 1.35, 10), mat(coat))
      body.position.y = 1.55
      body.castShadow = true
      group.add(body)
      const head = new THREE.Mesh(new THREE.SphereGeometry(.38, 14, 10), skin)
      head.position.y = 2.53
      head.castShadow = true
      group.add(head)
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.39, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair)
      cap.position.y = 2.63
      group.add(cap)
      box(.24, .9, .28, trousers, -.2, .53, 0, group)
      box(.24, .9, .28, trousers, .2, .53, 0, group)
      box(.22, .95, .25, skin, -.62, 1.5, 0, group).rotation.z = -.28
      box(.22, .95, .25, skin, .62, 1.5, 0, group).rotation.z = .28
      return group
    }
    person(8, 22, '#a95130', -.35)
    person(10.3, 22.5, '#789566', 2.8)
  }

  // Interior, built behind the hero window
  const room = new THREE.Group()
  scene.add(room)
  const F0 = .6, RH = 3.2, RX = hp.x, RZ = hp.z - .35, RW = 7.4, RD = 7
  const im = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, ...o })
  const rb = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = room) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    b.position.set(x, y, z)
    parent.add(b)
    return b
  }
  const plane = (w: number, h: number, m: THREE.Material, x: number, y: number, z: number, rx: number, ry: number) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m)
    p.position.set(x, y, z)
    p.rotation.set(rx, ry, 0)
    room.add(p)
  }
  const wallM = im('#fff0d6'), wallM2 = im('#f6e3c6')
  plane(RW, RD, im('#c6ad8f'), RX, F0 + .01, RZ - RD / 2, -Math.PI / 2, 0)
  plane(RW, RD, im('#fef9ef'), RX, F0 + RH, RZ - RD / 2, Math.PI / 2, 0)
  plane(RW, RH, wallM, RX, F0 + RH / 2, RZ - RD, 0, 0)
  plane(RD, RH, wallM2, RX - RW / 2, F0 + RH / 2, RZ - RD / 2, 0, Math.PI / 2)
  plane(RD, RH, wallM2, RX + RW / 2, F0 + RH / 2, RZ - RD / 2, 0, -Math.PI / 2)
  rb(RW, .12, .06, im('#d1b48f'), RX, F0 + .06, RZ - RD + .04)
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), im('#e7b990'))
  rug.rotation.x = -Math.PI / 2
  rug.position.set(RX + .6, F0 + .02, RZ - 4.2)
  room.add(rug)
  // sofa against back wall
  const sofaM = im('#b05a36'), sofaD = im('#8b4429')
  rb(2.6, .45, .95, sofaD, RX + .9, F0 + .25, RZ - RD + .6)
  rb(2.6, .7, .25, sofaM, RX + .9, F0 + .8, RZ - RD + .2)
  rb(1.2, .18, .7, sofaM, RX + .3, F0 + .55, RZ - RD + .7)
  rb(1.2, .18, .7, sofaM, RX + 1.55, F0 + .55, RZ - RD + .7)
  rb(.25, .65, .95, sofaD, RX - .45, F0 + .4, RZ - RD + .6)
  rb(.25, .65, .95, sofaD, RX + 2.25, F0 + .4, RZ - RD + .6)
  // coffee table + teacup
  const wood = im('#8d6e5d'), woodL = im('#ba8564')
  rb(1.3, .08, .7, woodL, RX + .9, F0 + .45, RZ - 4.3);
  [[-.55, -.28], [.55, -.28], [-.55, .28], [.55, .28]].forEach(([dx, dz]) => rb(.06, .42, .06, wood, RX + .9 + dx, F0 + .21, RZ - 4.3 + dz))
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.07, .06, .1, 16), im('#fef9ef'))
  cup.position.set(RX + .7, F0 + .54, RZ - 4.25)
  room.add(cup)
  // picture above sofa
  rb(1.4, .9, .05, wood, RX + .9, F0 + 2.15, RZ - RD + .03)
  rb(1.25, .75, .02, im('#9bbd70'), RX + .9, F0 + 2.15, RZ - RD + .07)
  // lamp (click target)
  const lamp = new THREE.Group()
  lamp.position.set(RX + 2.75, F0, RZ - RD + .55)
  room.add(lamp)
  rb(.36, .05, .36, wood, 0, .03, 0, lamp)
  rb(.05, 1.5, .05, wood, 0, .78, 0, lamp)
  const shadeM = im('#ffe3a8', { emissive: new THREE.Color('#ffb04a'), emissiveIntensity: .9, side: THREE.DoubleSide })
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.2, .32, .38, 24, 1, true), shadeM)
  shade.position.y = 1.6
  lamp.add(shade)
  // three r155+ dropped legacy light units; scale to match the r149 design.
  const POINT = Math.PI
  const lampLight = new THREE.PointLight('#ffc77a', 1.3 * POINT, 11, 2)
  lampLight.position.set(RX + 2.75, F0 + 1.6, RZ - RD + .9)
  room.add(lampLight)
  const fill = new THREE.PointLight('#fff1dc', .35 * POINT, 14, 2)
  fill.position.set(RX - 1, F0 + 2.8, RZ - 2.5)
  room.add(fill)
  // kitchen counter on right wall with kettle
  rb(.7, .9, 2.6, im('#e9dfd0'), RX + RW / 2 - .36, F0 + .45, RZ - 2.4)
  rb(.76, .06, 2.66, im('#a76d47'), RX + RW / 2 - .36, F0 + .93, RZ - 2.4)
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, .26, 20), im('#7d7970', { metalness: .4, roughness: .4 }))
  kettle.position.set(RX + RW / 2 - .4, F0 + 1.09, RZ - 2.9)
  room.add(kettle)
  rb(.04, .25, .04, im('#9a9a9a', { metalness: .6 }), RX + RW / 2 - .62, F0 + 1.08, RZ - 1.8)
  // dining table + chairs
  rb(1.1, .07, 1.1, woodL, RX - 1.8, F0 + .75, RZ - 4.6)
  rb(.12, .72, .12, wood, RX - 1.8, F0 + .37, RZ - 4.6);
  [-.85, .85].forEach(dx => {
    rb(.45, .06, .45, wood, RX - 1.8 + dx, F0 + .46, RZ - 4.6)
    rb(.45, .5, .06, wood, RX - 1.8 + dx * 1.22, F0 + .72, RZ - 4.6).rotation.y = Math.PI / 2;
    [-.18, .18].forEach(a => [-.18, .18].forEach(b => rb(.04, .44, .04, wood, RX - 1.8 + dx + a, F0 + .22, RZ - 4.6 + b)))
  })
  // plant
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .17, .4, 20), im('#bc5540'))
  pot.position.set(RX - 3.2, F0 + .2, RZ - RD + .45)
  room.add(pot)
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(.45, 18, 14), im('#88a95f'))
  leaves.position.set(RX - 3.2, F0 + .85, RZ - RD + .45)
  leaves.scale.set(1, 1.3, 1)
  room.add(leaves)
  // door on back wall (click target)
  rb(1.3, 2.35, .04, im('#3a2a22'), RX - 1.6, F0 + 1.18, RZ - RD + .02)
  rb(1.46, .1, .08, wood, RX - 1.6, F0 + 2.4, RZ - RD + .04)
  const doorPivot = new THREE.Group()
  doorPivot.position.set(RX - 2.25, F0, RZ - RD + .06)
  room.add(doorPivot)
  rb(1.3, 2.3, .07, im('#ae7042'), .65, 1.15, 0, doorPivot)
  rb(.06, .06, .08, im('#efc680', { metalness: .5 }), 1.15, 1.1, .06, doorPivot)
  // Madam Lee (stylised)
  const lee = new THREE.Group()
  lee.position.set(RX + .35, F0, RZ - 3.3)
  lee.rotation.y = Math.atan2((hp.x - 2.7) - (RX + .35), (RZ - .6) - (RZ - 3.3))
  lee.scale.setScalar(1.12)
  room.add(lee)
  const dress = new THREE.Mesh(new THREE.CylinderGeometry(.2, .34, .95, 24), im('#6d8b5d'))
  dress.position.y = .55
  lee.add(dress)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.17, .21, .42, 24), im('#e9c7ad'))
  torso.position.y = 1.2
  lee.add(torso)
  const headG = new THREE.Group()
  headG.position.y = 1.55
  lee.add(headG)
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(.15, 24, 18), im('#d9a982')))
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 18, 0, Math.PI * 2, 0, Math.PI / 1.9), im('#cfc8bf'))
  hair.position.set(0, .02, -.01)
  hair.rotation.x = -.35
  headG.add(hair)
  const bun = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), im('#cfc8bf'))
  bun.position.set(0, .08, -.15)
  headG.add(bun);
  [-1, 1].forEach(sd => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .45, 12), im('#e9c7ad'))
    arm.position.set(sd * .2, 1.12, .12)
    arm.rotation.x = -.9
    lee.add(arm)
  })
  room.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = false; o.receiveShadow = false } })
  THREE.ColorManagement.enabled = colorManagement

  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(62, 44, 92), new THREE.Vector3(38, 26, 62), new THREE.Vector3(hp.x + 4, hp.y + 5, 30), new THREE.Vector3(hp.x, hp.y + .3, hp.z + 6),
  ], false, 'centripetal')
  const look0 = new THREE.Vector3(0, 8, 0), look1 = hp.clone()
  const inPos = new THREE.Vector3(RX - 2.7, F0 + 1.75, RZ - .6), inLook = new THREE.Vector3(RX + .05, F0 + 1.15, RZ - 3.45)
  const outPos = path.getPoint(1)
  const ray = new THREE.Raycaster()
  let sp = 0, doorAngle = 0, raf = 0

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    if (mode === 'presentation') camera.setViewOffset(w, h, -w * .28, 0, w, h)
    camera.updateProjectionMatrix()
  }
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  const band = (p: number, a: number, b: number, c: number, d: number) => p < a || p > d ? 0 : p < b ? (p - a) / (b - a) : p <= c ? 1 : (d - p) / (d - c)
  const setLayer = (el: HTMLElement, o: number, y = 0) => {
    el.style.opacity = String(o)
    el.style.transform = `translateY(${y}px)`
  }
  const look = new THREE.Vector3()
  const tick = (time: number) => {
    raf = requestAnimationFrame(tick)
    const r = track?.getBoundingClientRect()
    if (r && r.bottom < 0) return
    const target = mode === 'presentation' ? .16 : clamp(-r!.top / Math.max(1, r!.height - (window.innerHeight - HEADER_HEIGHT)))
    sp += (target - sp) * .06
    if (Math.abs(target - sp) < .0005) sp = target
    const p = sp
    const t = ease(clamp(p / .6)), t2 = ease(clamp((p - .6) / .2))
    camera.position.copy(path.getPoint(t))
    camera.position.x += (1 - t) * Math.sin(time / 2600) * 1.5
    look.lerpVectors(look0, look1, ease(clamp((p - .04) / .56)))
    if (t2 > 0) {
      camera.position.lerpVectors(outPos, inPos, t2)
      look.lerp(inLook, t2)
    }
    camera.lookAt(look)
    const inside = camera.position.z < hp.z + .9
    if (heroGlass && heroFrame) {
      heroGlass.visible = heroFrame.visible = !inside
      const gm = heroGlass.material
      gm.color.copy(state.lightOn ? glassOn : glassOff)
      gm.emissiveIntensity = state.lightOn ? .55 + .35 * (.5 + .5 * Math.sin(time / 600)) * clamp((p - .4) / .2) : 0
    }
    lampLight.intensity += ((state.lightOn ? 1.3 : .08) * POINT - lampLight.intensity) * .15
    shadeM.emissiveIntensity = state.lightOn ? .9 : 0
    doorAngle += ((state.doorOpen ? -1.35 : 0) - doorAngle) * .12
    doorPivot.rotation.y = doorAngle
    torso.rotation.y = Math.sin(time / 1400) * .06
    headG.rotation.y = Math.sin(time / 2100) * .25
    lee.position.y = F0 + Math.sin(time / 900) * .008
    if (intro && cap1 && cap2 && hero) {
      setLayer(intro, 1 - clamp(p / .12), -p * 200)
      setLayer(cap1, band(p, .1, .18, .3, .38), (1 - band(p, .1, .18, .3, .38)) * 16)
      setLayer(cap2, band(p, .38, .46, .56, .64), (1 - band(p, .38, .46, .56, .64)) * 16)
      const hv = clamp((p - .8) / .12)
      setLayer(hero, hv, (1 - hv) * 24)
    }
    renderer.render(scene, camera)
  }

  const pick = (e: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    if (ray.intersectObject(lamp, true).length) return 'light'
    if (ray.intersectObject(doorPivot, true).length) return 'door'
    return null
  }
  const onClick = (e: MouseEvent) => {
    const k = pick(e)
    if (k === 'light') state.lightOn = !state.lightOn
    if (k === 'door') state.doorOpen = !state.doorOpen
    if (powerLabel) powerLabel.textContent = state.lightOn ? '1.8 kW' : '0.15 kW'
    if (doorLabel) doorLabel.textContent = state.doorOpen ? 'open' : 'closed'
  }
  const onHover = (e: PointerEvent) => { canvas.style.cursor = pick(e) ? 'pointer' : 'default' }

  resize()
  window.addEventListener('resize', resize)
  canvas.addEventListener('click', onClick)
  canvas.addEventListener('pointermove', onHover)
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.removeEventListener('click', onClick)
    canvas.removeEventListener('pointermove', onHover)
    scene.traverse(o => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      ;(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose())
    })
    renderer.dispose()
  }
}
