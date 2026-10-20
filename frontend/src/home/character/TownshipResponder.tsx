import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, MathUtils } from 'three'
import { WAYPOINTS, routeBetween, type Waypoint } from './navigation'

export type ResponderCommand = { id: number; destination: Waypoint | 'reset' }

const WALK_SPEED = 2.15

/** Presenter-only reenactment of Guard Ali. No pose or movement here is a sensor event. */
export function TownshipResponder({ command, visible, checking, paused, onArrived }: {
  command: ResponderCommand
  visible: boolean
  checking: boolean
  paused: boolean
  onArrived: (id: number) => void
}) {
  const root = useRef<Group>(null)
  const upper = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const at = useRef<Waypoint>('outside')
  const route = useRef<Waypoint[]>([])
  const activeCommand = useRef(0)
  const gait = useRef(0)

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
    if (next) {
      const [x, z] = WAYPOINTS[next]
      const dx = x - root.current.position.x
      const dz = z - root.current.position.z
      const heading = Math.atan2(dx, dz)
      const turn = Math.atan2(Math.sin(heading - root.current.rotation.y), Math.cos(heading - root.current.rotation.y))
      root.current.rotation.y += MathUtils.clamp(turn, -4 * frame, 4 * frame)
      const distance = Math.hypot(dx, dz)
      if (Math.abs(turn) < .6) {
        const step = Math.min(distance, WALK_SPEED * frame)
        root.current.position.x += distance ? dx / distance * step : 0
        root.current.position.z += distance ? dz / distance * step : 0
      }
      gait.current += frame * 10
      if (distance < .06) {
        root.current.position.x = x
        root.current.position.z = z
        at.current = next
        route.current.shift()
        if (!route.current.length) onArrived(activeCommand.current)
      }
    }
    const stride = next ? Math.sin(gait.current) * .42 : 0
    if (leftLeg.current) leftLeg.current.rotation.x = MathUtils.damp(leftLeg.current.rotation.x, checking ? .78 : stride, 8, frame)
    if (rightLeg.current) rightLeg.current.rotation.x = MathUtils.damp(rightLeg.current.rotation.x, checking ? -.72 : -stride, 8, frame)
    if (leftArm.current) leftArm.current.rotation.x = MathUtils.damp(leftArm.current.rotation.x, -stride * .65 + (checking ? -.45 : 0), 8, frame)
    if (rightArm.current) rightArm.current.rotation.x = MathUtils.damp(rightArm.current.rotation.x, stride * .65 + (checking ? -.45 : 0), 8, frame)
    if (upper.current) {
      upper.current.rotation.x = MathUtils.damp(upper.current.rotation.x, checking ? .48 : 0, 5, frame)
      upper.current.position.y = MathUtils.damp(upper.current.position.y, checking ? .57 : .84, 5, frame)
    }
  })

  return <group ref={root} name="township-responder-guard-ali" visible={visible} position={[WAYPOINTS.outside[0], .05, WAYPOINTS.outside[1]]}>
    <group ref={upper} position={[0, .84, 0]}>
      <mesh position={[0, .31, 0]} castShadow><capsuleGeometry args={[.23, .42, 5, 10]} /><meshStandardMaterial color="#263f55" roughness={.85} /></mesh>
      <mesh position={[0, .38, .213]} castShadow><boxGeometry args={[.27, .36, .025]} /><meshStandardMaterial color="#e9ba57" roughness={.75} /></mesh>
      <mesh position={[0, .45, .231]}><boxGeometry args={[.18, .075, .008]} /><meshStandardMaterial color="#f9f0d5" /></mesh>
      <mesh position={[0, .82, 0]} castShadow><sphereGeometry args={[.19, 16, 12]} /><meshStandardMaterial color="#aa7657" roughness={.92} /></mesh>
      <mesh position={[0, 1.01, 0]} castShadow><cylinderGeometry args={[.21, .2, .14, 14]} /><meshStandardMaterial color="#263f55" /></mesh>
      <mesh position={[0, .97, .14]} castShadow><boxGeometry args={[.43, .035, .2]} /><meshStandardMaterial color="#263f55" /></mesh>
      <group ref={leftArm} position={[-.28, .51, 0]}><mesh position={[0, -.3, 0]} castShadow><capsuleGeometry args={[.075, .38, 4, 8]} /><meshStandardMaterial color="#263f55" /></mesh><mesh position={[0, -.58, 0]}><sphereGeometry args={[.075, 10, 8]} /><meshStandardMaterial color="#aa7657" /></mesh></group>
      <group ref={rightArm} position={[.28, .51, 0]}><mesh position={[0, -.3, 0]} castShadow><capsuleGeometry args={[.075, .38, 4, 8]} /><meshStandardMaterial color="#263f55" /></mesh><mesh position={[0, -.58, 0]}><sphereGeometry args={[.075, 10, 8]} /><meshStandardMaterial color="#aa7657" /></mesh></group>
    </group>
    <group ref={leftLeg} position={[-.13, .78, 0]}><mesh position={[0, -.34, 0]} castShadow><capsuleGeometry args={[.1, .46, 4, 8]} /><meshStandardMaterial color="#1d2c3d" /></mesh><mesh position={[0, -.69, .09]} castShadow><boxGeometry args={[.19, .12, .36]} /><meshStandardMaterial color="#17212a" /></mesh></group>
    <group ref={rightLeg} position={[.13, .78, 0]}><mesh position={[0, -.34, 0]} castShadow><capsuleGeometry args={[.1, .46, 4, 8]} /><meshStandardMaterial color="#1d2c3d" /></mesh><mesh position={[0, -.69, .09]} castShadow><boxGeometry args={[.19, .12, .36]} /><meshStandardMaterial color="#17212a" /></mesh></group>
    {visible && <Html position={[0, 2.15, 0]} center style={{ pointerEvents: 'none' }}>
      <span className="home-responder-label">Guard Ali · Township{checking ? ' · checking Madam Lee' : ''}</span>
    </Html>}
  </group>
}
