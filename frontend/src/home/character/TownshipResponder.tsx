import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AnimationMixer, Group, MathUtils, Quaternion, Vector3, type AnimationAction, type Object3D } from 'three'
import { WAYPOINTS, routeBetween, type Waypoint } from './navigation'
import { ROCKETBOX_SCALE, disposeAvatar, inPlace, prepareAvatar, rocketboxLoader } from './rocketbox'

// catchUp: seconds to make up on this walk (after a knock), so the whole visit keeps its length.
export type ResponderCommand = { id: number; destination: Waypoint | 'reset'; catchUp?: number }
type Gait = 'idle' | 'walk' | 'crouch'

const ASSET_ROOT = '/models/guard-ali/'
const WALK_SPEED = 1.4 // metres per second: a purposeful walk to a welfare check
const WALK_ANIMATION_SPEED = 1.45 // the source clip covers about 0.96 m/s
const MAX_WALK_SPEED = 2.4 // a hurried walk, used only to make up for the knock
const TURN_SPEED = 4 // radians per second
// The front door is on the -z side of the porch.
const DOOR_HEADING = Math.PI
// Seconds into the knock when each rap lands; the soundscape's knock cue uses the same times.
const KNOCK_RAPS = [.3, .55, .8]
const scratch = { a: new Vector3(), b: new Vector3(), q: new Quaternion(), world: new Quaternion(), parent: new Quaternion() }

/** Turn `bone` so the direction from it to `child` points along world `target`, blended by `amount`. */
function aimBone(bone: Object3D, child: Object3D, target: Vector3, amount: number) {
  const from = bone.getWorldPosition(scratch.a)
  const current = child.getWorldPosition(scratch.b).sub(from).normalize()
  const turn = scratch.q.setFromUnitVectors(current, target)
  const wanted = turn.multiply(bone.getWorldQuaternion(scratch.world))
  const local = bone.parent!.getWorldQuaternion(scratch.parent).invert().multiply(wanted)
  bone.quaternion.slerp(local, amount)
}
// Madam Lee falls along the x axis; kneel square to her, facing across her chest.
const CHECK_HEADING = Math.atan2(0, WAYPOINTS.collapseSpot[1] - WAYPOINTS.responderCheck[1])

