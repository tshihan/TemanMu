import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AnimationMixer, Group, MathUtils, type AnimationAction, type Bone } from 'three'
import { ROOM_LABELS, WAYPOINTS, routeBetween, type RoomId, type Waypoint } from './navigation'
import { interactionSpot, type InteractionId, type PhoneSpot } from '../interactions/registry'
import { disposeAvatar, inPlace, prepareAvatar, rocketboxLoader } from './rocketbox'

export type CharacterAnimation = 'rest' | 'wake' | 'collapse' | 'recover'
export type CharacterCommand = { destination: Waypoint | InteractionId | CharacterAnimation | 'reset' | 'resetInBed' | 'resetAtDoor' | 'stop'; id: number; kind?: 'move' | 'interact' | 'animate'; approach?: Waypoint }
export type CharacterStatus = { room: RoomId; destination: Waypoint | null; phase: 'loading' | 'idle' | 'walking' | 'interacting' | 'error' }
export type InteractionPose = 'none' | 'reach' | 'phone'

const ASSET_ROOT = '/models/madam-lee/'
const WALK_SPEED = 1 // metres per second: brisk enough for a short presentation
const WALK_ANIMATION_SPEED = 1.4 // match the quicker translation to the avatar's gait
const URGENT_WALK_MULTIPLIER = 1.6
const TURN_SPEED = 3.1 // radians per second
// About 1.52 m: shorter than the source avatar, as befits a resident in her late seventies.
const MUM_SCALE = .00875
const HIP_HEIGHT = 92 * MUM_SCALE // pelvis above her soles, standing
const LEG_LENGTH = 83 * MUM_SCALE // hip to sole, in metres
const FALL_PIVOT = .14 // her left knee, where she meets the floor as she topples sideways
const FALL_REST_HEIGHT = .04 // lifts her lying body clear of the floor

// Getting in or out of bed she stands at the bedside with her back to the bed. In that frame the bed lies
// behind her (-z) and its head to her left (+x); these are where her pelvis rests on the right-hand side.
const BED_FACING = Math.PI / 2
const BED_LYING: [number, number, number] = [.4, .9, -.86]
const BED_EDGE: [number, number, number] = [.15, .93, -.42]

type PoseBones = Record<'spine' | 'spine1' | 'neck' | 'lThigh' | 'rThigh' | 'lCalf' | 'rCalf' | 'lUpper' | 'rUpper' | 'lFore' | 'rFore', Bone>
type BoneOffsets = Partial<Record<keyof PoseBones, { y?: number; z: number }>>
type BodyPose = { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number; idleSpeed: number; bones: BoneOffsets }
const POSE_BONE_NAMES: Record<keyof PoseBones, string> = {
  spine: 'Bip01_Spine', spine1: 'Bip01_Spine1', neck: 'Bip01_Neck',
  lThigh: 'Bip01_L_Thigh', rThigh: 'Bip01_R_Thigh', lCalf: 'Bip01_L_Calf', rCalf: 'Bip01_R_Calf',
  lUpper: 'Bip01_L_UpperArm', rUpper: 'Bip01_R_UpperArm', lFore: 'Bip01_L_Forearm', rFore: 'Bip01_R_Forearm',
}
const span = (t: number, from: number, to: number) => MathUtils.clamp((t - from) / (to - from), 0, 1)
const ease = (s: number) => s * s * (3 - 2 * s)

/**
 * Bed pose at inBed (1 lying on her back, head on the pillow; 0 standing at the bedside): getting up, she sits up,
 * swings her legs over the edge, then slides forward onto her feet. Lying down plays the same path backwards.
 */
function bedPose(inBed: number): BodyPose {
  const w = 1 - inBed
  const sit = ease(span(w, 0, .32)), swing = ease(span(w, .3, .62)), stand = ease(span(w, .6, 1))
  const rise = ease(span(w, .72, 1)) // her legs straighten only once her weight is over her feet
  const lerp = MathUtils.lerp
  const px = lerp(lerp(BED_LYING[0], BED_EDGE[0], swing), 0, stand)
  const py = lerp(lerp(BED_LYING[1], BED_EDGE[1], sit), HIP_HEIGHT, stand)
  const pz = lerp(lerp(BED_LYING[2], BED_EDGE[2], swing), 0, stand)
  const pitch = -Math.PI / 2 * (1 - sit), yaw = -Math.PI / 2 * (1 - swing)
  const hip = Math.PI / 2 * sit - (Math.PI / 2 - 1) * swing - rise
  const knee = -.75 * (swing - rise)
  // Offset the group so her pelvis, rather than her feet, follows the path.
  return {
    x: px - HIP_HEIGHT * Math.sin(pitch) * Math.sin(yaw), y: py - HIP_HEIGHT * Math.cos(pitch), z: pz - HIP_HEIGHT * Math.sin(pitch) * Math.cos(yaw),
    rotX: pitch, rotY: yaw, rotZ: 0, idleSpeed: stand,
    bones: {
      lThigh: { z: hip }, rThigh: { z: hip }, lCalf: { z: knee }, rCalf: { z: knee },
      // She leans forward to sit up and again to rise off the edge.
      spine: { z: .25 * Math.sin(Math.PI * sit) + .1 * sit * (1 - stand) + .45 * Math.sin(Math.PI * stand) },
      neck: { z: .1 * sit * (1 - stand) },
    },
  }
}

