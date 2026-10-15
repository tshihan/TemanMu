import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
import { ElderlyCharacter, type CharacterAnimation, type CharacterCommand, type CharacterStatus, type InteractionPose } from './character/ElderlyCharacter'
import { ROOM_LABELS, type RoomId, type Waypoint } from './character/navigation'
import { INITIAL_OBJECT_STATES, INTERACTIONS, interactionPrompt, type InteractionBindings, type InteractionId, type ObjectStates } from './interactions/registry'
import { ScenarioController, type ScenarioActions } from './scenarios/ScenarioController'
import { DEFAULT_TIMING, SCENARIO_LABELS, scenarioSteps, type ScenarioId, type ScenarioStep, type ScenarioTiming } from './scenarios/definitions'
import './home.css'

type Command = { action: 'reset' | 'in' | 'out' | 'left' | 'right' | 'plan'; id: number }
const HOME_CAMERA = [8.8, 17, 22] as const
const HOME_TARGET = [0, .25, -.55] as const

/** One world unit = one metre. +Y is up; -Z is the rear of the home. */
export function HouseModel({ interaction }: { interaction?: InteractionBindings } = {}) {
  return <group name="unit-a105">
    <Architecture interaction={interaction} /><Bedroom /><Bathroom interaction={interaction} /><Kitchen interaction={interaction} /><LivingRoom interaction={interaction} /><DiningArea />
  </group>
}
function Scene({ command, characterCommand, interaction, pose, speech, visible, paused, onCharacterStatus, onReached, onArrived, onAnimationComplete, onReady }: {
  command: Command; characterCommand: CharacterCommand; interaction: InteractionBindings; pose: InteractionPose; speech: boolean; visible: boolean; paused: boolean
  onCharacterStatus: (status: CharacterStatus) => void; onReached: (id: number, target: InteractionId) => void
  onArrived: (id: number, target: Waypoint) => void; onAnimationComplete: (id: number, animation: CharacterAnimation) => void; onReady: () => void
}) {
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
    <HouseModel interaction={interaction} />
    <ElderlyCharacter command={characterCommand} pose={pose} speech={speech} visible={visible} paused={paused}
      onStatus={onCharacterStatus} onReached={onReached} onArrived={onArrived} onAnimationComplete={onAnimationComplete} />
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
  const [states, setStates] = useState<ObjectStates>(INITIAL_OBJECT_STATES)
  const [selected, setSelected] = useState<InteractionId | null>(null)
  const [hovered, setHovered] = useState<InteractionId | null>(null)
  const [pose, setPose] = useState<InteractionPose>('none')
  const [speech, setSpeech] = useState(false)
  const [visible, setVisible] = useState(true)
  const [paused, setPaused] = useState(false)
  const [scenario, setScenario] = useState<ScenarioId | null>(null)
  const [scenarioState, setScenarioState] = useState<'idle' | 'running' | 'paused' | 'complete' | 'stopped'>('idle')
  const [scenarioProgress, setScenarioProgress] = useState<{ index: number; total: number; label: string } | null>(null)
  const [timing, setTiming] = useState<ScenarioTiming>(DEFAULT_TIMING)
  const active = useRef<{ id: number; target: InteractionId; aborter: AbortController } | null>(null)
  const characterSequence = useRef(0)
  const pending = useRef(new Map<number, { resolve: () => void; reject: (reason: Error) => void }>())
  const runner = useRef<ScenarioController | null>(null)
  const clock = useRef(new ScenarioController())
  const scenarioActive = scenarioState === 'running' || scenarioState === 'paused'
  const cancelSequence = () => {
    active.current?.aborter.abort()
    if (active.current?.target === 'telephone') setStates(value => ({ ...value, telephone: 'idle' }))
    active.current = null
    setSelected(null)
    setPose('none')
    setSpeech(false)
  }
  useEffect(() => () => {
    runner.current?.stop()
    active.current?.aborter.abort()
    pending.current.forEach(item => item.reject(new DOMException('Viewer unmounted', 'AbortError')))
    pending.current.clear()
  }, [])
  const nextCharacterCommand = (destination: CharacterCommand['destination'], approach?: Waypoint, kind?: CharacterCommand['kind']) => {
    const id = ++characterSequence.current
    setCharacterCommand({ destination, id, approach, kind })
    return id
  }
  const waitForCharacter = (id: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Action cancelled', 'AbortError')); return }
    const cleanup = () => { pending.current.delete(id); signal.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); reject(new DOMException('Action cancelled', 'AbortError')) }
    pending.current.set(id, { resolve: () => { cleanup(); resolve() }, reject: error => { cleanup(); reject(error) } })
    signal.addEventListener('abort', abort, { once: true })
  })
  const finishCharacterCommand = useCallback((id: number) => {
    pending.current.get(id)?.resolve()
  }, [])
  const onReached = useCallback((id: number, target: InteractionId) => {
    if (active.current?.id !== id || active.current.target !== target) return
    setPose('reach')
    finishCharacterCommand(id)
  }, [finishCharacterCommand])
  const onArrived = useCallback((id: number) => finishCharacterCommand(id), [finishCharacterCommand])
  const onAnimationComplete = useCallback((id: number) => finishCharacterCommand(id), [finishCharacterCommand])
  const moveTo = (to: Waypoint, signal: AbortSignal) => {
    const id = nextCharacterCommand(to, undefined, 'move')
    return waitForCharacter(id, signal)
  }
  const playAnimation = (animation: CharacterAnimation, signal: AbortSignal) => {
    const id = nextCharacterCommand(animation, undefined, 'animate')
    return waitForCharacter(id, signal)
  }
  const interactWith = async (target: InteractionId, incomingCall = false, approach?: Waypoint, externalSignal?: AbortSignal) => {
    if (active.current?.target === target) return
    cancelSequence()
    const aborter = new AbortController()
    const abort = () => aborter.abort()
    externalSignal?.addEventListener('abort', abort, { once: true })
    if (externalSignal?.aborted) aborter.abort()
    if (aborter.signal.aborted) throw new DOMException('Action cancelled', 'AbortError')
    setHovered(null)
    setSelected(target)
    if (target === 'telephone') setStates(value => ({ ...value, telephone: incomingCall ? 'ringing' : 'idle' }))
    const id = nextCharacterCommand(target, approach, 'interact')
    active.current = { id, target, aborter }
    const actionClock = clock.current
    try {
      await waitForCharacter(id, aborter.signal)
      await actionClock.wait(.65, aborter.signal)
      if (target === 'telephone') {
        setStates(value => ({ ...value, telephone: 'answering' }))
        setPose('phone')
        setSpeech(true)
        await actionClock.wait(3.55, aborter.signal)
        setStates(value => ({ ...value, telephone: 'finished' }))
        setPose('none')
        setSpeech(false)
        await actionClock.wait(.7, aborter.signal)
        setStates(value => ({ ...value, telephone: 'idle' }))
      } else {
        setStates(value => ({ ...value, [target]: !value[target] }))
        await actionClock.wait(.8, aborter.signal)
      }
      if (active.current?.id === id) {
        setSelected(null)
        active.current = null
        setPose('none')
        setCharacterStatus(value => ({ ...value, phase: 'idle' }))
      }
    } finally {
      externalSignal?.removeEventListener('abort', abort)
      if (active.current?.id === id) cancelSequence()
    }
  }
  const manualInteract = (target: InteractionId, incomingCall = false) => {
    if (scenarioActive || characterStatus.phase === 'loading' || characterStatus.phase === 'error') return
    void interactWith(target, incomingCall).catch(() => { /* Superseded by another manual action. */ })
  }
  const interaction: InteractionBindings = { states, selected, hovered, paused, disabled: scenarioActive,
    onSelect: id => manualInteract(id), onHover: setHovered }
  const resetObjects = () => {
    cancelSequence()
    setHovered(null)
    setStates(INITIAL_OBJECT_STATES)
  }
  const setObject = (target: InteractionId, value: boolean) => {
    if (target === 'telephone') setStates(current => ({ ...current, telephone: value ? 'ringing' : 'idle' }))
    else setStates(current => ({ ...current, [target]: value }))
  }
  const startScenario = (id: ScenarioId) => {
    if (scenarioActive || characterStatus.phase === 'loading' || characterStatus.phase === 'error') return
    resetObjects()
    setVisible(true)
    setPaused(false)
    const steps = scenarioSteps(id, timing)
    const controller = new ScenarioController()
    runner.current = controller
    clock.current = controller
    setScenario(id)
    setScenarioState('running')
    setScenarioProgress(null)
    const actions: ScenarioActions = {
      moveTo, playAnimation,
      interactWith: (object, approach, signal) => interactWith(object, false, approach, signal),
      setCharacterVisible: setVisible,
      setObject,
    }
    void controller.play(steps, actions, (index: number, step: ScenarioStep) =>
      setScenarioProgress({ index: index + 1, total: steps.length, label: step.label }))
      .then(() => {
        if (runner.current !== controller) return
        runner.current = null
        clock.current = new ScenarioController()
        setScenarioState('complete')
      }).catch(error => {
        if (runner.current !== controller) return
        console.error('Scenario playback stopped unexpectedly', error)
        runner.current = null
        clock.current = new ScenarioController()
        resetObjects()
        setVisible(true)
        nextCharacterCommand('reset')
        setScenarioState('stopped')
      })
  }
  const pauseScenario = () => {
    if (!runner.current || scenarioState !== 'running') return
    runner.current.pause()
    setPaused(true)
    setScenarioState('paused')
  }
  const resumeScenario = () => {
    if (!runner.current || scenarioState !== 'paused') return
    runner.current.resume()
    setPaused(false)
    setScenarioState('running')
  }
  const stopScenario = (clearProgress = false) => {
    runner.current?.stop()
    runner.current = null
    clock.current = new ScenarioController()
    resetObjects()
    pending.current.forEach(item => item.reject(new DOMException('Scenario stopped', 'AbortError')))
    pending.current.clear()
    setPaused(false)
    setVisible(true)
    setPose('none')
    nextCharacterCommand('reset')
    if (clearProgress) { setScenario(null); setScenarioProgress(null); setScenarioState('idle') }
    else setScenarioState('stopped')
  }
  const send = (action: Command['action']) => {
    if (action === 'reset' || action === 'left' || action === 'right') setView('dollhouse')
    if (action === 'plan') setView('plan')
    setCommand(value => ({ action, id: value.id + 1 }))
  }
  const moveCharacter = (destination: CharacterCommand['destination']) => {
    if (scenarioActive) return
    cancelSequence()
    nextCharacterCommand(destination, undefined, 'move')
  }
  const resetInteractions = () => {
    if (scenarioActive) return
    resetObjects()
    if (characterStatus.phase !== 'loading' && characterStatus.phase !== 'error') nextCharacterCommand('stop')
  }
  return <section className={`home-environment ${className}`} aria-label="Interactive furnished 3D home">
    <div className="home-scene-body">
    <div className="home-canvas" tabIndex={0} aria-label="3D home. Drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom; Home resets the camera."
      onKeyDown={event => {
        const action = ({ ArrowLeft: 'left', ArrowRight: 'right', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' } as Record<string, Command['action']>)[event.key]
        if (action) { event.preventDefault(); send(action) }
      }}>
      <SceneBoundary><Canvas shadows={{ type: PCFShadowMap }} frameloop="demand" dpr={[1, 1.7]} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}
        fallback={<div className="home-fallback">This home needs a browser with WebGL enabled.</div>}>
        <Suspense fallback={null}><Scene command={command} characterCommand={characterCommand} interaction={interaction} pose={pose} speech={speech} visible={visible} paused={paused}
          onCharacterStatus={setCharacterStatus} onReached={onReached} onArrived={onArrived} onAnimationComplete={onAnimationComplete} onReady={ready} /></Suspense>
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
    <details className="character-panel" aria-label="Character movement test controls" data-character-state={characterStatus.phase}>
      <summary className="character-panel-heading"><span className="character-avatar" aria-hidden="true">ML</span><span><strong>Madam Lee Mei Ling</strong><span role="status">{characterStatus.phase === 'loading' ? 'Loading character…' : characterStatus.phase === 'error' ? 'Character could not load' : scenarioActive ? scenarioProgress?.label ?? 'Scenario starting' : selected && characterStatus.phase === 'walking' ? `Walking to ${INTERACTIONS[selected].label}` : selected && characterStatus.phase === 'interacting' ? `Using ${INTERACTIONS[selected].label}` : characterStatus.destination ? `Walking to ${ROOM_LABELS[characterStatus.destination as RoomId] ?? 'next point'}` : `At ${ROOM_LABELS[characterStatus.room] ?? 'home'}`}</span></span><span className="character-panel-toggle">Movement controls ▾</span></summary>
      <div className="character-moves">
        {(Object.keys(ROOM_LABELS) as RoomId[]).map(room => <button key={room} onClick={() => moveCharacter(room)} disabled={scenarioActive || characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>Go to {ROOM_LABELS[room]}</button>)}
        <button className="character-reset" onClick={() => moveCharacter('reset')} disabled={scenarioActive || characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>Reset Character</button>
      </div>
    </details>
    <details className="interaction-panel" aria-label="Household interaction development controls">
      <summary className="interaction-panel-heading"><strong>INTERACTION TEST</strong><span>Development controls · local only ▾</span></summary>
      <div className="interaction-actions">
        {(['bathroomTap', 'kitchenKettle', 'mainDoor'] as const).map(id => <button key={id} onClick={() => manualInteract(id)} disabled={scenarioActive || characterStatus.phase === 'loading' || characterStatus.phase === 'error' || selected === id} aria-pressed={states[id]}>{interactionPrompt(id, states)}</button>)}
        <button onClick={() => manualInteract('telephone', true)} disabled={scenarioActive || characterStatus.phase === 'loading' || characterStatus.phase === 'error' || selected === 'telephone'}>Test Incoming Call</button>
        <button className="interaction-reset" onClick={resetInteractions} disabled={scenarioActive}>Reset Interactions</button>
      </div>
      <div className="interaction-states" role="status">
        <span>Tap <b>{states.bathroomTap ? 'ON' : 'OFF'}</b></span><span>Kettle <b>{states.kitchenKettle ? 'ON' : 'OFF'}</b></span><span>Door <b>{states.mainDoor ? 'OPEN' : 'CLOSED'}</b></span><span>Telephone <b>{states.telephone.toUpperCase()}</b></span>
      </div>
    </details>
    <div className="scenario-panel" aria-label="Demo scenarios">
      <div className="scenario-panel-heading"><strong>DEMO SCENARIOS</strong><span>3D playback only · local simulation</span></div>
      <div className="home-scenario-buttons">
        {(Object.keys(SCENARIO_LABELS) as ScenarioId[]).map(id => <button key={id} className={scenario === id ? 'is-current' : ''}
          onClick={() => startScenario(id)} disabled={scenarioActive || characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>{SCENARIO_LABELS[id]}</button>)}
      </div>
      <div className="scenario-transport">
        <button onClick={pauseScenario} disabled={scenarioState !== 'running'}>Pause</button>
        <button onClick={resumeScenario} disabled={scenarioState !== 'paused'}>Resume</button>
        <button onClick={() => stopScenario()} disabled={!scenarioActive}>Stop</button>
        <button onClick={() => stopScenario(true)}>Reset Demo</button>
        <span role="status">{scenario ? `${SCENARIO_LABELS[scenario]} · ${scenarioState}${scenarioProgress ? ` · ${scenarioProgress.label} · Step ${scenarioProgress.index} of ${scenarioProgress.total}` : ''}` : 'Ready to play'}</span>
      </div>
      <details className="scenario-timing"><summary>Timing</summary>
        <label>Outside stay <input type="number" min="1" max="15" value={timing.outsideSeconds} disabled={scenarioActive} onChange={event => setTiming(value => ({ ...value, outsideSeconds: Math.min(15, Math.max(1, Number(event.target.value) || 1)) }))} /> s</label>
        <label>Recovery pause <input type="number" min="1" max="15" value={timing.recoverySeconds} disabled={scenarioActive} onChange={event => setTiming(value => ({ ...value, recoverySeconds: Math.min(15, Math.max(1, Number(event.target.value) || 1)) }))} /> s</label>
      </details>
    </div>
  </section>
}