/** Presenter-only reenactment of Guard Ali. No pose or movement here is a sensor event. */
export function TownshipResponder({ command, visible, checking, knocking, note, paused, onArrived }: {
  command: ResponderCommand
  visible: boolean
  checking: boolean
  knocking: boolean
  // Overrides the label suffix, e.g. a home check with nobody inside.
  note?: string | null
  paused: boolean
  onArrived: (id: number) => void
}) {
  const root = useRef<Group>(null)
  const [model, setModel] = useState<Group | null>(null)
  const mixer = useRef<AnimationMixer | null>(null)
  const actions = useRef<Record<Gait, AnimationAction> | null>(null)
  const gait = useRef<Gait>('idle')
  const at = useRef<Waypoint>('outside')
  const route = useRef<Waypoint[]>([])
  const speed = useRef(WALK_SPEED)
  const arm = useRef<{ upper: Object3D; lower: Object3D; hand: Object3D } | null>(null)
  const knockRaise = useRef(0)
  const knockTime = useRef(0)
  // Clip pose of the arm before the knock is layered on, restored before the mixer runs each frame.
  const armBase = useRef<{ upper: Quaternion; lower: Quaternion } | null>(null)
  const activeCommand = useRef(0)
  const { invalidate } = useThree()
  useEffect(() => { if (!paused && visible) invalidate() }, [paused, visible, invalidate])

  useEffect(() => {
    let active = true
    let loaded: Group | null = null
    let animationMixer: AnimationMixer | null = null
    const loader = rocketboxLoader(ASSET_ROOT)
    Promise.all([
      loader.loadAsync(`${ASSET_ROOT}model.fbx`),
      loader.loadAsync(`${ASSET_ROOT}idle.fbx`),
      loader.loadAsync(`${ASSET_ROOT}walk.fbx`),
      loader.loadAsync(`${ASSET_ROOT}crouch.fbx`),
    ]).then(([avatar, idleFile, walkFile, crouchFile]) => {
      loaded = avatar
      if (!active) { disposeAvatar(avatar); return }
      prepareAvatar(avatar, ROCKETBOX_SCALE) // about 1.74 m including his cap
      const upper = avatar.getObjectByName('Bip01_R_UpperArm')
      const lower = avatar.getObjectByName('Bip01_R_Forearm')
      const hand = avatar.getObjectByName('Bip01_R_Hand')
      if (upper && lower && hand) arm.current = { upper, lower, hand }
      animationMixer = new AnimationMixer(avatar)
      const idle = animationMixer.clipAction(inPlace(idleFile.animations[0]))
      const walk = animationMixer.clipAction(inPlace(walkFile.animations[0]))
      const crouch = animationMixer.clipAction(inPlace(crouchFile.animations[0]))
      walk.timeScale = WALK_ANIMATION_SPEED
      idle.play()
      actions.current = { idle, walk, crouch }
      mixer.current = animationMixer
      setModel(avatar)
      invalidate()
    }).catch(error => console.error('Could not load Guard Ali model or animations', error))
    return () => {
      active = false
      animationMixer?.stopAllAction()
      if (loaded) {
        animationMixer?.uncacheRoot(loaded)
        disposeAvatar(loaded)
      }
    }
  }, [invalidate])

  useEffect(() => {
    if (command.id === activeCommand.current || !root.current) return
    activeCommand.current = command.id
    if (command.destination === 'reset') {
      route.current = []
      at.current = 'outside'
      root.current.position.set(WAYPOINTS.outside[0], .05, WAYPOINTS.outside[1])
      root.current.rotation.y = Math.PI
      return
    }
    route.current = routeBetween(at.current, command.destination)
    let length = 0
    let [px, pz] = [root.current.position.x, root.current.position.z]
    for (const point of route.current) {
      const [x, z] = WAYPOINTS[point]
      length += Math.hypot(x - px, z - pz);
      [px, pz] = [x, z]
    }
    const usual = length / WALK_SPEED
    const target = Math.max(usual - (command.catchUp ?? 0), length / MAX_WALK_SPEED)
    speed.current = target > 0 ? length / target : WALK_SPEED
    if (actions.current) actions.current.walk.timeScale = WALK_ANIMATION_SPEED * speed.current / WALK_SPEED
    if (!route.current.length) onArrived(command.id)
  }, [command, onArrived])

  useFrame((_, delta) => {
    if (paused || !root.current) return
    const frame = Math.min(delta, .05)
    const next = route.current[0]
    const turnTowards = (heading: number) => {
      const turn = Math.atan2(Math.sin(heading - root.current!.rotation.y), Math.cos(heading - root.current!.rotation.y))
      root.current!.rotation.y += MathUtils.clamp(turn, -TURN_SPEED * frame, TURN_SPEED * frame)
      return turn
    }
    if (next) {
      const [x, z] = WAYPOINTS[next]
      const dx = x - root.current.position.x
      const dz = z - root.current.position.z
      const turn = turnTowards(Math.atan2(dx, dz)) // source avatar faces local +Z
      const distance = Math.hypot(dx, dz)
      if (Math.abs(turn) < .6) {
        const step = Math.min(distance, speed.current * frame)
        root.current.position.x += distance ? dx / distance * step : 0
        root.current.position.z += distance ? dz / distance * step : 0
      }
      if (distance < .06) {
        root.current.position.x = x
        root.current.position.z = z
        at.current = next
        route.current.shift()
        if (!route.current.length) onArrived(activeCommand.current)
      }
    } else if (checking) turnTowards(CHECK_HEADING)
    else if (knocking) turnTowards(DOOR_HEADING)

    const animation = actions.current
    if (animation) {
      const wanted: Gait = next ? 'walk' : checking ? 'crouch' : 'idle'
      if (wanted !== gait.current) {
        animation[wanted].reset().fadeIn(wanted === 'crouch' ? .7 : .35).play()
        animation[gait.current].fadeOut(wanted === 'crouch' ? .7 : .35)
        gait.current = wanted
      }
      // Undo last frame's knock in case the clip leaves a bone unwritten, then layer it on top.
      const limb = arm.current
      if (limb && armBase.current) {
        limb.upper.quaternion.copy(armBase.current.upper)
        limb.lower.quaternion.copy(armBase.current.lower)
        armBase.current = null
      }
      mixer.current?.update(frame)
      knockTime.current = knocking ? knockTime.current + frame : 0
      knockRaise.current = MathUtils.damp(knockRaise.current, knocking ? 1 : 0, 14, frame)
      const raise = knockRaise.current
      if (limb && raise > .001) {
        armBase.current = { upper: limb.upper.quaternion.clone(), lower: limb.lower.quaternion.clone() }
        const heading = root.current.rotation.y
        const forward = new Vector3(Math.sin(heading), 0, Math.cos(heading))
        const right = new Vector3(-Math.cos(heading), 0, Math.sin(heading))
        // Each rap swings the fist forward into the door and back.
        const rap = KNOCK_RAPS.reduce((sum, at) => sum + Math.exp(-(((knockTime.current - at) / .065) ** 2)), 0)
        // Elbow out to the side and forward, fist raised to face height.
        const upperAim = forward.clone().multiplyScalar(.6).addScaledVector(right, .45).add(new Vector3(0, -.65, 0)).normalize()
        const lowerAim = forward.clone().multiplyScalar(.35 + .75 * rap).addScaledVector(right, -.15).add(new Vector3(0, .95 - .35 * rap, 0)).normalize()
        aimBone(limb.upper, limb.lower, upperAim, raise)
        aimBone(limb.lower, limb.hand, lowerAim, raise)
      }
    }
    if (visible) invalidate()
  })

  return <group ref={root} name="township-responder-guard-ali" visible={visible} position={[WAYPOINTS.outside[0], .05, WAYPOINTS.outside[1]]}>
    {model && <primitive object={model} />}
    {visible && knocking && <Html position={[0, 2.62, 0]} center style={{ pointerEvents: 'none' }}>
      <span className="home-character-speech">“Hello?”</span>
    </Html>}
    {visible && <Html position={[0, 2, 0]} center style={{ pointerEvents: 'none' }}>
      <span className="home-responder-label">Guard Ali · Township{note ? ` · ${note}` : checking ? ' · checking Madam Lee' : ''}</span>
    </Html>}
  </group>
}
