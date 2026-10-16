import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AnimationClip, AnimationMixer, Group, LoadingManager, MathUtils, type AnimationAction, type Bone, type SkinnedMesh, type Texture } from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { ROOM_LABELS, WAYPOINTS, routeBetween, type RoomId, type Waypoint } from './navigation'
import { INTERACTIONS, type InteractionId } from '../interactions/registry'

export type CharacterAnimation = 'rest' | 'wake' | 'collapse' | 'recover'
export type CharacterCommand = { destination: Waypoint | InteractionId | CharacterAnimation | 'reset' | 'stop'; id: number; kind?: 'move' | 'interact' | 'animate'; approach?: Waypoint }
export type CharacterStatus = { room: RoomId; destination: Waypoint | null; phase: 'loading' | 'idle' | 'walking' | 'interacting' | 'error' }
export type InteractionPose = 'none' | 'reach' | 'phone'

const ASSET_ROOT = '/models/madam-lee/'
const WALK_SPEED = .57 // metres per second: deliberately unhurried
const TURN_SPEED = 2.4 // radians per second

function inPlace(clip: AnimationClip) {
  const copy = clip.clone()
  // Rocketbox clips animate the Biped root in world space. Keep the vertical
  // gait, but let our waypoint controller own horizontal movement.
  const root = copy.tracks.find(track => track.name === 'Bip01.position')
  if (root) {
    const values = root.values
    for (let index = 0; index < values.length; index += 3) {
      values[index] = values[0]
      values[index + 2] = values[2]
    }
  }
  return copy
}

function disposeAvatar(group: Group) {
  group.traverse(object => {
    if ('isMesh' in object && object.isMesh) {
      const mesh = object as SkinnedMesh
      mesh.geometry.dispose()
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const maps = material as typeof material & Partial<Record<'map' | 'normalMap' | 'specularMap' | 'alphaMap', Texture>>
        for (const key of ['map', 'normalMap', 'specularMap', 'alphaMap'] as const) {
          maps[key]?.dispose()
        }
        material.dispose()
      }
    }
  })
}

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
    const manager = new LoadingManager()
    manager.setURLModifier(url => {
      const file = decodeURIComponent(url).split(/[\\/]/).pop() || ''
      const aged = file === 'f003_head_color.tga' || file === 'f003_opacity_color.tga'
      return file.toLowerCase().endsWith('.tga')
        ? `${ASSET_ROOT}textures/${file.slice(0, -4)}${aged ? '_aged' : ''}.webp` : url
    })
    const loader = new FBXLoader(manager)
    Promise.all([
      loader.loadAsync(`${ASSET_ROOT}model.fbx`),
      loader.loadAsync(`${ASSET_ROOT}idle.fbx`),
      loader.loadAsync(`${ASSET_ROOT}walk.fbx`),
    ]).then(([avatar, idleFile, walkFile]) => {
      loaded = avatar
      if (!active) { disposeAvatar(avatar); return }
      avatar.scale.setScalar(.0095) // Rocketbox centimetres -> house metres; about 1.65 m tall
      avatar.traverse(object => {
        if ('isSkinnedMesh' in object && object.isSkinnedMesh) {
          const mesh = object as SkinnedMesh
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.frustumCulled = false
          // FBXLoader reads zero diffuse values from this source FBX. White
          // allows its supplied colour textures to show under house lighting.
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if ('color' in material) (material.color as { set: (value: string) => void }).set('#ffffff')
          }
        }
      })
      const upper = avatar.getObjectByName('Bip01 R UpperArm')
      const lower = avatar.getObjectByName('Bip01 R Forearm')
      if (upper && lower) arm.current = { upper: upper as Bone, lower: lower as Bone }
      animationMixer = new AnimationMixer(avatar)
      const idle = animationMixer.clipAction(inPlace(idleFile.animations[0]))
      const walk = animationMixer.clipAction(inPlace(walkFile.animations[0]))
      walk.timeScale = .8
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
    if (command.destination === 'reset') {
      queue.current = []
      pausedNext.current = null
      interaction.current = null
      motion.current = null
      restPose.current = 0
      fallPose.current = 0
      anchor.current = 'bedroom'
      lastRoom.current = 'bedroom'
      destination.current = null
      shell.current.position.set(WAYPOINTS.bedroom[0], .045, WAYPOINTS.bedroom[1])
      shell.current.rotation.y = 0
      if (poseGroup.current) { poseGroup.current.position.set(0, 0, 0); poseGroup.current.rotation.set(0, 0, 0) }
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
        const step = Math.min(remaining, WALK_SPEED * (urgent ? 2.4 : 1) * frame)
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
      poseGroup.current.position.set(-1.4 * rest, .82 * rest + .23 * fall, .28 * rest)
      poseGroup.current.rotation.set(-Math.PI / 2 * rest, 0, -Math.PI / 2 * fall)
      if (motion.current?.kind === 'collapse' && motion.current.elapsed < .7)
        poseGroup.current.rotation.z += Math.sin(motion.current.elapsed * 16) * .07 * (1 - motion.current.elapsed / .7)
    }
    animation.walk.timeScale = urgent ? 1.9 : .8
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
    {speech && <Html position={[0, 1.9, 0]} center style={{ pointerEvents: 'none' }}><span className="home-character-speech">“{speech}”</span></Html>}
  </group>
}
