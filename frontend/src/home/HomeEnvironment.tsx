import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl, ContactShadows, OrthographicCamera } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFShadowMap, PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { Architecture } from './Architecture'
import { Bedroom } from './rooms/Bedroom'
import { Bathroom } from './rooms/Bathroom'
import { Kitchen } from './rooms/Kitchen'
import { LivingRoom } from './rooms/LivingRoom'
import { DiningArea } from './rooms/DiningArea'
import { ElderlyCharacter, type CharacterCommand, type CharacterStatus } from './character/ElderlyCharacter'
import { ROOM_LABELS, type RoomId } from './character/navigation'
import './home.css'

type Command = { action: 'reset' | 'in' | 'out' | 'left' | 'right' | 'plan'; id: number }
const HOME_CAMERA = [8.8, 17, 22] as const
const HOME_TARGET = [0, .25, -.55] as const

/** One world unit = one metre. +Y is up; -Z is the rear of the home. */
export function HouseModel() {
  return <group name="unit-a105">
    <Architecture /><Bedroom /><Bathroom /><Kitchen /><LivingRoom /><DiningArea />
  </group>
}
function Scene({ command, characterCommand, onCharacterStatus, onReady }: { command: Command; characterCommand: CharacterCommand; onCharacterStatus: (status: CharacterStatus) => void; onReady: () => void }) {
  const controls = useRef<CameraControls>(null)
  const size = useThree(state => state.size)
  const getRoot = useThree(state => state.get)
  useEffect(() => {
    const { gl, scene, invalidate } = getRoot()
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = generator.fromScene(room, .04)
    scene.environment = target.texture
    scene.environmentIntensity = .35
    invalidate()
    room.dispose()
    generator.dispose()
    return () => { scene.environment = null; target.dispose() }
  }, [getRoot])
  const baseZoom = Math.min(size.width / 16.8, size.height / 12.7)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    const camera = controls.current
    if (!camera) return
    void camera.setLookAt(...HOME_CAMERA, ...HOME_TARGET, false)
    void camera.zoomTo(baseZoom, false)
    onReady()
  }, [baseZoom, onReady])
  useEffect(() => {
    const camera = controls.current
    if (!camera || command.id === 0) return
    const smooth = !reduceMotion
    switch (command.action) {
      case 'reset':
        void camera.setLookAt(...HOME_CAMERA, ...HOME_TARGET, smooth)
        void camera.zoomTo(baseZoom, smooth)
        break
      case 'plan':
        void camera.setLookAt(0, 28, .21, ...HOME_TARGET, smooth)
        void camera.zoomTo(baseZoom * 1.05, smooth)
        break
      case 'in': void camera.zoom(camera.camera.zoom * .22, smooth); break
      case 'out': void camera.zoom(-camera.camera.zoom * .18, smooth); break
      case 'left': void camera.rotate(-Math.PI / 8, 0, smooth); break
      case 'right': void camera.rotate(Math.PI / 8, 0, smooth); break
    }
  }, [command, baseZoom, reduceMotion])
  return <>
    <OrthographicCamera makeDefault position={[...HOME_CAMERA]} zoom={baseZoom} near={.1} far={120} />
    <CameraControls ref={controls} makeDefault minPolarAngle={.025} maxPolarAngle={Math.PI / 2.75}
      minZoom={baseZoom * .7} maxZoom={baseZoom * 3.5} smoothTime={reduceMotion ? 0 : .22}
      draggingSmoothTime={reduceMotion ? 0 : .12}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.NONE, right: CameraControlsImpl.ACTION.NONE, wheel: CameraControlsImpl.ACTION.ZOOM }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_ZOOM, three: CameraControlsImpl.ACTION.NONE }} />
    <color attach="background" args={['#eeeae1']} />
    <ambientLight intensity={.35} />
    <hemisphereLight args={['#fff4db', '#a8b6a5', .85]} />
    <directionalLight position={[-4, 12, 6]} intensity={2.5} color="#fff1d7" castShadow
      shadow-radius={8} shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9}
      shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={.035} shadow-bias={-.0001} />
    <directionalLight position={[5, 8, -7]} intensity={.8} color="#e8efff" />
    <HouseModel />
    <ElderlyCharacter command={characterCommand} onStatus={onCharacterStatus} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.48, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} /><meshStandardMaterial color="#eeeae1" roughness={1} />
    </mesh>
    <ContactShadows position={[0, -.46, 0]} opacity={.36} scale={25} blur={2.5} far={8} resolution={512} frames={1} />
  </>
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="home-fallback" role="alert"><strong>The 3D view couldn’t start.</strong><p>Enable hardware acceleration in your browser, then reload this page.</p><button onClick={() => window.location.reload()}>Reload view</button></div> : this.props.children
  }
}
const ready = () => { /* Stable callback: resizing must not create a render loop. */ }

