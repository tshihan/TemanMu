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
import { INITIAL_OBJECT_STATES, INTERACTIONS, interactionPrompt, type InteractionBindings, type InteractionId, type ObjectStates } from './interactions/registry'
import { ScenarioController, type ScenarioActions } from './scenarios/ScenarioController'
import { DEFAULT_TIMING, SCENARIO_LABELS, scenarioSteps, type ScenarioId, type ScenarioStep, type ScenarioTiming } from './scenarios/definitions'
import { api, usingMock } from '../api'
import { primeSharedMockInactivity } from '../mocks/shared-client'
import { getAppState, subscribeAppEvents, useAppState } from '../api/store'
import type { CompanionMessage, Config, Incident, Reading, Unit } from '../api/types'
import { HOME_UNIT_ID, SensorGateway, readingForObject } from './integration/sensorGateway'
import seed from '../../../shared/seed.json'
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
function Scene({ command, characterCommand, responderCommand, responderVisible, responderChecking, interaction, pose, speech, visible, paused, urgent, onCharacterStatus, onReached, onArrived, onResponderArrived, onAnimationComplete, onReady }: {
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
    <ElderlyCharacter command={characterCommand} pose={pose} speech={speech} visible={visible} paused={paused} urgent={urgent}
      onStatus={onCharacterStatus} onReached={onReached} onArrived={onArrived} onAnimationComplete={onAnimationComplete} />
    <TownshipResponder command={responderCommand} visible={responderVisible} checking={responderChecking} paused={paused} onArrived={onResponderArrived} />
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
const isDeadlinePast = (deadline: string) => Date.now() >= Date.parse(deadline)

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
  const graceDeadline = useRef<string | null>(null)
  const lastPositiveWaterAt = useRef<string | null>(null)
  const scenarioRef = useRef<ScenarioId | null>(null)
  const [command, setCommand] = useState<Command>({ action: 'reset', id: 0 })
  const [characterCommand, setCharacterCommand] = useState<CharacterCommand>({ destination: 'reset', id: 0 })
  const [responderCommand, setResponderCommand] = useState<ResponderCommand>({ destination: 'reset', id: 0 })
  const [responderVisible, setResponderVisible] = useState(false)
  const [responderChecking, setResponderChecking] = useState(false)
  const [responderDoorOpen, setResponderDoorOpen] = useState(false)
  const [characterStatus, setCharacterStatus] = useState<CharacterStatus>({ room: 'bedroom', destination: null, phase: 'loading' })
  const [view, setView] = useState<'dollhouse' | 'plan'>('dollhouse')
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
  const active = useRef<{ id: number; target: InteractionId; aborter: AbortController } | null>(null)
  const characterSequence = useRef(0)
  const responderSequence = useRef(0)
  const pending = useRef(new Map<number, { resolve: () => void; reject: (reason: Error) => void }>())
  const responderPending = useRef(new Map<number, { resolve: () => void; reject: (reason: Error) => void }>())
  const runner = useRef<ScenarioController | null>(null)
  const clock = useRef(new ScenarioController())
  const scenarioActive = scenarioState === 'running' || scenarioState === 'paused'
  const homeUnit = fetchedUnit ?? storeUnit ?? null
  const setVisualStates = (next: ObjectStates) => { localStates.current = next; setStates(next) }
  const syncUnit = (unit: Unit) => {
    latestUnit.current = unit
    gateway.current.sync(unit)
    setFetchedUnit(unit)
    setVisualStates({ bathroomTap: unit.latest.water_lpm > 0, kitchenKettle: unit.latest.power_kw > unit.baseline.standby_power_kw,
      mainDoor: unit.latest.door === 'open', telephone: localStates.current.telephone })
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
    if (scenarioRef.current === 'falseAlarmRecovery' && target === 'bathroomTap' && on) {
      const incident = getAppState().incidents.find(item => item.incident_id === graceIncident.current)
      if (incident?.state !== 'grace') throw new Error('The backend incident left grace before Madam Lee reached the tap')
      if (graceDeadline.current && isDeadlinePast(graceDeadline.current))
        throw new Error('The backend grace period expired before Madam Lee reached the tap')
    }
    const reading = readingForObject(target, on, unit)
    setTransmission('sending')
    setIntegrationError(null)
    try {
      const confirmed = await gateway.current.sendSensorReading(reading.sensor, reading.value)
      if (confirmed) syncUnit(confirmed)
      setTransmission('confirmed')
      const refreshReadings = api.getReadings(HOME_UNIT_ID).then(items => {
        setLastReading(items.at(-1) ?? null)
        if (scenarioRef.current === 'falseAlarmRecovery' && target === 'bathroomTap' && on)
          lastPositiveWaterAt.current = items.filter(item => item.sensor === 'water' && item.value === 6).at(-1)?.recorded_at ?? null
      }).catch(() => { /* WebSocket reading event may supply the timestamp. */ })
      if (scenarioRef.current === 'falseAlarmRecovery' && target === 'bathroomTap' && on) await refreshReadings
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
  const waitForIncident = (predicate: (incidents: Incident[]) => boolean, signal: AbortSignal, timeoutMs = 0) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Scenario stopped', 'AbortError')); return }
    let timeout: ReturnType<typeof setTimeout> | null = null
    const check = () => {
      const incidents = getAppState().incidents.filter(item => item.unit_id === HOME_UNIT_ID)
      if (!predicate(incidents)) return
      cleanup()
      resolve()
    }
    const abort = () => { cleanup(); reject(new DOMException('Scenario stopped', 'AbortError')) }
    const unsubscribe = subscribeAppEvents(check)
    const cleanup = () => { unsubscribe(); signal.removeEventListener('abort', abort); if (timeout) clearTimeout(timeout) }
    signal.addEventListener('abort', abort, { once: true })
    if (timeoutMs) timeout = setTimeout(() => { cleanup(); reject(new Error('The mock did not start the inactivity check. Reset Demo and try again.')) }, timeoutMs)
    check()
  })
  const waitForGrace = async (signal: AbortSignal, timeoutMs = 0) => {
    await waitForIncident(items => items.some(item => item.state === 'grace'), signal, timeoutMs)
    const incident = getAppState().incidents.find(item => item.unit_id === HOME_UNIT_ID && item.state === 'grace')
    if (!incident) throw new Error('The backend grace state ended before recovery could begin')
    graceIncident.current = incident.incident_id
    graceDeadline.current = incident.grace_ends_at
  }
  const waitForQuietGap = async (signal: AbortSignal) => {
    if (signal.aborted) throw new DOMException('Scenario stopped', 'AbortError')
    if (usingMock) await primeSharedMockInactivity()
    await waitForGrace(signal, usingMock ? 5000 : 0)
    setVisualStates({ ...localStates.current, telephone: 'ringing' })
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
    const check = () => {
      const notified = getAppState().notifications.some(item => item.incident_id === id && item.role === 'caregiver' && item.kind === 'alert')
      if (!notified) return
      cleanup()
      resolve()
    }
    const abort = () => { cleanup(); reject(new DOMException('Scenario stopped', 'AbortError')) }
    const unsubscribe = subscribeAppEvents(check)
    const cleanup = () => { unsubscribe(); signal.removeEventListener('abort', abort) }
    signal.addEventListener('abort', abort, { once: true })
    check()
  })
  const dispatchResponder = async (signal: AbortSignal) => {
    const id = graceIncident.current
    if (!id) throw new Error('No inactivity incident was observed for the township response')
    const incident = getAppState().incidents.find(item => item.incident_id === id)
    if (usingMock && incident?.state === 'notified')
      await api.acknowledgeIncident(id, { role: 'township', name: seed.responders.township })
    else if (usingMock && (incident?.state !== 'acknowledged' || incident.acknowledged_by?.role !== 'township'))
      throw new Error('The incident cannot be dispatched to Guard Ali. Reset Demo and try again.')
    await waitForIncident(items => items.some(item => item.incident_id === id && ['acknowledged', 'closed', 'auto_resolved'].includes(item.state)), signal)
    const response = getAppState().incidents.find(item => item.incident_id === id)
    if (response?.acknowledged_by?.role !== 'township')
      throw new Error('This incident was not acknowledged by the township, so Guard Ali’s visit will not be reenacted.')
  }
  const waitForResolution = async (signal: AbortSignal) => {
    const id = graceIncident.current
    if (!id) throw new Error('No backend incident was observed')
    await waitForIncident(items => items.some(item => item.incident_id === id && ['auto_resolved', 'notified', 'closed'].includes(item.state)), signal)
    const incident = getAppState().incidents.find(item => item.incident_id === id)
    if (incident?.state !== 'auto_resolved') throw new Error(`The backend did not auto-resolve the incident${incident ? ` (state: ${incident.state})` : ''}`)
    const readingAt = lastPositiveWaterAt.current ?? getAppState().readingsByUnit[HOME_UNIT_ID]?.filter(item => item.sensor === 'water' && item.value === 6).at(-1)?.recorded_at
    if (!readingAt || !graceDeadline.current || Date.parse(readingAt) >= Date.parse(graceDeadline.current))
      throw new Error('The activity was not confirmed within the backend grace period')
    setVisualStates({ ...localStates.current, telephone: 'idle' })
  }
  const startScenario = (id: ScenarioId) => {
    if (scenarioActive || resetBusy || !homeUnit || (!usingMock && !appState.connected) || characterStatus.phase === 'loading' || characterStatus.phase === 'error') return
    cancelSequence()
    resetResponder()
    graceIncident.current = null
    graceDeadline.current = null
    lastPositiveWaterAt.current = null
    scenarioRef.current = id
    setIntegrationError(null)
    setVisible(true)
    setPaused(false)
    const steps = scenarioSteps(id, timing, usingMock)
    const controller = new ScenarioController()
    runner.current = controller
    clock.current = controller
    setScenario(id)
    setScenarioState('running')
    setScenarioProgress(null)
    const actions: ScenarioActions = {
      moveTo,
      playAnimation,
      interactWith: (object, value, approach, signal) => interactWith(object, false, approach, signal, value),
      setCharacterVisible: setVisible, setObject, waitForQuietGap, waitForNoAnswer, waitForCaregiverAlert, waitForResolution,
      dispatchResponder, setResponderVisible: () => setResponderVisible(true), setResponderDoor: setResponderDoorOpen,
      moveResponder, checkResident: () => setResponderChecking(true),
    }
    void controller.play(steps, actions, (index: number, step: ScenarioStep) =>
      setScenarioProgress({ index: index + 1, total: steps.length, label: step.label, kind: step.kind }))
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
    setPaused(true)
    setScenarioState('paused')
  }
  const resumeScenario = () => {
    if (!runner.current || scenarioState !== 'paused') return
    runner.current.resume()
    setPaused(false)
    setScenarioState('running')
  }
  const stopScenario = (clearProgress = false, resetCharacter = true) => {
    runner.current?.stop()
    runner.current = null
    scenarioRef.current = null
    clock.current = new ScenarioController()
    cancelSequence()
    resetResponder()
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
    cancelSequence()
    setVisualStates({ ...localStates.current, telephone: 'idle' })
    if (characterStatus.phase !== 'loading' && characterStatus.phase !== 'error') nextCharacterCommand('stop')
  }
  const restoreScene = (unit: Unit) => {
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
    graceDeadline.current = null
    lastPositiveWaterAt.current = null
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
      if (scenarioRef.current === 'falseAlarmRecovery' && event.data.sensor === 'water' && event.data.value === 6) lastPositiveWaterAt.current = event.data.recorded_at
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
  return <section className={`home-environment ${className}`} aria-label="Interactive furnished 3D home">
    <div className="home-scene-body">
    <div className="home-canvas" tabIndex={0} aria-label="3D home. Drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom; Home resets the camera."
      onKeyDown={event => {
        const action = ({ ArrowLeft: 'left', ArrowRight: 'right', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' } as Record<string, Command['action']>)[event.key]
        if (action) { event.preventDefault(); send(action) }
      }}>
      <SceneBoundary><Canvas shadows={{ type: PCFShadowMap }} frameloop="demand" dpr={[1, 1.7]} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}
        fallback={<div className="home-fallback">This home needs a browser with WebGL enabled.</div>}>
        <Suspense fallback={null}><Scene command={command} characterCommand={characterCommand} responderCommand={responderCommand}
          responderVisible={responderVisible} responderChecking={responderChecking} interaction={interaction}
          pose={pose} speech={speech} visible={visible} paused={paused}
          urgent={scenario === 'falseAlarmRecovery' && (scenarioProgress?.index ?? 0) >= 5}
          onCharacterStatus={setCharacterStatus} onReached={onReached} onArrived={onArrived} onResponderArrived={onResponderArrived}
          onAnimationComplete={onAnimationComplete} onReady={ready} /></Suspense>
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
    <aside className="home-controls" aria-label="Presenter controls">
    <details className="character-panel" aria-label="Character movement test controls" data-character-state={characterStatus.phase}>
      <summary className="character-panel-heading"><span className="character-avatar" aria-hidden="true">ML</span><span><strong>Madam Lee Mei Ling</strong><span role="status">{characterStatus.phase === 'loading' ? 'Loading character…' : characterStatus.phase === 'error' ? 'Character could not load' : scenario === 'unusualInactivity' && (scenarioProgress?.index ?? 0) >= 7 ? 'On the living-room floor · Guard Ali checking' : scenarioActive ? scenarioProgress?.label ?? 'Scenario starting' : selected && characterStatus.phase === 'walking' ? `Walking to ${INTERACTIONS[selected].label}` : selected && characterStatus.phase === 'interacting' ? `Using ${INTERACTIONS[selected].label}` : characterStatus.destination ? `Walking to ${ROOM_LABELS[characterStatus.destination as RoomId] ?? 'next point'}` : `At ${ROOM_LABELS[characterStatus.room] ?? 'home'}`}</span></span><span className="character-panel-toggle">Movement controls ▾</span></summary>
      <div className="character-moves">
        {(Object.keys(ROOM_LABELS) as RoomId[]).map(room => <button key={room} onClick={() => moveCharacter(room)} disabled={scenarioActive || resetBusy || characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>Go to {ROOM_LABELS[room]}</button>)}
        <button className="character-reset" onClick={() => moveCharacter('reset')} disabled={scenarioActive || resetBusy || characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>Reset Character</button>
      </div>
    </details>
    <details className="interaction-panel" aria-label="Household interaction development controls">
      <summary className="interaction-panel-heading"><strong>INTERACTION TEST</strong><span>Development controls · local only ▾</span></summary>
      <div className="interaction-actions">
        {(['bathroomTap', 'kitchenKettle', 'mainDoor'] as const).map(id => <button key={id} onClick={() => manualInteract(id)} disabled={scenarioActive || resetBusy || !homeUnit || characterStatus.phase === 'loading' || characterStatus.phase === 'error' || selected === id} aria-pressed={states[id]}>{interactionPrompt(id, states)}</button>)}
        <button onClick={() => manualInteract('telephone', true)} disabled={scenarioActive || resetBusy || characterStatus.phase === 'loading' || characterStatus.phase === 'error' || selected === 'telephone'}>Test Incoming Call</button>
        <button className="interaction-reset" onClick={resetInteractions} disabled={scenarioActive || resetBusy}>Stop Interaction</button>
      </div>
      <div className="interaction-states" role="status">
        <span>Tap <b>{states.bathroomTap ? 'ON' : 'OFF'}</b></span><span>Kettle <b>{states.kitchenKettle ? 'ON' : 'OFF'}</b></span><span>Door <b>{states.mainDoor ? 'OPEN' : 'CLOSED'}</b></span><span>Telephone <b>{states.telephone.toUpperCase()}</b></span>
      </div>
    </details>
    <div className="scenario-panel" aria-label="Demo scenarios">
      <div className="scenario-panel-heading"><strong>DEMO SCENARIOS</strong><span>Sensor actions use {usingMock ? 'the mock API' : 'the live API'}</span></div>
      <div className="home-scenario-buttons">
        {(Object.keys(SCENARIO_LABELS) as ScenarioId[]).map(id => <button key={id} className={scenario === id ? 'is-current' : ''}
          onClick={() => startScenario(id)} disabled={scenarioActive || resetBusy || !homeUnit || (!usingMock && !appState.connected) || characterStatus.phase === 'loading' || characterStatus.phase === 'error'}>{SCENARIO_LABELS[id]}</button>)}
      </div>
      <div className="scenario-progress" role="status" aria-live="polite">
        <div><span>SCENARIO</span><strong>{scenario ? SCENARIO_LABELS[scenario] : 'Ready to play'}</strong></div>
        <div><span>CURRENT ACTION</span><strong>{scenarioState === 'complete' ? 'Scenario complete' : scenarioState === 'stopped' ? 'Scenario stopped' : scenarioProgress?.label ?? 'Choose a scenario above'}</strong></div>
        <div><span>PROGRESS</span><strong>{scenarioProgress ? `Step ${scenarioProgress.index} of ${scenarioProgress.total}` : '—'}</strong></div>
        <div><span>PLAYBACK</span><strong className={`scenario-playback-${scenarioState}`}>{scenarioState === 'running' && scenarioProgress?.kind === 'hold' ? 'Awaiting outcome' : scenarioState === 'idle' ? 'Ready' : scenarioState[0].toUpperCase() + scenarioState.slice(1)}</strong></div>
        {scenarioProgress && <progress value={scenarioProgress.index} max={scenarioProgress.total} aria-label="Scenario progress" />}
      </div>
      {scenarioState === 'stopped' && integrationError && <p className="home-integration-error" role="alert">Scenario stopped: {integrationError}</p>}
      {(scenario === 'unusualInactivity' || scenario === 'falseAlarmRecovery') &&
        <p className="home-demo-time-note">{usingMock ? 'Demo time is compressed: the quiet gap represents several hours without water use and no outing evidence.' : 'Waiting for the backend to establish a prolonged water quiet gap with no outing evidence.'} The animated fall is for the audience; it is not a sensor reading.</p>}
      {scenario === 'unusualInactivity' && (scenarioProgress?.index ?? 0) >= 7 &&
        <p className="home-demo-time-note">Guard Ali’s visit is a 3D reenactment after the township acknowledgement. His door movement sends no resident sensor reading; a human must still record the outcome.</p>}
      <div className="scenario-transport">
        <button onClick={pauseScenario} disabled={scenarioState !== 'running'}>Pause</button>
        <button onClick={resumeScenario} disabled={scenarioState !== 'paused'}>Resume</button>
        <button onClick={() => stopScenario()} disabled={!scenarioActive}>Stop</button>
        <button onClick={() => void resetDemo()} disabled={resetBusy}>{resetBusy ? 'Resetting…' : 'Reset Demo'}</button>
      </div>
      <details className="scenario-timing"><summary>Timing</summary>
        <label>Outside stay <input type="number" min="1" max="15" value={timing.outsideSeconds} disabled={scenarioActive} onChange={event => setTiming(value => ({ ...value, outsideSeconds: Math.min(15, Math.max(1, Number(event.target.value) || 1)) }))} /> s</label>
      </details>
      <p className="home-meter-heading">Current sensor values <span>{appState.connected ? 'Live A-105 readings' : 'Last confirmed A-105 readings'}</span></p>
      <div className="home-live-meter" aria-label="Current 3D home sensor values">
        <span>WATER <b>{homeUnit ? `${homeUnit.latest.water_lpm.toFixed(1)} L/min` : '—'}</b></span>
        <span>ELECTRICITY <b>{homeUnit ? `${homeUnit.latest.power_kw.toFixed(2)} kW` : '—'}</b></span>
        <span>DOOR <b>{homeUnit ? homeUnit.latest.door.toUpperCase() : '—'}</b></span>
      </div>
      <div className="home-reading-history" aria-label="Recent sensor changes">
        <strong>Recent sensor changes</strong>
        {recentReadings.length ? <ol>{recentReadings.map((reading, index) =>
          <li key={`${reading.recorded_at}-${reading.sensor}-${index}`}>
            <span>{reading.sensor === 'water' ? 'Water' : reading.sensor === 'electricity' ? 'Electricity' : 'Door'}</span>
            <b>{reading.sensor === 'door' ? String(reading.value).toUpperCase() : `${Number(reading.value).toFixed(reading.sensor === 'water' ? 1 : 2)} ${reading.sensor === 'water' ? 'L/min' : 'kW'}`}</b>
            <time dateTime={reading.recorded_at}>{new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
          </li>)}
        </ol> : <p>No sensor changes yet. Use an object or run a scenario.</p>}
      </div>
      <div className="home-integration-status" role="status">
        <span>{appState.connected ? usingMock ? 'Mock connected' : 'Backend connected' : usingMock ? 'Mock disconnected' : 'Realtime disconnected'}</span>
        <span>Reading: {transmission}</span>
        <span>Last reading: {lastReading ? new Date(lastReading.recorded_at).toLocaleTimeString() : 'none since reset'}</span>
      </div>
      {(appState.config ?? fetchedConfig) && <div className="home-backend-baseline">{usingMock ? 'Mock thresholds' : 'Backend thresholds'}: grace {(appState.config ?? fetchedConfig)!.grace_period_seconds}s · quiet gap {homeUnit?.quiet_gap.usual_max_seconds ?? '—'}s · outing {homeUnit?.baseline.usual_outing_seconds ?? '—'}s</div>}
      {scenario === 'unusualInactivity' && <div className="home-backend-baseline">Backend status: {homeUnit?.status ?? 'unavailable'} · Incident: {appState.incidents.find(item => item.incident_id === homeUnit?.active_incident_id)?.state ?? 'none'}</div>}
      {queuedCalls.length > 0 && <div className="home-backend-baseline">{queuedCalls.length} companion call{queuedCalls.length > 1 ? 's' : ''} queued until Madam Lee is available.</div>}
      {integrationError && scenarioState !== 'stopped' && <p className="home-integration-error" role="alert">{integrationError}</p>}
      <p className="home-privacy">3D simulation for demonstration only. TemanMu receives only water, electricity and door data.</p>
    </div>
    </aside>
  </section>
}
