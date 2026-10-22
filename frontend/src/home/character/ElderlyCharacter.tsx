import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AnimationMixer, Group, MathUtils, type AnimationAction, type Bone } from 'three'
import { ROOM_LABELS, WAYPOINTS, routeBetween, type RoomId, type Waypoint } from './navigation'
import { INTERACTIONS, type InteractionId } from '../interactions/registry'
import { ROCKETBOX_SCALE, disposeAvatar, inPlace, prepareAvatar, rocketboxLoader } from './rocketbox'

export type CharacterAnimation = 'rest' | 'wake' | 'collapse' | 'recover'
export type CharacterCommand = { destination: Waypoint | InteractionId | CharacterAnimation | 'reset' | 'resetInBed' | 'stop'; id: number; kind?: 'move' | 'interact' | 'animate'; approach?: Waypoint }
export type CharacterStatus = { room: RoomId; destination: Waypoint | null; phase: 'loading' | 'idle' | 'walking' | 'interacting' | 'error' }
export type InteractionPose = 'none' | 'reach' | 'phone'

const ASSET_ROOT = '/models/madam-lee/'
const WALK_SPEED = 1 // metres per second: brisk enough for a short presentation
const WALK_ANIMATION_SPEED = 1.4 // match the quicker translation to the avatar's gait
const URGENT_WALK_MULTIPLIER = 1.6
const TURN_SPEED = 3.1 // radians per second
// About 1.52 m: shorter than the source avatar, as befits a resident in her late seventies.
const MUM_SCALE = .00875
// Lying in bed, the avatar pivots at her feet; slide her so her head stays on the pillow.
const BED_HEAD_OFFSET = .28 - (ROCKETBOX_SCALE - MUM_SCALE) * 174

