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
import { TownshipResponder, type ResponderCommand } from './character/TownshipResponder'
import { ROOM_LABELS, type RoomId, type Waypoint } from './character/navigation'
import { INITIAL_OBJECT_STATES, interactionPrompt, type InteractionBindings, type InteractionId, type ObjectStates } from './interactions/registry'
import { ScenarioController, type ScenarioActions } from './scenarios/ScenarioController'
import { DEFAULT_TIMING, SCENARIO_CALL_TIMING, SCENARIO_DESCRIPTIONS, SCENARIO_LABELS, scenarioSteps, type ScenarioId, type ScenarioStep, type ScenarioTiming } from './scenarios/definitions'
import { api, usingMock } from '../api'
import { ApiError } from '../api/live'
import { primeSharedMockInactivity } from '../mocks/shared-client'
import { applyEvent, getAppState, subscribeAppEvents, useAppState } from '../api/store'
import type { CallTiming, CompanionMessage, Config, Incident, Reading, Sensor, Unit } from '../api/types'
import { HOME_UNIT_ID, SensorGateway, readingForObject } from './integration/sensorGateway'
import seed from '../../../shared/seed.json'
import { SensorBeacons, type SensorPulses } from './SensorBeacons'
import { FastForward, Pause, Play, RotateCcw, Settings2, Square, Volume2, VolumeX, X } from 'lucide-react'
import { HomeSoundscape } from './soundscape'
import './home.css'

type Command = { action: 'reset' | 'in' | 'out' | 'left' | 'right'; id: number }
const HOME_CAMERA = [8.8, 17, 22] as const
const HOME_TARGET = [0, .25, -.55] as const

/** One world unit = one metre. +Y is up; -Z is the rear of the home. */
export function HouseModel({ interaction }: { interaction?: InteractionBindings } = {}) {
  return <group name="unit-a105">
    <Architecture interaction={interaction} /><Bedroom interaction={interaction} /><Bathroom interaction={interaction} /><Kitchen interaction={interaction} /><LivingRoom interaction={interaction} /><DiningArea />
  </group>
}
function Scene({ command, characterCommand, responderCommand, responderVisible, responderChecking, interaction, pose, speech, visible, paused, urgent, sensorView, unit, pulses, onCharacterStatus, onReached, onArrived, onResponderArrived, onAnimationComplete, onReady }: {
  sensorView: boolean; unit: Unit | null; pulses: SensorPulses
  command: Command; characterCommand: CharacterCommand; responderCommand: ResponderCommand; responderVisible: boolean; responderChecking: boolean
  interaction: InteractionBindings; pose: InteractionPose; speech: string | null; visible: boolean; paused: boolean; urgent: boolean
  onCharacterStatus: (status: CharacterStatus) => void; onReached: (id: number, target: InteractionId) => void
  onArrived: (id: number, target: Waypoint) => void; onResponderArrived: (id: number) => void
  onAnimationComplete: (id: number, animation: CharacterAnimation) => void; onReady: () => void
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
    invalidate()
    room.dispose()
    generator.dispose()
    return () => { scene.environment = null; target.dispose() }
  }, [getRoot])
  useEffect(() => {
    const { scene, invalidate } = getRoot()
    scene.environmentIntensity = sensorView ? .12 : .35
    invalidate()
  }, [getRoot, sensorView])
  // Sensor view dims the home so only the three metered objects read clearly.
  const light = sensorView ? .38 : 1
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
    <ambientLight intensity={.35 * light} />
    <hemisphereLight args={['#fff4db', '#a8b6a5', .85 * light]} />
    <directionalLight position={[-4, 12, 6]} intensity={2.5 * light} color="#fff1d7" castShadow
      shadow-radius={8} shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9}
      shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={.035} shadow-bias={-.0001} />
    <directionalLight position={[5, 8, -7]} intensity={.8 * light} color="#e8efff" />
    <HouseModel interaction={interaction} />
    <ElderlyCharacter command={characterCommand} pose={pose} speech={sensorView ? null : speech} visible={visible && !sensorView} paused={paused} urgent={urgent} phoneSpot={interaction.phoneSpot}
      onStatus={onCharacterStatus} onReached={onReached} onArrived={onArrived} onAnimationComplete={onAnimationComplete} />
    <SensorBeacons unit={unit} pulses={pulses} sensorView={sensorView} />
    <TownshipResponder command={responderCommand} visible={responderVisible && !sensorView} checking={responderChecking} paused={paused} onArrived={onResponderArrived} />
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

const QUIET_GAP_STORY_MINUTES = 4 * 60
/** Mock mode only: seconds of playback to wait for a township click before Guard Ali acknowledges. */
const MOCK_AUTO_ACK_SECONDS = 10

