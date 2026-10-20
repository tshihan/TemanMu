import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AnimationMixer, Group, MathUtils, type AnimationAction } from 'three'
import { WAYPOINTS, routeBetween, type Waypoint } from './navigation'
import { ROCKETBOX_SCALE, disposeAvatar, inPlace, prepareAvatar, rocketboxLoader } from './rocketbox'

export type ResponderCommand = { id: number; destination: Waypoint | 'reset' }
type Gait = 'idle' | 'walk' | 'crouch'

const ASSET_ROOT = '/models/guard-ali/'
const WALK_SPEED = 1.4 // metres per second: a purposeful walk to a welfare check
const WALK_ANIMATION_SPEED = 1.45 // the source clip covers about 0.96 m/s
const TURN_SPEED = 4 // radians per second
// Madam Lee falls along the x axis; kneel square to her, facing across her chest.
const CHECK_HEADING = Math.atan2(0, WAYPOINTS.collapseSpot[1] - WAYPOINTS.responderCheck[1])

/** Presenter-only reenactment of Guard Ali. No pose or movement here is a sensor event. */
export function TownshipResponder({ command, visible, checking, paused, onArrived }: {
  command: ResponderCommand
  visible: boolean
  checking: boolean
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
        const step = Math.min(distance, WALK_SPEED * frame)
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

    const animation = actions.current
    if (animation) {
      const wanted: Gait = next ? 'walk' : checking ? 'crouch' : 'idle'
      if (wanted !== gait.current) {
        animation[wanted].reset().fadeIn(wanted === 'crouch' ? .7 : .35).play()
        animation[gait.current].fadeOut(wanted === 'crouch' ? .7 : .35)
        gait.current = wanted
      }
      mixer.current?.update(frame)
    }
    if (visible) invalidate()
  })

  return <group ref={root} name="township-responder-guard-ali" visible={visible} position={[WAYPOINTS.outside[0], .05, WAYPOINTS.outside[1]]}>
    {model && <primitive object={model} />}
    {visible && <Html position={[0, 2, 0]} center style={{ pointerEvents: 'none' }}>
      <span className="home-responder-label">Guard Ali · Township{checking ? ' · checking Mum' : ''}</span>
    </Html>}
  </group>
}