/**
 * Collapse pose at progress p (0 standing, 1 lying on her left side): a dizzy sway, the knees give way,
 * then she topples sideways with gravity and settles curled on the floor. Recovery plays it back smoothly.
 */
function fallPose(p: number, falling: boolean, elapsed: number): BodyPose {
  const sway = ease(span(p, 0, .15)) * (1 - span(p, .3, .45))
  const buckle = ease(span(p, .12, .45))
  const tipping = span(p, .4, .72)
  const tip = falling ? tipping * tipping : ease(tipping) // gravity accelerates the fall; getting up does not
  const limp = ease(span(p, .62, .92))
  const impact = falling ? span(p, .72, .86) : 0
  const hip = 1.05 * buckle - .35 * limp
  const angle = -Math.PI / 2 * tip
  // Knees bent this far, she sinks by the leg's lost height; then she rotates about the left knee.
  const sunk = LEG_LENGTH * (1 - Math.cos(hip)) * (1 - tip)
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const x = FALL_PIVOT - FALL_PIVOT * cos + sunk * sin
  const y = -FALL_PIVOT * sin - sunk * cos + FALL_REST_HEIGHT * tip + Math.sin(Math.PI * impact) * .035 * (1 - impact)
  return {
    x, y, z: 0, rotX: 0, rotY: 0, rotZ: angle, idleSpeed: 1 - ease(span(p, .35, .7)),
    bones: {
      spine: { y: Math.sin(elapsed * 7) * .09 * sway - .12 * limp, z: .3 * buckle + .15 * limp },
      spine1: { z: .15 * buckle },
      neck: { y: -.3 * limp, z: .35 * buckle - .1 * limp },
      lThigh: { z: hip }, rThigh: { z: hip + .2 * limp },
      lCalf: { z: -1.95 * buckle + .65 * limp }, rCalf: { z: -1.95 * buckle + .45 * limp },
      // Right hand to her chest as she feels faint; left arm flung out to catch herself, then both fall slack.
      lUpper: { y: -.6 * tip * (1 - limp), z: -.7 * tip },
      lFore: { z: -.4 * tip * (1 - limp) },
      rUpper: { z: -.9 * sway * (1 - tip) - .8 * limp },
      rFore: { z: -1.5 * sway * (1 - tip) - .5 * limp },
    },
  }
}

function placeBody(group: Group, body: BodyPose | null) {
  group.position.set(body?.x ?? 0, body?.y ?? 0, body?.z ?? 0)
  group.rotation.set(body?.rotX ?? 0, body?.rotY ?? 0, body?.rotZ ?? 0, 'YXZ')
}

