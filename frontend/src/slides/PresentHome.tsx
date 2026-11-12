import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { ACESFilmicToneMapping, OrthographicCamera, PCFShadowMap, PMREMGenerator, Vector3 } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { HouseModel } from '../home/HomeEnvironment'
import { ElderlyCharacter, type CharacterAnimation, type CharacterCommand, type CharacterStatus } from '../home/character/ElderlyCharacter'
import type { Waypoint } from '../home/character/navigation'

type V3 = [number, number, number]
type FallPhase = 'falling' | 'down' | 'rising' | 'up'
// Same camera as the simulator's home view, so the slide shows the home people will see in the demo.
const CAMERA: V3 = [8.8, 17, 22]
const TARGET: V3 = [0, .25, -.55]

// The rooms she wanders between, and how long she lingers in each before moving on.
const ROOMS: Waypoint[] = ['living', 'dining', 'kitchen', 'bathroom', 'bedroom', 'bedside', 'tvApproach']
const LINGER_MS: [number, number] = [2500, 6000]
const CHARACTER_NAME = 'madam-lee-mei-ling'
const BODY_BONE = 'Bip01_Spine' // middle of her body, where the pin points once she is lying on the floor
const noop = () => { /* stable: this slide ignores these character callbacks */ }

function Rig({ pin }: { pin: RefObject<HTMLSpanElement | null> }) {
  const camera = useThree(state => state.camera) as OrthographicCamera
  const size = useThree(state => state.size)
  const getRoot = useThree(state => state.get)
  const head = useRef(new Vector3())
  const aim = useRef(new Vector3())
  const shown = useRef(new Vector3())
  const placed = useRef(false)
  const gliding = useRef(false)
  const previousMode = useRef<string | undefined>(undefined)

  useEffect(() => {
    const { gl, scene, invalidate } = getRoot()
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = generator.fromScene(room, .04)
    scene.environment = target.texture
    scene.environmentIntensity = .35
    room.dispose()
    generator.dispose()
    invalidate()
    return () => { scene.environment = null; target.dispose() }
  }, [getRoot])

  useEffect(() => {
    camera.position.set(...CAMERA)
    camera.lookAt(...TARGET)
    camera.zoom = Math.min(size.width / 15.2, size.height / 12.2)
    camera.updateProjectionMatrix()
    getRoot().invalidate()
  }, [camera, size, getRoot])

  // Keeps the DOM name pin over her head as she walks. While she falls or gets up it holds still rather than chase
  // her body mid-motion; once she has settled it glides over to her (her body on the floor, or her head again).
  useFrame(({ scene }, delta) => {
    const her = scene.getObjectByName(CHARACTER_NAME)
    const mode = pin.current?.dataset.mode
    if (!her || !pin.current || mode === 'hold') return
    const body = mode === 'lying' ? her.getObjectByName(BODY_BONE) : null
    ;(body ?? her).getWorldPosition(aim.current)
    aim.current.y += body ? .75 : 2
    if (!placed.current || shown.current.distanceTo(aim.current) < .01) { shown.current.copy(aim.current); placed.current = true; gliding.current = false }
    else if (gliding.current || mode !== previousMode.current) {
      gliding.current = true
      shown.current.lerp(aim.current, 1 - Math.exp(-6 * Math.min(delta, .05)))
    } else shown.current.copy(aim.current)
    previousMode.current = mode
    head.current.copy(shown.current).project(camera)
    // Percentages, so the pin stays over her head whatever zoom the slide is shown at.
    pin.current.style.left = `${(head.current.x + 1) / 2 * 100}%`
    pin.current.style.top = `${(1 - head.current.y) / 2 * 100}%`
  })
  return null
}