/** Plays the learned 4-hour quiet gap as a fast-forward over the real demo gap (5 seconds for A-105). */
function QuietGapOverlay({ endsAt, seconds }: { endsAt: number; seconds: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 50)
    return () => clearInterval(timer)
  }, [])
  const progress = Math.min(1, Math.max(0, 1 - (endsAt - now) / 1000 / seconds))
  const done = progress >= 1
  const storyTime = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes) % 60).padStart(2, '0')}m`
  return <div className={`live-fast-forward ${done ? 'is-done' : ''}`} role="status" aria-live="polite">
    <span className="live-fast-forward-icon" aria-hidden="true"><FastForward size={20} /></span>
    <div>
      <small>{done ? 'Longer than her usual quiet gap' : 'Fast-forward · water quiet gap'}</small>
      <strong>{storyTime(Math.floor(progress * QUIET_GAP_STORY_MINUTES))} <em>/ {storyTime(QUIET_GAP_STORY_MINUTES)} without water use</em></strong>
      <span className="live-fast-forward-bar"><i style={{ width: `${progress * 100}%` }} /></span>
      <span className="live-fast-forward-note">Her usual quiet gap of 4 hours is learned from her past history</span>
    </div>
  </div>
}

/** Self-contained viewer. The parent controls its dimensions; no API or store dependency. */
export function HomeEnvironment({ className = '' }: { className?: string }) {
  const appState = useAppState()
  const storeUnit = appState.units.find(item => item.unit_id === HOME_UNIT_ID)
  const [fetchedUnit, setFetchedUnit] = useState<Unit | null>(null)
  const [fetchedConfig, setFetchedConfig] = useState<Config | null>(null)
  const [lastReading, setLastReading] = useState<Reading | null>(null)
  const [recentReadings, setRecentReadings] = useState<Reading[]>([])
  const [transmission, setTransmission] = useState<'idle' | 'sending' | 'confirmed' | 'error'>('idle')
  const [integrationError, setIntegrationError] = useState<string | null>(null)
  const [resetBusy, setResetBusy] = useState(false)
  const [queuedCalls, setQueuedCalls] = useState<CompanionMessage[]>([])
  const gateway = useRef(new SensorGateway(api))
  const localStates = useRef<ObjectStates>(INITIAL_OBJECT_STATES)
  const latestUnit = useRef<Unit | null>(null)
  const seenSnapshot = useRef(appState.snapshotRevision > 0)
  const reconnecting = useRef(false)
  const deliveredCalls = useRef(new Set<string>())
  const graceIncident = useRef<string | null>(null)
  const [responseIncidentId, setResponseIncidentId] = useState<string | null>(null)
  const scenarioRef = useRef<ScenarioId | null>(null)
  const [command, setCommand] = useState<Command>({ action: 'reset', id: 0 })
  const [characterCommand, setCharacterCommand] = useState<CharacterCommand>({ destination: 'reset', id: 0 })
  const [responderCommand, setResponderCommand] = useState<ResponderCommand>({ destination: 'reset', id: 0 })
  const [responderVisible, setResponderVisible] = useState(false)
  const [responderChecking, setResponderChecking] = useState(false)
  const [responderDoorOpen, setResponderDoorOpen] = useState(false)
  const [characterStatus, setCharacterStatus] = useState<CharacterStatus>({ room: 'bedroom', destination: null, phase: 'loading' })
  const [states, setStates] = useState<ObjectStates>(INITIAL_OBJECT_STATES)
  const [selected, setSelected] = useState<InteractionId | null>(null)
  const [hovered, setHovered] = useState<InteractionId | null>(null)
  const [pose, setPose] = useState<InteractionPose>('none')
  const [speech, setSpeech] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)
  const [paused, setPaused] = useState(false)
  const [scenario, setScenario] = useState<ScenarioId | null>(null)
  const [scenarioState, setScenarioState] = useState<'idle' | 'running' | 'paused' | 'complete' | 'stopped'>('idle')
  const [scenarioProgress, setScenarioProgress] = useState<{ index: number; total: number; label: string; kind: ScenarioStep['kind'] } | null>(null)
  const [timing, setTiming] = useState<ScenarioTiming>(DEFAULT_TIMING)
  const [picked, setPicked] = useState<ScenarioId>('normalMorning')
  const [callCard, setCallCard] = useState<'ringing' | 'noAnswer' | null>(null)
  const [autoAcknowledged, setAutoAcknowledged] = useState(false)
  const [quietGap, setQuietGap] = useState<{ endsAt: number; seconds: number } | null>(null)
  const [sensorView, setSensorView] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(() => { try { return localStorage.getItem('temanmu.home.sound') !== 'off' } catch { return true } })
  const sound = useRef(new HomeSoundscape())
  const [pulses, setPulses] = useState<SensorPulses>({ water: 0, electricity: 0, door: 0 })
  const pulseTimers = useRef<Partial<Record<Sensor, ReturnType<typeof setTimeout>>>>({})
  const active = useRef<{ id: number; target: InteractionId; aborter: AbortController } | null>(null)
  const characterSequence = useRef(0)
  const responderSequence = useRef(0)
  const pending = useRef(new Map<number, { resolve: () => void; reject: (reason: Error) => void }>())
  const responderPending = useRef(new Map<number, { resolve: () => void; reject: (reason: Error) => void }>())
  const runner = useRef<ScenarioController | null>(null)
  const clock = useRef(new ScenarioController())
  const scenarioActive = scenarioState === 'running' || scenarioState === 'paused'
  const monitoringOn = useRef(false)
  const monitoringQueue = useRef<Promise<void>>(Promise.resolve())
  const homeUnit = fetchedUnit ?? storeUnit ?? null
  const responseIncident = appState.incidents.find(item => item.incident_id === responseIncidentId)
  const showResponder = responderVisible && responseIncident?.state === 'acknowledged'
  const setVisualStates = (next: ObjectStates) => {
    const previous = localStates.current
    localStates.current = next
    sound.current.setLoop('telephone', next.telephone === 'ringing')
    sound.current.setLoop('water', next.bathroomTap || next.shower)
    sound.current.setLoop('kettle', next.kitchenKettle)
    if (previous.mainDoor !== next.mainDoor) sound.current.play(next.mainDoor ? 'doorOpen' : 'doorClose')
    setStates(next)
  }
  useEffect(() => {
    sound.current.setEnabled(soundOn)
    try { localStorage.setItem('temanmu.home.sound', soundOn ? 'on' : 'off') } catch { /* Preference is optional. */ }
  }, [soundOn])
  useEffect(() => {
    sound.current.setLoop('footsteps', characterStatus.phase === 'walking' && visible && !sensorView)
  }, [characterStatus.phase, visible, sensorView])
  const syncUnit = (unit: Unit) => {
    latestUnit.current = unit
    gateway.current.sync(unit)
    setFetchedUnit(unit)
    const current = localStates.current
    const waterActive = unit.latest.water_lpm > 0
    const electricityActive = unit.latest.power_kw > unit.baseline.standby_power_kw
    setVisualStates({ ...current,
      bathroomTap: waterActive && current.bathroomTap,
      shower: waterActive && current.shower,
      kitchenKettle: electricityActive && current.kitchenKettle,
      television: electricityActive && current.television,
      bedroomLamp: electricityActive && current.bedroomLamp,
      mainDoor: unit.latest.door === 'open' })
  }
  const cancelSequence = () => {
    active.current?.aborter.abort()
    if (active.current?.target === 'telephone') setVisualStates({ ...localStates.current, telephone: 'idle' })
    active.current = null
    setSelected(null)
    setPose('none')
    setSpeech(null)
  }
  useEffect(() => () => {
    sound.current.dispose()
    Object.values(pulseTimers.current).forEach(timer => clearTimeout(timer))
    runner.current?.stop()
    active.current?.aborter.abort()
    pending.current.forEach(item => item.reject(new DOMException('Viewer unmounted', 'AbortError')))
    pending.current.clear()
    responderPending.current.forEach(item => item.reject(new DOMException('Viewer unmounted', 'AbortError')))
    responderPending.current.clear()
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
  const onResponderArrived = useCallback((id: number) => responderPending.current.get(id)?.resolve(), [])
  const moveResponder = (to: Waypoint, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Scenario stopped', 'AbortError')); return }
    const id = ++responderSequence.current
    const cleanup = () => { responderPending.current.delete(id); signal.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); reject(new DOMException('Scenario stopped', 'AbortError')) }
    responderPending.current.set(id, { resolve: () => { cleanup(); resolve() }, reject: error => { cleanup(); reject(error) } })
    signal.addEventListener('abort', abort, { once: true })
    setResponderCommand({ id, destination: to })
  })
  const resetResponder = () => {
    responderPending.current.forEach(item => item.reject(new DOMException('Responder reset', 'AbortError')))
    responderPending.current.clear()
    setResponderCommand({ id: ++responderSequence.current, destination: 'reset' })
    setResponderVisible(false)
    setResponderChecking(false)
    setResponderDoorOpen(false)
  }
  const moveTo = (to: Waypoint, signal: AbortSignal) => {
    const id = nextCharacterCommand(to, undefined, 'move')
    return waitForCharacter(id, signal)
  }
  const playAnimation = (animation: CharacterAnimation, signal: AbortSignal) => {
    const id = nextCharacterCommand(animation, undefined, 'animate')
    return waitForCharacter(id, signal)
  }
  const sendObjectState = async (target: Exclude<InteractionId, 'telephone'>, on: boolean) => {
    const unit = latestUnit.current
    if (!unit) throw new Error('A-105 has not loaded from the backend')
    const reading = readingForObject(target, on, unit, localStates.current)
    setTransmission('sending')
    setIntegrationError(null)
    try {
      const confirmed = await gateway.current.sendSensorReading(reading.sensor, reading.value)
      setVisualStates({ ...localStates.current, [target]: on })
      if (confirmed) syncUnit(confirmed)
      setTransmission('confirmed')
      void api.getReadings(HOME_UNIT_ID).then(items => {
        setLastReading(items.at(-1) ?? null)
      }).catch(() => { /* WebSocket reading event may supply the timestamp. */ })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      setTransmission('error')
      setIntegrationError(error instanceof Error ? error.message : 'Reading failed')
      throw error
    }
  }
  const interactWith = async (target: InteractionId, incomingCall = false, approach?: Waypoint, externalSignal?: AbortSignal, desired?: boolean, message?: string) => {
    if (active.current?.target === target) return
    cancelSequence()
    const aborter = new AbortController()
    const abort = () => aborter.abort()
    externalSignal?.addEventListener('abort', abort, { once: true })
    if (externalSignal?.aborted) aborter.abort()
    if (aborter.signal.aborted) throw new DOMException('Action cancelled', 'AbortError')
    setHovered(null)
    setSelected(target)
    if (target === 'telephone') setVisualStates({ ...localStates.current, telephone: incomingCall ? 'ringing' : 'idle' })
    const id = nextCharacterCommand(target, approach, 'interact')
    active.current = { id, target, aborter }
    const actionClock = clock.current
    try {
      await waitForCharacter(id, aborter.signal)
      await actionClock.wait(.65, aborter.signal)
      if (target === 'telephone') {
        setVisualStates({ ...localStates.current, telephone: 'answering' })
        setPose('phone')
        setSpeech(message ?? 'Thinking of you, Mum!')
        await actionClock.wait(3.55, aborter.signal)
        setVisualStates({ ...localStates.current, telephone: 'finished' })
        setPose('none')
        setSpeech(null)
        await actionClock.wait(.7, aborter.signal)
        setVisualStates({ ...localStates.current, telephone: 'idle' })
      } else {
        await sendObjectState(target, desired ?? !localStates.current[target])
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
    if (scenarioActive || resetBusy || characterStatus.phase === 'loading' || characterStatus.phase === 'error' || !homeUnit) return
    void interactWith(target, incomingCall).catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Interaction failed', error) })
  }
  const interaction: InteractionBindings = { states, selected, hovered, paused, responderDoorOpen, disabled: scenarioActive || resetBusy || !homeUnit,
    phoneTag: callCard === 'noAnswer' ? 'Unanswered' : null,
    phoneSpot: (scenario ?? picked) === 'falseAlarmRecovery' ? 'bedside' : 'living',
    onSelect: id => manualInteract(id), onHover: setHovered }
  const resetLocalObjects = () => {
    cancelSequence()
    setHovered(null)
    setVisualStates(INITIAL_OBJECT_STATES)
  }
  const setObject = async (target: InteractionId, value: boolean) => {
    if (target === 'telephone') setVisualStates({ ...localStates.current, telephone: value ? 'ringing' : 'idle' })
    else await sendObjectState(target, value)
  }
  const waitForIncident = (predicate: (incidents: Incident[]) => boolean, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Scenario stopped', 'AbortError')); return }
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let settled = false
    const check = () => {
      const incidents = getAppState().incidents.filter(item => item.unit_id === HOME_UNIT_ID)
      if (settled || !predicate(incidents)) return
      settled = true
      cleanup()
      resolve()
    }
    const abort = () => { if (settled) return; settled = true; cleanup(); reject(new DOMException('Scenario stopped', 'AbortError')) }
    const unsubscribe = subscribeAppEvents(check)
    const cleanup = () => { unsubscribe(); signal.removeEventListener('abort', abort); if (pollTimer) clearInterval(pollTimer) }
    const refresh = async () => {
      if (settled) return
      try {
        const incidents = await api.getUnitIncidents(HOME_UNIT_ID)
        if (settled || signal.aborted || !predicate(incidents)) return
        for (const incident of incidents) {
          const local = getAppState().incidents.find(item => item.incident_id === incident.incident_id)
          if (!local || local.state !== incident.state || local.events.length !== incident.events.length)
            applyEvent({ type: 'incident.updated', at: incident.opened_at, data: incident })
        }
        check()
      } catch (error) {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }
    }
    signal.addEventListener('abort', abort, { once: true })
    if (usingMock) pollTimer = setInterval(() => { void refresh() }, 500)
    check()
  })
  const waitForGrace = async (signal: AbortSignal) => {
    await waitForIncident(items => items.some(item => item.state === 'grace'), signal)
    const incident = getAppState().incidents.find(item => item.unit_id === HOME_UNIT_ID && item.state === 'grace')
    if (!incident) throw new Error('The backend grace state ended before recovery could begin')
    graceIncident.current = incident.incident_id
    setResponseIncidentId(incident.incident_id)
  }
  const waitForQuietGap = async (signal: AbortSignal) => {
    if (signal.aborted) throw new DOMException('Scenario stopped', 'AbortError')
    // The watch starts here, not at play: the walk and fall would otherwise use up the short demo gap.
    const callTiming = scenarioRef.current ? SCENARIO_CALL_TIMING[scenarioRef.current] : undefined
    try { await switchMonitoring(true, callTiming) } catch { throw new Error('Could not start A-105 monitoring on the backend') }
    if (signal.aborted) throw new DOMException('Scenario stopped', 'AbortError')
    const seconds = latestUnit.current?.quiet_gap.usual_max_seconds ?? 5
    const endsAt = Date.now() + seconds * 1000
    setQuietGap({ endsAt, seconds })
    try { await quietGapIncident(endsAt, signal) } finally { setQuietGap(null) }
    setVisualStates({ ...localStates.current, telephone: 'ringing' })
  }
  const quietGapIncident = async (endsAt: number, signal: AbortSignal) => {
    if (usingMock) {
      // Wait out the same gap the backend would, then let the mock raise the incident.
      const remaining = (endsAt - Date.now()) / 1000
      if (remaining > 0) await clock.current.wait(remaining, signal)
      const prior = await api.getUnitIncidents(HOME_UNIT_ID)
      if (prior.some(item => ['grace', 'notified', 'acknowledged'].includes(item.state)))
        throw new Error('A previous A-105 incident is still active. Close it on the dashboard or use Reset Demo before starting this scenario.')
      const previousIds = new Set(prior.map(item => item.incident_id))
      let incident = await primeSharedMockInactivity()
      if (!incident) {
        // A tab left open through a code update can still be attached to the older worker protocol.
        for (let attempt = 0; attempt < 15 && !incident; attempt++) {
          if (signal.aborted) throw new DOMException('Scenario stopped', 'AbortError')
          const current = await api.getUnitIncidents(HOME_UNIT_ID)
          incident = current.find(item => !previousIds.has(item.incident_id) && item.state === 'grace')
          if (!incident) await clock.current.wait(.2, signal)
        }
      }
      if (!incident || incident.unit_id !== HOME_UNIT_ID || incident.state !== 'grace')
        throw new Error('The mock session did not create a new inactivity incident. Close every TemanMu tab, then reopen the app to refresh its SharedWorker.')
      graceIncident.current = incident.incident_id
      setResponseIncidentId(incident.incident_id)
      applyEvent({ type: 'incident.updated', at: incident.opened_at, data: incident })
    } else await waitForGrace(signal)
  }
  const waitForNoAnswer = async (signal: AbortSignal) => {
    const id = graceIncident.current
    if (!id) throw new Error('No backend inactivity incident was observed')
    await waitForIncident(items => items.some(item => item.incident_id === id && item.events.some(event => event.type === 'voice_call_no_answer')), signal)
    setVisualStates({ ...localStates.current, telephone: 'idle' })
  }
  const waitForCaregiverAlert = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    const id = graceIncident.current
    if (!id) { reject(new Error('No backend inactivity incident was observed')); return }
    if (signal.aborted) { reject(new DOMException('Scenario stopped', 'AbortError')); return }
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let settled = false
    const check = () => {
      const notified = getAppState().notifications.some(item => item.incident_id === id && item.role === 'caregiver' && item.kind === 'alert')
      if (settled || !notified) return
      settled = true
      cleanup()
      resolve()
    }
    const abort = () => { if (settled) return; settled = true; cleanup(); reject(new DOMException('Scenario stopped', 'AbortError')) }
    const unsubscribe = subscribeAppEvents(check)
    const cleanup = () => { unsubscribe(); signal.removeEventListener('abort', abort); if (pollTimer) clearInterval(pollTimer) }
    const refresh = async () => {
      if (settled) return
      try {
        const notifications = await api.getNotifications('caregiver')
        if (settled || signal.aborted) return
        const alert = notifications.find(item => item.incident_id === id && item.kind === 'alert')
        if (alert && !getAppState().notifications.some(item => item.notification_id === alert.notification_id))
          applyEvent({ type: 'notification.created', at: alert.created_at, data: alert })
        check()
      } catch (error) {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }
    }
    signal.addEventListener('abort', abort, { once: true })
    if (usingMock) pollTimer = setInterval(() => { void refresh() }, 500)
    check()
  })
  const dispatchResponder = async (signal: AbortSignal) => {
    const id = graceIncident.current
    if (!id) throw new Error('No inactivity incident was observed for the township response')
    const incident = getAppState().incidents.find(item => item.incident_id === id)
    if (incident?.state === 'closed' || incident?.state === 'auto_resolved')
      throw new DOMException('The incident was resolved before the township visit', 'AbortError')
    if (usingMock && incident?.state === 'notified') {
      // Like live mode, wait for a click on the township dashboard. Without a backend nobody else may be
      // watching, so Guard Ali acknowledges after MOCK_AUTO_ACK_SECONDS of playback with no response.
      const waiting = new AbortController()
      const stop = () => waiting.abort()
      signal.addEventListener('abort', stop, { once: true })
      try {
        await Promise.race([
          waitForIncident(items => items.some(item => item.incident_id === id && item.state !== 'notified'), waiting.signal),
          clock.current.wait(MOCK_AUTO_ACK_SECONDS, waiting.signal),
        ])
      } finally {
        waiting.abort()
        signal.removeEventListener('abort', stop)
      }
      if (signal.aborted) throw new DOMException('Scenario stopped', 'AbortError')
      if (getAppState().incidents.find(item => item.incident_id === id)?.state === 'notified') {
        try {
          await api.acknowledgeIncident(id, { role: 'township', name: seed.responders.township })
          setAutoAcknowledged(true)
          setScenarioProgress(progress => progress && { ...progress, label: `No response in ${MOCK_AUTO_ACK_SECONDS} seconds: Guard Ali acknowledged automatically (demo)` })
        } catch (error) {
          // Someone clicked at the same moment; the wait below confirms who took the visit.
          if (!(error instanceof ApiError && error.status === 409)) throw error
        }
      }
    } else if (usingMock && (incident?.state !== 'acknowledged' || incident.acknowledged_by?.role !== 'township'))
      throw new Error('The incident cannot be dispatched to Guard Ali. Reset Demo and try again.')
    await waitForIncident(items => items.some(item => item.incident_id === id && ['acknowledged', 'closed', 'auto_resolved'].includes(item.state)), signal)
    const response = getAppState().incidents.find(item => item.incident_id === id)
    if (response?.state === 'closed' || response?.state === 'auto_resolved')
      throw new DOMException('The incident was resolved before the township visit', 'AbortError')
    if (response?.acknowledged_by?.role !== 'township')
      throw new Error('This incident was not acknowledged by the township, so Guard Ali’s visit will not be reenacted.')
  }
  const waitForResolution = async (signal: AbortSignal) => {
    const id = graceIncident.current
    if (!id) throw new Error('No backend incident was observed')
    await waitForIncident(items => items.some(item => item.incident_id === id && ['auto_resolved', 'notified', 'closed'].includes(item.state)), signal)
    const incident = getAppState().incidents.find(item => item.incident_id === id)
    if (incident?.state !== 'closed' || incident.outcome !== 'resident_ok' || !incident.report?.startsWith('Simulated call:'))
      throw new Error('The backend has not confirmed Resident OK from the simulated call')
    setVisualStates({ ...localStates.current, telephone: 'idle' })
  }
  const waitForOutcome = async (signal: AbortSignal) => {
    const id = graceIncident.current
    if (!id) throw new Error('No incident was recorded for the township response')
    await waitForIncident(items => items.some(item => item.incident_id === id && item.state === 'closed'), signal)
    resetResponder()
  }
  const startScenario = (id: ScenarioId) => {
    if (scenarioActive || resetBusy || !homeUnit || (!usingMock && !appState.connected) || characterStatus.phase === 'loading' || characterStatus.phase === 'error') return
    cancelSequence()
    resetResponder()
    graceIncident.current = null
    setResponseIncidentId(null)
    setAutoAcknowledged(false)
    scenarioRef.current = id
    setIntegrationError(null)
    setVisible(true)
    setPaused(false)
    // Every scenario starts from a fixed spot; Unusual Inactivity otherwise leaves her lying on the floor.
    // Normal Morning starts with her already asleep in bed.
    setPose('none')
    nextCharacterCommand(id === 'normalMorning' ? 'resetInBed' : 'reset')
    const steps = scenarioSteps(id, timing)
    const controller = new ScenarioController()
    runner.current = controller
    clock.current = controller
    setScenario(id)
    setScenarioState('running')
    setScenarioProgress(null)
    const actions: ScenarioActions = {
      moveTo,
      confirmCall: async signal => {
        await interactWith('telephone', true, undefined, signal, undefined, 'I’m okay, I was just sleeping.')
        await controller.gate()
        if (signal.aborted) throw new DOMException('Scenario stopped', 'AbortError')
        const id = graceIncident.current
        if (!id) throw new Error('No backend inactivity incident was observed')
        const confirmed = await api.confirmDemoCall(id, true)
        applyEvent({ type: 'incident.updated', at: confirmed.closed_at!, data: confirmed })
      },
      playAnimation,
      interactWith: (object, value, approach, signal) => interactWith(object, false, approach, signal, value),
      setCharacterVisible: setVisible, setObject, waitForQuietGap, waitForResolution, waitForOutcome,
      // The phone tag stays up from the first ring until the caregiver and township alert goes out.
      waitForNoAnswer: async signal => {
        setCallCard('ringing')
        try { await waitForNoAnswer(signal) } catch (error) { setCallCard(null); throw error }
        setCallCard('noAnswer')
      },
      waitForCaregiverAlert: async signal => {
        try { await waitForCaregiverAlert(signal) } finally { setCallCard(null) }
      },
      dispatchResponder, setResponderVisible: () => setResponderVisible(true), setResponderDoor: open => {
        setResponderDoorOpen(open)
        sound.current.play(open ? 'doorOpen' : 'doorClose')
      },
      moveResponder, checkResident: () => setResponderChecking(true),
    }
    // Wait a frame so the reset command commits before the first step replaces it.
    void new Promise<void>(resolve => requestAnimationFrame(() => resolve())).then(() => controller.play(steps, actions, (index: number, step: ScenarioStep) => {
      if (step.kind === 'animate' && (step.animation === 'wake' || step.animation === 'recover')) sound.current.play('wake')
      if (id === 'goingOut' && step.kind === 'visible' && step.value) sound.current.play('return')
      setScenarioProgress({ index: index + 1, total: steps.length, label: step.label, kind: step.kind })
    }))
      .then(() => {
        if (runner.current !== controller) return
        runner.current = null
        scenarioRef.current = null
        clock.current = new ScenarioController()
        setScenarioState('complete')
      }).catch(error => {
        if (runner.current !== controller) return
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Scenario playback stopped unexpectedly', error)
          setIntegrationError(error instanceof Error ? error.message : 'Scenario could not complete')
        }
        runner.current = null
        scenarioRef.current = null
        clock.current = new ScenarioController()
        cancelSequence()
        resetResponder()
        setVisualStates({ ...localStates.current, telephone: 'idle' })
        setVisible(true)
        nextCharacterCommand('reset')
        setScenarioProgress(null)
        setScenarioState('stopped')
      })
  }
  const pauseScenario = () => {
    if (!runner.current || scenarioState !== 'running') return
    runner.current.pause()
    sound.current.setPaused(true)
    setPaused(true)
    setScenarioState('paused')
  }
  const resumeScenario = () => {
    if (!runner.current || scenarioState !== 'paused') return
    runner.current.resume()
    sound.current.setPaused(false)
    setPaused(false)
    setScenarioState('running')
  }
  const stopScenario = (clearProgress = false, resetCharacter = true) => {
    sound.current.stopAll()
    sound.current.setPaused(false)
    runner.current?.stop()
    runner.current = null
    scenarioRef.current = null
    clock.current = new ScenarioController()
    cancelSequence()
    resetResponder()
    setCallCard(null)
    setVisualStates({ ...localStates.current, telephone: 'idle' })
    pending.current.forEach(item => item.reject(new DOMException('Scenario stopped', 'AbortError')))
    pending.current.clear()
    setPaused(false)
    setVisible(true)
    setPose('none')
    nextCharacterCommand(resetCharacter ? 'reset' : 'stop')
    if (clearProgress) { setScenario(null); setScenarioProgress(null); setScenarioState('idle') }
    else { setScenarioProgress(null); setScenarioState('stopped') }
  }
  const send = (action: Command['action']) => {
    setCommand(value => ({ action, id: value.id + 1 }))
  }
  const moveCharacter = (destination: CharacterCommand['destination']) => {
    if (scenarioActive) return
    cancelSequence()
    nextCharacterCommand(destination, undefined, 'move')
  }
  const resetInteractions = () => {
    if (scenarioActive) return
    cancelSequence()
    setVisualStates({ ...localStates.current, telephone: 'idle' })
    if (characterStatus.phase !== 'loading' && characterStatus.phase !== 'error') nextCharacterCommand('stop')
  }
  const restoreScene = (unit: Unit) => {
    sound.current.stopAll()
    setCallCard(null)
    runner.current?.stop()
    runner.current = null
    scenarioRef.current = null
    gateway.current.cancelQueued()
    resetLocalObjects()
    resetResponder()
    pending.current.forEach(item => item.reject(new DOMException('Scene reset', 'AbortError')))
    pending.current.clear()
    setPaused(false)
    setVisible(true)
    setPose('none')
    setQueuedCalls([])
    setIntegrationError(null)
    graceIncident.current = null
    setResponseIncidentId(null)
    nextCharacterCommand('reset')
    syncUnit(unit)
    setScenario(null)
    setScenarioProgress(null)
    setScenarioState('idle')
  }
  const resetDemo = async () => {
    if (resetBusy || !window.confirm('Reset the 3D demo and backend data for all units?')) return
    setResetBusy(true)
    setIntegrationError(null)
    stopScenario(false, false)
    gateway.current.cancelQueued()
    try {
      await gateway.current.drain()
      const response = await api.resetDemo()
      const unit = response.units.find(item => item.unit_id === HOME_UNIT_ID) ?? await api.getUnit(HOME_UNIT_ID)
      restoreScene(unit)
      setLastReading(null)
      setRecentReadings([])
      setTransmission('idle')
      setIntegrationError(null)
    } catch (error) {
      setIntegrationError(error instanceof Error ? `Reset failed: ${error.message}` : 'Reset failed')
    } finally { setResetBusy(false) }
  }
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([api.getUnit(HOME_UNIT_ID), api.getConfig(), api.getReadings(HOME_UNIT_ID)]).then(results => {
      if (cancelled) return
      if (results[0].status === 'fulfilled') syncUnit(results[0].value)
      else { if (!usingMock) setFetchedUnit(null); setIntegrationError('Could not load A-105 from the backend') }
      if (results[1].status === 'fulfilled') setFetchedConfig(results[1].value)
      if (results[2].status === 'fulfilled') {
        setLastReading(results[2].value.at(-1) ?? null)
        setRecentReadings(results[2].value.slice(-5).reverse())
      }
    })
    return () => { cancelled = true }
  }, [appState.connected])
  useEffect(() => {
    if (!appState.connected && seenSnapshot.current) {
      reconnecting.current = true
      if (!usingMock && runner.current) {
        stopScenario()
        setIntegrationError('Realtime connection lost; scenario stopped. Reconnect before replaying.')
      }
    }
  }, [appState.connected])
  // The backend watches A-105 for inactivity only from a scenario's quiet-gap step until the scenario
  // ends, so it never raises incidents on its own. Calls are queued so on/off reach it in order.
  const switchMonitoring = (active: boolean, timing?: CallTiming) => {
    monitoringOn.current = active
    const call = monitoringQueue.current.then(() => api.setMonitoring(active, timing))
    monitoringQueue.current = call.then(() => undefined, () => undefined)
    return call
  }
  useEffect(() => {
    if (scenarioActive || !monitoringOn.current) return
    switchMonitoring(false).catch(error => console.error('Could not switch off A-105 monitoring', error))
  }, [scenarioActive])
  useEffect(() => {
    const off = () => {
      if (!monitoringOn.current) return
      monitoringOn.current = false
      void api.setMonitoring(false).catch(() => undefined)
    }
    window.addEventListener('pagehide', off)
    return () => { window.removeEventListener('pagehide', off); off() }
  }, [])
  useEffect(() => subscribeAppEvents(event => {
    if (event.type === 'snapshot') {
      const unit = event.data.units.find(item => item.unit_id === HOME_UNIT_ID)
      if (unit) {
        if (seenSnapshot.current && !reconnecting.current) restoreScene(unit)
        else syncUnit(unit)
      }
      seenSnapshot.current = true
      reconnecting.current = false
      setFetchedConfig(event.data.config)
      setLastReading(null)
      setRecentReadings([])
    } else if (event.type === 'unit.updated' && event.data.unit_id === HOME_UNIT_ID) syncUnit(event.data)
    else if (event.type === 'reading.received' && event.data.unit_id === HOME_UNIT_ID) {
      setLastReading(event.data)
      setRecentReadings(items => [event.data, ...items.filter(item =>
        item.recorded_at !== event.data.recorded_at || item.sensor !== event.data.sensor || item.value !== event.data.value)].slice(0, 5))
      const sensor = event.data.sensor
      const pulse = Date.now()
      setPulses(value => ({ ...value, [sensor]: pulse }))
      clearTimeout(pulseTimers.current[sensor])
      pulseTimers.current[sensor] = setTimeout(() => setPulses(value => value[sensor] === pulse ? { ...value, [sensor]: 0 } : value), 3200)
    }
    else if (event.type === 'companion.message_delivered' && event.data.unit_id === HOME_UNIT_ID && !deliveredCalls.current.has(event.data.message_id)) {
      deliveredCalls.current.add(event.data.message_id)
      setQueuedCalls(items => [...items, event.data])
    }
  }), [])
  useEffect(() => {
    if (!queuedCalls.length || scenarioActive || resetBusy || !visible || characterStatus.phase !== 'idle' || active.current) return
    const message = queuedCalls[0]
    setQueuedCalls(items => items.slice(1))
    void interactWith('telephone', true, undefined, undefined, undefined, message.text).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setIntegrationError(error instanceof Error ? error.message : 'Companion call failed')
    })
  }, [queuedCalls, scenarioActive, resetBusy, visible, characterStatus.phase])
  const characterBusy = characterStatus.phase === 'loading' || characterStatus.phase === 'error'
  const canStart = !scenarioActive && !resetBusy && !!homeUnit && (usingMock || appState.connected) && !characterBusy
  const shownScenario = scenario ?? picked
  const timelineSteps = scenarioSteps(shownScenario, timing)
  const stepIndex = scenarioState === 'complete' ? timelineSteps.length : scenarioProgress?.index ?? 0
  const caption = scenarioState === 'complete' ? 'Scenario complete' : scenarioState === 'stopped' ? 'Scenario stopped'
    : scenarioProgress?.label ?? (canStart ? `Press play to run “${SCENARIO_LABELS[picked]}”` : 'Preparing the home…')
  const playback = scenarioState === 'running' && scenarioProgress?.kind === 'hold' ? 'Awaiting outcome'
    : scenarioState === 'idle' ? 'Ready' : scenarioState[0].toUpperCase() + scenarioState.slice(1)
  const demoNote = scenario === 'unusualInactivity' && scenarioActive && autoAcknowledged
    ? `Nobody acknowledged within ${MOCK_AUTO_ACK_SECONDS} seconds, so Guard Ali acknowledged automatically (demo only). A human must still record the outcome.`
    : usingMock && scenario === 'unusualInactivity' && scenarioActive && scenarioProgress?.kind === 'dispatchResponder'
      ? `Click “I'll Check Now” on the township dashboard. If nobody responds within ${MOCK_AUTO_ACK_SECONDS} seconds, Guard Ali acknowledges automatically (demo only).`
    : scenario === 'unusualInactivity' && (scenarioProgress?.index ?? 0) >= 7
    ? 'Guard Ali’s visit is a reenactment after the township acknowledgement. A human must still record the outcome.'
    : scenario === 'falseAlarmRecovery' && scenarioActive
      ? 'Demo time is compressed: 5 seconds stand in for her usual 4-hour quiet gap, so a simulated check-in call rings while Madam Lee is napping.'
    : scenario === 'unusualInactivity' && scenarioActive
      ? 'Demo time is compressed: 5 seconds stand in for her usual 4-hour quiet gap, learned from her past history. The fall is for the audience, not a sensor reading.'
      : null
  const pickScenario = (id: ScenarioId) => {
    if (scenarioActive) return
    setPicked(id)
    if (scenarioState !== 'idle') { setScenario(null); setScenarioProgress(null); setScenarioState('idle'); setIntegrationError(null) }
  }
  const togglePlayback = () => {
    if (scenarioState === 'running') pauseScenario()
    else if (scenarioState === 'paused') resumeScenario()
    else startScenario(picked)
  }
  const meters: { sensor: Sensor; label: string; icon: string; value: string }[] = [
    { sensor: 'water', label: 'Water', icon: '◉', value: homeUnit ? `${homeUnit.latest.water_lpm.toFixed(1)} L/min` : '—' },
    { sensor: 'electricity', label: 'Power', icon: 'ϟ', value: homeUnit ? `${homeUnit.latest.power_kw.toFixed(2)} kW` : '—' },
    { sensor: 'door', label: 'Door', icon: '▣', value: homeUnit ? homeUnit.latest.door === 'open' ? 'Open' : 'Closed' : '—' },
  ]
  const config = appState.config ?? fetchedConfig

  return <section className={`home-environment live-stage ${sensorView ? 'is-sensor-view' : ''} ${className}`} aria-label="Interactive 3D home demo"
    onPointerDown={() => sound.current.unlock()}
    onKeyDown={event => { sound.current.unlock(); if (event.key === 'Escape' && toolsOpen) setToolsOpen(false) }}>
    <div className="home-canvas" tabIndex={0} aria-label="3D home. Drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom; Home resets the camera."
      onKeyDown={event => {
        const action = ({ ArrowLeft: 'left', ArrowRight: 'right', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' } as Record<string, Command['action']>)[event.key]
        if (action) { event.preventDefault(); send(action) }
      }}>
      <SceneBoundary><Canvas shadows={{ type: PCFShadowMap }} frameloop="demand" dpr={[1, 1.7]} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}
        fallback={<div className="home-fallback">This home needs a browser with WebGL enabled.</div>}>
        <Suspense fallback={null}><Scene command={command} characterCommand={characterCommand} responderCommand={responderCommand}
          responderVisible={showResponder} responderChecking={responderChecking} interaction={interaction}
          pose={pose} speech={speech} visible={visible} paused={paused}
          urgent={false}
          sensorView={sensorView} unit={homeUnit} pulses={pulses}
          onCharacterStatus={setCharacterStatus} onReached={onReached} onArrived={onArrived} onResponderArrived={onResponderArrived}
          onAnimationComplete={onAnimationComplete} onReady={ready} /></Suspense>
      </Canvas></SceneBoundary>
    </div>

    <div className="live-card live-scenarios">
      <div className="live-scenario-tabs" role="radiogroup" aria-label="Choose a scenario">
        {(Object.keys(SCENARIO_LABELS) as ScenarioId[]).map(id => <button key={id} type="button" role="radio" aria-checked={shownScenario === id}
          className={shownScenario === id ? 'is-current' : ''} disabled={scenarioActive && scenario !== id} onClick={() => pickScenario(id)}>{SCENARIO_LABELS[id]}</button>)}
      </div>
      <div className="live-scenarios-foot">
        <div className="live-view-mode" role="radiogroup" aria-label="What to show">
          <button type="button" role="radio" aria-checked={!sensorView} onClick={() => setSensorView(false)}>Demo view</button>
          <button type="button" role="radio" aria-checked={sensorView} onClick={() => setSensorView(true)}>Sensor view</button>
        </div>
        <button type="button" className="live-icon-button" aria-label={soundOn ? 'Mute home sounds' : 'Turn on home sounds'}
          title={soundOn ? 'Mute home sounds' : 'Turn on home sounds'} aria-pressed={soundOn} onClick={() => {
            const next = !soundOn
            sound.current.setEnabled(next)
            if (next) sound.current.unlock()
            setSoundOn(next)
          }}>
          {soundOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
        </button>
        <button type="button" className="live-icon-button" aria-expanded={toolsOpen} aria-controls="live-tools" onClick={() => setToolsOpen(value => !value)} title="Presenter tools" aria-label="Presenter tools">
          <Settings2 size={15} aria-hidden="true" />
        </button>
      </div>
    </div>

    {toolsOpen && <div className="live-card live-tools" id="live-tools" role="dialog" aria-label="Presenter tools">
      <div className="live-tools-head">
        <h2 className="live-card-kicker">Presenter tools</h2>
        <button type="button" className="live-icon-button" onClick={() => setToolsOpen(false)} aria-label="Close presenter tools"><X size={16} aria-hidden="true" /></button>
      </div>
      <div className="live-tools-group" data-character-state={characterStatus.phase}>
        <strong>Move Madam Lee</strong>
        <div className="live-tools-buttons">
          {(Object.keys(ROOM_LABELS) as RoomId[]).map(room => <button key={room} type="button" onClick={() => moveCharacter(room)} disabled={scenarioActive || resetBusy || characterBusy}>{ROOM_LABELS[room]}</button>)}
          <button type="button" className="is-muted" onClick={() => moveCharacter('reset')} disabled={scenarioActive || resetBusy || characterBusy}>Reset character</button>
        </div>
      </div>
      <div className="live-tools-group">
        <strong>Test an object</strong>
        <div className="live-tools-buttons">
          {(['bathroomTap', 'shower', 'kitchenKettle', 'television', 'bedroomLamp', 'mainDoor'] as const).map(id => <button key={id} type="button" onClick={() => manualInteract(id)} disabled={scenarioActive || resetBusy || !homeUnit || characterBusy || selected === id} aria-pressed={states[id]}>{interactionPrompt(id, states)}</button>)}
          <button type="button" onClick={() => manualInteract('telephone', true)} disabled={scenarioActive || resetBusy || characterBusy || selected === 'telephone'}>Test incoming call</button>
          <button type="button" className="is-muted" onClick={resetInteractions} disabled={scenarioActive || resetBusy}>Stop interaction</button>
        </div>
        <p className="live-tools-states" role="status">Tap <b>{states.bathroomTap ? 'ON' : 'OFF'}</b> · Shower <b>{states.shower ? 'ON' : 'OFF'}</b> · Kettle <b>{states.kitchenKettle ? 'ON' : 'OFF'}</b> · TV <b>{states.television ? 'ON' : 'OFF'}</b> · Lamp <b>{states.bedroomLamp ? 'ON' : 'OFF'}</b> · Door <b>{states.mainDoor ? 'OPEN' : 'CLOSED'}</b> · Phone <b>{states.telephone.toUpperCase()}</b></p>
      </div>
      <div className="live-tools-group">
        <strong>Timing</strong>
        <label className="live-tools-timing">Outside stay <input type="number" min="1" max="15" value={timing.outsideSeconds} disabled={scenarioActive} onChange={event => setTiming(value => ({ ...value, outsideSeconds: Math.min(15, Math.max(1, Number(event.target.value) || 1)) }))} /> s</label>
      </div>
      <div className="live-tools-group live-tools-status" role="status">
        <strong>Integration</strong>
        <span>{appState.connected ? usingMock ? 'Mock connected' : 'Backend connected' : usingMock ? 'Mock disconnected' : 'Realtime disconnected'} · Reading: {transmission} · Last: {lastReading ? new Date(lastReading.recorded_at).toLocaleTimeString() : 'none since reset'}</span>
        {config && <span>{usingMock ? 'Mock thresholds' : 'Backend thresholds'}: grace {config.grace_period_seconds}s · quiet gap {homeUnit?.quiet_gap.usual_max_seconds ?? '—'}s · outing {homeUnit?.baseline.usual_outing_seconds ?? '—'}s</span>}
        {scenario === 'unusualInactivity' && <span>Backend status: {homeUnit?.status ?? 'unavailable'} · Incident: {appState.incidents.find(item => item.incident_id === homeUnit?.active_incident_id)?.state ?? 'none'}</span>}
        {queuedCalls.length > 0 && <span>{queuedCalls.length} companion call{queuedCalls.length > 1 ? 's' : ''} queued until Madam Lee is available.</span>}
        {recentReadings.length > 0 && <span>Recent: {recentReadings.map(reading => `${reading.sensor} ${reading.sensor === 'door' ? String(reading.value) : Number(reading.value).toFixed(reading.sensor === 'water' ? 1 : 2)}`).join(' · ')}</span>}
      </div>
    </div>}

    {quietGap && <QuietGapOverlay endsAt={quietGap.endsAt} seconds={quietGap.seconds} />}

    <div className="live-top-right">
      <p className="live-demo-badge"><b>Demo only</b>Real homes are sensed, never seen.</p>
    </div>

    <div className="home-camera-tools" aria-label="Camera controls">
      <button type="button" onClick={() => send('in')} aria-label="Zoom in" title="Zoom in">+</button>
      <button type="button" onClick={() => send('out')} aria-label="Zoom out" title="Zoom out">−</button>
      <span />
      <button type="button" onClick={() => send('left')} aria-label="Rotate left" title="Rotate left">↶</button>
      <button type="button" onClick={() => send('right')} aria-label="Rotate right" title="Rotate right">↷</button>
    </div>

    <div className="live-bottom">
      <div className="live-bottom-row">
        <div className="live-meters" aria-label={appState.connected ? 'Live A-105 sensor values' : 'Last confirmed A-105 sensor values'}>
          {meters.map(meter => <span key={meter.sensor} className={pulses[meter.sensor] ? 'is-pulsing' : ''}>
            <i aria-hidden="true">{meter.icon}</i><small>{meter.label}</small><b>{meter.value}</b>
          </span>)}
        </div>
        <div className="live-views" aria-label="Camera reset">
          <button type="button" onClick={() => send('reset')}><span aria-hidden="true">↺</span>Reset camera</button>
        </div>
      </div>
      {integrationError && <p className="live-error" role="alert">{scenarioState === 'stopped' ? 'Scenario stopped: ' : ''}{integrationError}</p>}
      <div className="live-player" role="group" aria-label="Scenario playback">
        <button type="button" className="live-play" onClick={togglePlayback} disabled={scenarioState === 'running' || scenarioState === 'paused' ? false : !canStart}
          aria-label={scenarioState === 'running' ? 'Pause scenario' : scenarioState === 'paused' ? 'Resume scenario' : `Play ${SCENARIO_LABELS[picked]}`}>
          {scenarioState === 'running' ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
        </button>
        <div className="live-player-body">
          <div className="live-player-caption" role="status" aria-live="polite">
            <strong>{scenarioProgress?.kind === 'quietGap' && scenarioActive && <FastForward size={14} className="live-caption-ff" aria-hidden="true" />}{caption}</strong>
            <span>{SCENARIO_LABELS[shownScenario]} · {stepIndex ? `Step ${stepIndex} of ${timelineSteps.length}` : `${timelineSteps.length} steps`} · <em className={`live-playback-${scenarioState}`}>{playback}</em></span>
          </div>
          <div className="live-timeline-track">
            <div className="live-timeline" aria-hidden="true">
              <span className="live-timeline-fill" style={{ width: `${stepIndex / timelineSteps.length * 100}%` }} />
              {timelineSteps.map((step, index) => <i key={index} title={step.label} className={index < stepIndex ? 'is-done' : ''}
                style={{ left: `${(index + 1) / timelineSteps.length * 100}%` }} />)}
            </div>
            {timelineSteps.map((step, index) => step.kind === 'quietGap' && <span key={index} className={`live-timeline-ff ${index < stepIndex ? 'is-done' : ''} ${index === stepIndex - 1 && scenarioActive ? 'is-current' : ''}`}
              title="Quiet gap (demo fast-forward)" style={{ left: `${(index + .5) / timelineSteps.length * 100}%` }}><FastForward size={10} aria-hidden="true" /></span>)}
          </div>
          <p className="live-player-note">{demoNote ?? SCENARIO_DESCRIPTIONS[shownScenario]}</p>
        </div>
        <div className="live-player-actions">
          <button type="button" onClick={() => stopScenario()} disabled={!scenarioActive} title="Stop scenario"><Square size={14} aria-hidden="true" /><span>Stop</span></button>
          <button type="button" onClick={() => void resetDemo()} disabled={resetBusy} title="Reset the demo and backend data"><RotateCcw size={14} aria-hidden="true" /><span>{resetBusy ? 'Resetting…' : 'Reset demo'}</span></button>
        </div>
      </div>
    </div>
  </section>
}
