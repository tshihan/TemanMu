import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { MathUtils, type Group } from 'three'
import { Box } from '../primitives'
import { getMaterials } from '../materials'
import { InteractiveObject } from '../interactions/InteractiveObject'
import { interactionPrompt, type InteractionBindings, type TelephoneState } from '../interactions/registry'

function MobilePhone({ state, paused }: { state: TelephoneState; paused?: boolean }) {
  const m = getMaterials()
  const phone = useRef<Group>(null)
  useFrame(({ clock }, delta) => {
    if (paused || !phone.current) return
    const answering = state === 'answering'
    phone.current.position.x = MathUtils.damp(phone.current.position.x, answering ? .52 : 0, 4, delta)
    phone.current.position.y = MathUtils.damp(phone.current.position.y, answering ? .72 : 0, 4, delta)
    phone.current.rotation.x = MathUtils.damp(phone.current.rotation.x, answering ? -1.15 : 0, 4, delta)
    phone.current.rotation.y = state === 'ringing'
      ? Math.sin(clock.elapsedTime * 25) * .09
      : MathUtils.damp(phone.current.rotation.y, 0, 8, delta)
  })
  return <group name="mobile-phone">
    <group ref={phone}>
      <Box size={[.22, .026, .38]} mat={m.dark} radius={.027} />
      <mesh position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[.19, .34]} />
        <meshStandardMaterial color={state === 'idle' ? '#213b3a' : '#83c5bc'}
          emissive={state === 'idle' ? '#000000' : '#4ab9ae'} emissiveIntensity={state === 'ringing' ? .85 : .35} />
      </mesh>
      <Box at={[0, .019, -.164]} size={[.055, .003, .006]} mat={m.steel} radius={.002} />
      {state !== 'idle' && <>
        <Box at={[0, .019, -.065]} size={[.105, .003, .008]} mat={m.cream} radius={.003} />
        <Box at={[0, .019, -.035]} size={[.075, .003, .006]} mat={m.cream} radius={.003} />
      </>}
    </group>
    {state === 'ringing' && <Html position={[0, .45, 0]} center style={{ pointerEvents: 'none' }}><span className="home-object-tip">♪ Incoming call</span></Html>}
  </group>
}

/** The phone on a table top. Local +x should face where Madam Lee stands, so answering lifts it toward her. */
export function PhoneOnSurface({ interaction, at, rotation = 0 }: { interaction?: InteractionBindings; at: [number, number, number]; rotation?: number }) {
  return <group position={at} rotation={[0, rotation, 0]}>
    {interaction ? <InteractiveObject id="telephone" label={interactionPrompt('telephone', interaction.states)}
      selected={interaction.selected === 'telephone'} hovered={interaction.hovered === 'telephone'} disabled={interaction.disabled}
      onSelect={interaction.onSelect} onHover={interaction.onHover}
      hitbox={[0, .03, 0]} hitboxSize={[.3, .12, .44]} tooltip={[0, .51, 0]}>
      <MobilePhone state={interaction.states.telephone} paused={interaction.paused} />
    </InteractiveObject> : <MobilePhone state="idle" />}
    {interaction?.phoneTag && interaction.hovered !== 'telephone' && <Html position={[0, .45, 0]} center style={{ pointerEvents: 'none' }}>
      <span className="home-object-tip">{interaction.phoneTag}</span>
    </Html>}
  </group>
}