/** Self-contained actor: loaded once, animated in the render loop, navigated on authored clear paths. */
export function ElderlyCharacter({ command, pose, speech, visible, paused, urgent, onStatus, onReached, onArrived, onAnimationComplete }: {
  command: CharacterCommand; pose: InteractionPose; speech: string | null; visible: boolean; paused: boolean; urgent: boolean
  onStatus: (status: CharacterStatus) => void; onReached: (id: number, target: InteractionId) => void
  onArrived: (id: number, target: Waypoint) => void; onAnimationComplete: (id: number, animation: CharacterAnimation) => void
}) {
  const shell = useRef<Group>(null)
  const poseGroup = useRef<Group>(null)
  const [model, setModel] = useState<Group | null>(null)
  const mixer = useRef<AnimationMixer | null>(null)
  const actions = useRef<{ idle: AnimationAction; walk: AnimationAction } | null>(null)
  const gait = useRef<'idle' | 'walk'>('idle')
  const queue = useRef<Waypoint[]>([])
  const anchor = useRef<Waypoint>('bedroom')
  const destination = useRef<Waypoint | null>(null)
  const moveCommandId = useRef(0)
  const handledCommandId = useRef(0)
  const interaction = useRef<{ id: number; target: InteractionId } | null>(null)
  const pausedNext = useRef<Waypoint | null>(null)
  const lastRoom = useRef<RoomId>('bedroom')
  const reachStrength = useRef(0)
  const arm = useRef<{ upper: Bone; lower: Bone } | null>(null)
  const motion = useRef<{ id: number; kind: CharacterAnimation; elapsed: number; duration: number } | null>(null)
  const restPose = useRef(0)
  const fallPose = useRef(0)
  const { invalidate } = useThree()
  useEffect(() => { if (!paused) invalidate() }, [paused, invalidate])

  useEffect(() => {
    let active = true
    let loaded: Group | null = null
    let animationMixer: AnimationMixer | null = null
    const loader = rocketboxLoader(ASSET_ROOT, stem => stem === 'f003_head_color' || stem === 'f003_opacity_color' ? `${stem}_aged` : stem)
    Promise.all([
      loader.loadAsync(`${ASSET_ROOT}model.fbx`),
      loader.loadAsync(`${ASSET_ROOT}idle.fbx`),
      loader.loadAsync(`${ASSET_ROOT}walk.fbx`),
    ]).then(([avatar, idleFile, walkFile]) => {
      loaded = avatar
      if (!active) { disposeAvatar(avatar); return }
      prepareAvatar(avatar, MUM_SCALE)
      const upper = avatar.getObjectByName('Bip01 R UpperArm')
      const lower = avatar.getObjectByName('Bip01 R Forearm')
      if (upper && lower) arm.current = { upper: upper as Bone, lower: lower as Bone }
      animationMixer = new AnimationMixer(avatar)
      const idle = animationMixer.clipAction(inPlace(idleFile.animations[0]))
      const walk = animationMixer.clipAction(inPlace(walkFile.animations[0]))
      walk.timeScale = WALK_ANIMATION_SPEED
      idle.play()
      actions.current = { idle, walk }
      mixer.current = animationMixer
      setModel(avatar)
      onStatus({ room: anchor.current as RoomId, destination: null, phase: 'idle' })
      invalidate()
    }).catch(error => {
      console.error('Could not load Madam Lee model or animations', error)
      if (active) onStatus({ room: anchor.current as RoomId, destination: null, phase: 'error' })
    })
    return () => {
      active = false
      animationMixer?.stopAllAction()
      if (loaded) {
        animationMixer?.uncacheRoot(loaded)
        disposeAvatar(loaded)
      }
    }
  }, [invalidate, onStatus])

  useEffect(() => {
    if (command.id === 0 || command.id === handledCommandId.current || !shell.current) return
    handledCommandId.current = command.id
    if (command.destination === 'reset' || command.destination === 'resetInBed') {
      // resetInBed starts her already lying down at the bedside, the end state of the 'rest' animation.
      const inBed = command.destination === 'resetInBed'
      const start = inBed ? 'bedside' : 'bedroom'
      queue.current = []
      pausedNext.current = null
      interaction.current = null
      motion.current = null
      restPose.current = inBed ? 1 : 0
      fallPose.current = 0
      anchor.current = start
      lastRoom.current = 'bedroom'
      destination.current = null
      shell.current.position.set(WAYPOINTS[start][0], .045, WAYPOINTS[start][1])
      shell.current.rotation.y = 0
      if (poseGroup.current) {
        if (inBed) { poseGroup.current.position.set(-1.4, .82, BED_HEAD_OFFSET); poseGroup.current.rotation.set(-Math.PI / 2, 0, 0) }
        else { poseGroup.current.position.set(0, 0, 0); poseGroup.current.rotation.set(0, 0, 0) }
      }
      onStatus({ room: 'bedroom', destination: null, phase: 'idle' })
      invalidate()
      return
    }
    if (command.destination === 'stop') {
      pausedNext.current = queue.current[0] ?? pausedNext.current
      queue.current = []
      interaction.current = null
      motion.current = null
      destination.current = null
      onStatus({ room: lastRoom.current, destination: null, phase: 'idle' })
      invalidate()
      return
    }
    if (command.kind === 'animate') {
      const kind = command.destination as CharacterAnimation
      queue.current = []
      pausedNext.current = null
      interaction.current = null
      destination.current = null
      motion.current = { id: command.id, kind, elapsed: 0, duration: kind === 'collapse' ? 3.1 : kind === 'recover' ? (urgent ? 2.2 : 3.2) : 2.2 }
      onStatus({ room: lastRoom.current, destination: null, phase: 'interacting' })
      invalidate()
      return
    }
    const target = command.kind === 'interact' ? command.destination as InteractionId : null
    const targetWaypoint = target ? command.approach ?? INTERACTIONS[target].approach : command.destination as Waypoint
    const next = queue.current[0] ?? pausedNext.current ?? anchor.current
    const remaining = routeBetween(next, targetWaypoint)
    queue.current = next === anchor.current ? remaining : [next, ...remaining]
    pausedNext.current = null
    interaction.current = target ? { id: command.id, target } : null
    destination.current = target ? INTERACTIONS[target].room : targetWaypoint
    moveCommandId.current = command.id
    if (!queue.current.length) {
      if (target) onStatus({ room: INTERACTIONS[target].room, destination: null, phase: 'interacting' })
      else {
        if (targetWaypoint in ROOM_LABELS) lastRoom.current = targetWaypoint as RoomId
        destination.current = null
        onStatus({ room: lastRoom.current, destination: null, phase: 'idle' })
        onArrived(command.id, targetWaypoint)
      }
    } else {
      onStatus({ room: lastRoom.current, destination: destination.current, phase: 'walking' })
    }
    invalidate()
  }, [command, invalidate, onStatus, onArrived, urgent])

  useFrame((_, delta) => {
    const shellGroup = shell.current
    const animation = actions.current
    if (!shellGroup || !animation) return
    if (paused) return
    const frame = Math.min(delta, .05)
    const next = queue.current[0]
    if (next && !motion.current) {
      if (gait.current !== 'walk') {
        animation.walk.reset().play()
        animation.idle.crossFadeTo(animation.walk, .35, false)
        gait.current = 'walk'
      }
      const [x, z] = WAYPOINTS[next]
      const dx = x - shellGroup.position.x
      const dz = z - shellGroup.position.z
      const desired = Math.atan2(dx, dz) // source avatar faces local +Z
      const difference = Math.atan2(Math.sin(desired - shellGroup.rotation.y), Math.cos(desired - shellGroup.rotation.y))
      shellGroup.rotation.y += MathUtils.clamp(difference, -TURN_SPEED * frame, TURN_SPEED * frame)
      const remaining = Math.hypot(dx, dz)
      if (Math.abs(difference) < .42) {
        const step = Math.min(remaining, WALK_SPEED * (urgent ? URGENT_WALK_MULTIPLIER : 1) * frame)
        if (remaining > 0) {
          shellGroup.position.x += dx / remaining * step
          shellGroup.position.z += dz / remaining * step
        }
      }
      if (Math.hypot(x - shellGroup.position.x, z - shellGroup.position.z) < .025) {
        shellGroup.position.x = x
        shellGroup.position.z = z
        anchor.current = next
        queue.current.shift()
        if (!queue.current.length && !interaction.current) {
          const arrived = destination.current
          destination.current = null
          if (arrived && arrived in ROOM_LABELS) lastRoom.current = arrived as RoomId
          else if (arrived === 'bedside') lastRoom.current = 'bedroom'
          else if (arrived === 'collapseSpot') lastRoom.current = 'living'
          else if (arrived === 'outside' || arrived === 'porch') lastRoom.current = 'mainDoor'
          onStatus({ room: lastRoom.current, destination: null, phase: 'idle' })
          if (arrived) onArrived(moveCommandId.current, arrived)
        }
      }
    } else if (gait.current !== 'idle') {
      animation.idle.reset().play()
      animation.walk.crossFadeTo(animation.idle, .4, false)
      gait.current = 'idle'
    }
    if (!queue.current.length && interaction.current) {
      const pending = interaction.current
      const [x, z] = INTERACTIONS[pending.target].target
      const desired = Math.atan2(x - shellGroup.position.x, z - shellGroup.position.z)
      const difference = Math.atan2(Math.sin(desired - shellGroup.rotation.y), Math.cos(desired - shellGroup.rotation.y))
      shellGroup.rotation.y += MathUtils.clamp(difference, -TURN_SPEED * frame, TURN_SPEED * frame)
      if (Math.abs(difference) < .05) {
        interaction.current = null
        lastRoom.current = INTERACTIONS[pending.target].room
        destination.current = null
        onReached(pending.id, pending.target)
        onStatus({ room: lastRoom.current, destination: null, phase: 'interacting' })
      }
    }
    if (motion.current) {
      const current = motion.current
      current.elapsed += frame
      const t = Math.min(1, current.elapsed / current.duration)
      const smooth = t * t * (3 - 2 * t)
      if (current.kind === 'rest') {
        shellGroup.rotation.y = MathUtils.damp(shellGroup.rotation.y, 0, 7, frame)
        const settling = Math.max(0, (t - .3) / .7)
        restPose.current = settling * settling * (3 - 2 * settling)
      }
      if (current.kind === 'wake') restPose.current = 1 - smooth
      if (current.kind === 'collapse') {
        const falling = Math.max(0, (t - .22) / .78)
        fallPose.current = falling * falling * (3 - 2 * falling)
        shellGroup.rotation.y = MathUtils.damp(shellGroup.rotation.y, 0, 3, frame)
      }
      if (current.kind === 'recover') fallPose.current = 1 - smooth
      if (t === 1) {
        motion.current = null
        onAnimationComplete(current.id, current.kind)
        onStatus({ room: lastRoom.current, destination: null, phase: 'idle' })
      }
    }
    if (poseGroup.current) {
      const rest = restPose.current, fall = fallPose.current
      poseGroup.current.position.set(-1.4 * rest, .82 * rest + .23 * fall, BED_HEAD_OFFSET * rest)
      poseGroup.current.rotation.set(-Math.PI / 2 * rest, 0, -Math.PI / 2 * fall)
      if (motion.current?.kind === 'collapse' && motion.current.elapsed < .7)
        poseGroup.current.rotation.z += Math.sin(motion.current.elapsed * 16) * .07 * (1 - motion.current.elapsed / .7)
    }
    animation.walk.timeScale = WALK_ANIMATION_SPEED * (urgent ? URGENT_WALK_MULTIPLIER : 1)
    if (fallPose.current < .99) mixer.current?.update(frame)
    reachStrength.current = MathUtils.damp(reachStrength.current, pose === 'none' ? 0 : 1, 6, frame)
    if (arm.current) {
      const { upper, lower } = arm.current
      const amount = reachStrength.current
      upper.rotation.x -= (pose === 'phone' ? .62 : .42) * amount
      upper.rotation.z -= (pose === 'phone' ? .5 : .27) * amount
      lower.rotation.x -= (pose === 'phone' ? .9 : .58) * amount
    }
    invalidate() // idle breathing and gait remain visible with the demand-driven house canvas
  })

  return <group ref={shell} name="madam-lee-mei-ling" visible={visible} position={[WAYPOINTS.bedroom[0], .045, WAYPOINTS.bedroom[1]]}>
    <group ref={poseGroup}>{model && <primitive object={model} />}</group>
    {speech && <Html position={[0, 1.78, 0]} center style={{ pointerEvents: 'none' }}><span className="home-character-speech">“{speech}”</span></Html>}
  </group>
}