// Walks her to a random room, lingers a few seconds, then picks another; stops while the slide is off screen.
function Resident({ paused, onFall }: { paused: boolean; onFall: (phase: FallPhase) => void }) {
  const [command, setCommand] = useState<CharacterCommand>({ destination: 'reset', id: 0 })
  const current = useRef<Waypoint>('bedroom')
  const started = useRef(false)
  const timer = useRef(0)

  const wander = useCallback(() => {
    const options = ROOMS.filter(room => room !== current.current)
    const next = options[Math.floor(Math.random() * options.length)]
    current.current = next
    setCommand(previous => ({ destination: next, id: previous.id + 1, kind: 'move' }))
  }, [])
  const linger = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(wander, LINGER_MS[0] + Math.random() * (LINGER_MS[1] - LINGER_MS[0]))
  }, [wander])
  const onStatus = useCallback((status: CharacterStatus) => {
    if (started.current || status.phase !== 'idle') return
    started.current = true
    linger()
  }, [linger])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Presenter keys while this slide is on screen: F makes her collapse where she stands, W gets her back up.
  // The same collapse and recover animations as the simulator's fall scenario.
  const fallen = useRef(false)
  const busy = useRef(false)
  useEffect(() => {
    if (paused) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || !started.current || busy.current) return
      if ((event.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return
      const key = event.key.toLowerCase()
      const animation = key === 'f' && !fallen.current ? 'collapse' : key === 'w' && fallen.current ? 'recover' : null
      if (!animation) return
      event.preventDefault()
      window.clearTimeout(timer.current)
      fallen.current = animation === 'collapse'
      busy.current = true
      onFall(fallen.current ? 'falling' : 'rising')
      setCommand(previous => ({ destination: animation, id: previous.id + 1, kind: 'animate' }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paused, onFall])
  const onAnimationComplete = useCallback((_id: number, animation: CharacterAnimation) => {
    busy.current = false
    if (animation === 'collapse') onFall('down')
    if (animation === 'recover') { onFall('up'); linger() } // back on her feet, she carries on with her day
  }, [linger, onFall])
  // An arrival that lands after she has fallen must not send her wandering off the floor.
  const onArrived = useCallback(() => { if (!fallen.current) linger() }, [linger])

  return <ElderlyCharacter command={command} pose="none" speech={null} visible paused={paused} urgent={false}
    onStatus={onStatus} onReached={noop} onArrived={onArrived} onAnimationComplete={onAnimationComplete} />
}

/** Draws a fresh frame just before printing and reads it back. Without the read, Chrome can print this WebGL canvas blank when its size doesn't change between screen and print. */
function PrintFrame() {
  const get = useThree(state => state.get)
  useEffect(() => {
    const draw = () => { const { gl, scene, camera } = get(); gl.render(scene, camera); gl.domElement.toDataURL() }
    window.addEventListener('beforeprint', draw)
    return () => window.removeEventListener('beforeprint', draw)
  }, [get])
  return null
}

function Scene({ pin, paused, onFall }: { pin: RefObject<HTMLSpanElement | null>; paused: boolean; onFall: (phase: FallPhase) => void }) {
  return <>
    <PrintFrame />
    <Rig pin={pin} />
    <ambientLight intensity={.35} />
    <hemisphereLight args={['#fff4db', '#d8c5ad', .85]} />
    <directionalLight position={[-4, 12, 6]} intensity={2.5} color="#fff1d7" castShadow
      shadow-radius={8} shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9}
      shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={.035} shadow-bias={-.0001} />
    <directionalLight position={[5, 8, -7]} intensity={.8} color="#e8efff" />
    <HouseModel />
    <Resident paused={paused} onFall={onFall} />
    {/* Catches the sun's shadow on the page itself, so the home sits on the slide rather than on a grey floor. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.48, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} /><shadowMaterial opacity={.14} />
    </mesh>
    <ContactShadows position={[0, -.46, 0]} opacity={.32} scale={25} blur={2.5} far={8} resolution={512} frames={1} color="#58473b" />
  </>
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

/** The simulator's 3D home for the opening slide: a fixed view, no controls, Madam Lee wandering alone between rooms. */
export function PresentHome() {
  const pin = useRef<HTMLSpanElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const el = wrap.current
    if (!el || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // Something has gone wrong: the whole slide dims, leaving only her name pin lit. The pin holds still while she is in motion.
  const onFall = useCallback((phase: FallPhase) => {
    if (phase === 'falling' || phase === 'rising') wrap.current?.closest('.present-home')?.classList.toggle('is-fallen', phase === 'falling')
    if (pin.current) pin.current.dataset.mode = phase === 'down' ? 'lying' : phase === 'up' ? 'standing' : 'hold'
  }, [])
  return <div ref={wrap} className="present-home-canvas" aria-hidden="true">
    <SceneBoundary>
      <Canvas shadows={{ type: PCFShadowMap }} orthographic frameloop="demand" dpr={[1, 2]}
        camera={{ position: CAMERA, near: .1, far: 120, zoom: 40 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}>
        <Suspense fallback={null}><Scene pin={pin} paused={!onScreen} onFall={onFall} /></Suspense>
      </Canvas>
    </SceneBoundary>
    <span ref={pin} className="present-home-pin">Madam Lee</span>
  </div>
}