/** Self-contained actor: loaded once, animated in the render loop, navigated on authored clear paths. */
export function ElderlyCharacter({ command, pose, speech, visible, paused, urgent, phoneSpot, onStatus, onReached, onArrived, onAnimationComplete }: {
  command: CharacterCommand; pose: InteractionPose; speech: string | null; visible: boolean; paused: boolean; urgent: boolean; phoneSpot?: PhoneSpot
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
  const bedState = useRef(0)
  const fallProgress = useRef(0)
  const poseBones = useRef<PoseBones | null>(null)
  const appliedBones = useRef<BoneOffsets>({})
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
      const bones = Object.fromEntries(Object.entries(POSE_BONE_NAMES).map(([key, name]) => [key, avatar.getObjectByName(name)]))
      if (Object.values(bones).every(Boolean)) poseBones.current = bones as PoseBones
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
    if (command.destination === 'reset' || command.destination === 'resetInBed' || command.destination === 'resetAtDoor') {
      // resetInBed starts her already lying down at the bedside, the end state of the 'rest' animation.
      // resetAtDoor starts her by the entrance, facing the door, for the outing scenarios.
      const inBed = command.destination === 'resetInBed'
      const atDoor = command.destination === 'resetAtDoor'
      const start = inBed ? 'bedside' : atDoor ? 'entryLane' : 'bedroom'
      const room: RoomId = atDoor ? 'dining' : 'bedroom'
      queue.current = []
      pausedNext.current = null
      interaction.current = null
      motion.current = null
      bedState.current = inBed ? 1 : 0
      fallProgress.current = 0
      anchor.current = start
      lastRoom.current = room
      destination.current = null
      shell.current.position.set(WAYPOINTS[start][0], .045, WAYPOINTS[start][1])
      shell.current.rotation.y = inBed ? BED_FACING : 0
      if (poseGroup.current) placeBody(poseGroup.current, inBed ? bedPose(1) : null)
      onStatus({ room, destination: null, phase: 'idle' })
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
    const targetWaypoint = target ? command.approach ?? interactionSpot(target, phoneSpot).approach : command.destination as Waypoint
    const next = queue.current[0] ?? pausedNext.current ?? anchor.current
    const remaining = routeBetween(next, targetWaypoint)
    queue.current = next === anchor.current ? remaining : [next, ...remaining]
    pausedNext.current = null
    interaction.current = target ? { id: command.id, target } : null
    destination.current = target ? interactionSpot(target, phoneSpot).room : targetWaypoint
    moveCommandId.current = command.id
    if (!queue.current.length) {
      if (target) onStatus({ room: interactionSpot(target, phoneSpot).room, destination: null, phase: 'interacting' })
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
  }, [command, invalidate, onStatus, onArrived, urgent, phoneSpot])

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
          else if (arrived === 'outside' || arrived === 'porch' || arrived === 'corridor' || arrived === 'lobby') lastRoom.current = 'mainDoor'
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
      const [x, z] = interactionSpot(pending.target, phoneSpot).target
      const desired = Math.atan2(x - shellGroup.position.x, z - shellGroup.position.z)
      const difference = Math.atan2(Math.sin(desired - shellGroup.rotation.y), Math.cos(desired - shellGroup.rotation.y))
      shellGroup.rotation.y += MathUtils.clamp(difference, -TURN_SPEED * frame, TURN_SPEED * frame)
      if (Math.abs(difference) < .05) {
        interaction.current = null
        lastRoom.current = interactionSpot(pending.target, phoneSpot).room
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
        // Turn her back to the bed by the shorter way round, then sit and lie down.
        const turn = Math.atan2(Math.sin(BED_FACING - shellGroup.rotation.y), Math.cos(BED_FACING - shellGroup.rotation.y))
        shellGroup.rotation.y = MathUtils.damp(shellGroup.rotation.y, shellGroup.rotation.y + turn, 7, frame)
        bedState.current = t
      }
      if (current.kind === 'wake') bedState.current = 1 - t
      if (current.kind === 'collapse') {
        fallProgress.current = t
        shellGroup.rotation.y = MathUtils.damp(shellGroup.rotation.y, 0, 3, frame)
      }
      if (current.kind === 'recover') fallProgress.current = 1 - smooth
      if (t === 1) {
        motion.current = null
        onAnimationComplete(current.id, current.kind)
        onStatus({ room: lastRoom.current, destination: null, phase: 'idle' })
      }
    }
    const body = bedState.current > 0 ? bedPose(bedState.current)
      : fallProgress.current > 0 ? fallPose(fallProgress.current, motion.current?.kind !== 'recover', motion.current?.elapsed ?? 0) : null
    if (poseGroup.current) placeBody(poseGroup.current, body)
    animation.walk.timeScale = WALK_ANIMATION_SPEED * (urgent ? URGENT_WALK_MULTIPLIER : 1)
    animation.idle.timeScale = body?.idleSpeed ?? 1 // lying still, the idle clip freezes
    // The mixer skips writing bones whose animated value is unchanged, so last frame's offsets must be undone
    // before it runs; otherwise a frozen clip lets them pile up and she jitters on the floor.
    const bones = poseBones.current
    if (bones) for (const [key, offset] of Object.entries(appliedBones.current) as [keyof PoseBones, { y?: number; z: number }][]) {
      bones[key].rotation.y -= offset.y ?? 0
      bones[key].rotation.z -= offset.z
    }
    appliedBones.current = {}
    mixer.current?.update(frame)
    if (body && bones) {
      for (const [key, offset] of Object.entries(body.bones) as [keyof PoseBones, { y?: number; z: number }][]) {
        bones[key].rotation.y += offset.y ?? 0
        bones[key].rotation.z += offset.z
      }
      appliedBones.current = body.bones
    }

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