/** Self-contained viewer. The parent controls its dimensions; no API or store dependency. */
export function HomeEnvironment({ className = '' }: { className?: string }) {
  const [command, setCommand] = useState<Command>({ action: 'reset', id: 0 })
  const [characterCommand, setCharacterCommand] = useState<CharacterCommand>({ destination: 'reset', id: 0 })
  const [characterStatus, setCharacterStatus] = useState<CharacterStatus>({ room: 'bedroom', destination: null, phase: 'loading' })
  const [view, setView] = useState<'dollhouse' | 'plan'>('dollhouse')
  const send = (action: Command['action']) => {
    if (action === 'reset' || action === 'left' || action === 'right') setView('dollhouse')
    if (action === 'plan') setView('plan')
    setCommand(value => ({ action, id: value.id + 1 }))
  }
  const moveCharacter = (destination: CharacterCommand['destination']) =>
    setCharacterCommand(value => ({ destination, id: value.id + 1 }))
  return <section className={`home-environment ${className}`} aria-label="Interactive furnished 3D home">
    <div className="home-scene-body">
    <div className="home-canvas" tabIndex={0} aria-label="3D home. Drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom; Home resets the camera."
      onKeyDown={event => {
        const action = ({ ArrowLeft: 'left', ArrowRight: 'right', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' } as Record<string, Command['action']>)[event.key]
        if (action) { event.preventDefault(); send(action) }
      }}>
      <SceneBoundary><Canvas shadows={{ type: PCFShadowMap }} frameloop="demand" dpr={[1, 1.7]} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}
        fallback={<div className="home-fallback">This home needs a browser with WebGL enabled.</div>}>
        <Suspense fallback={null}><Scene command={command} characterCommand={characterCommand} onCharacterStatus={setCharacterStatus} onReady={ready} /></Suspense>
      </Canvas></SceneBoundary>
    </div>
    <div className="home-view-switch" aria-label="Camera views">
      <button aria-pressed={view === 'dollhouse'} className={view === 'dollhouse' ? 'selected' : ''} onClick={() => send('reset')}><span aria-hidden="true">◇</span> Dollhouse</button>
      <button aria-pressed={view === 'plan'} className={view === 'plan' ? 'selected' : ''} onClick={() => send('plan')}><span aria-hidden="true">⊞</span> Top view</button>
    </div>
    <div className="home-camera-tools" aria-label="Camera controls">
      <button onClick={() => send('in')} aria-label="Zoom in" title="Zoom in">+</button>
      <button onClick={() => send('out')} aria-label="Zoom out" title="Zoom out">−</button>
      <span />
      <button onClick={() => send('left')} aria-label="Rotate left" title="Rotate left">↶</button>
      <button onClick={() => send('right')} aria-label="Rotate right" title="Rotate right">↷</button>
    </div>
    <div className="home-camera-bottom">
      <p><span aria-hidden="true">⤧</span> Drag to explore <i /> Scroll to zoom</p>
      <button className="home-reset" onClick={() => send('reset')}><span aria-hidden="true">↺</span> Reset camera</button>
    </div>
    </div>
    <div className="character-panel" aria-label="Character movement test controls" data-character-state={characterStatus.phase}>
      <div className="character-panel-heading"><span className="character-avatar" aria-hidden="true">ML</span><div><strong>Madam Lee Mei Ling</strong><span role="status">{characterStatus.phase === 'loading' ? 'Loading character…' : characterStatus.phase === 'error' ? 'Character could not load' : characterStatus.destination ? `Walking to ${ROOM_LABELS[characterStatus.destination]}` : `At ${ROOM_LABELS[characterStatus.room] ?? 'home'}`}</span></div></div>
      <div className="character-moves">
        {(Object.keys(ROOM_LABELS) as RoomId[]).map(room => <button key={room} onClick={() => moveCharacter(room)} disabled={characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>Go to {ROOM_LABELS[room]}</button>)}
        <button className="character-reset" onClick={() => moveCharacter('reset')} disabled={characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>Reset Character</button>
      </div>
    </div>
  </section>
}
