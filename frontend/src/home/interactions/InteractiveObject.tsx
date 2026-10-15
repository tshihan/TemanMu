import { Html } from '@react-three/drei'
import type { ReactNode } from 'react'
import type { InteractionId } from './registry'

type V3 = [number, number, number]

/** One hit target and one hover treatment for all four existing props. */
export function InteractiveObject({ id, label, selected, hovered, disabled, onSelect, onHover, hitbox, hitboxSize, tooltip, children }: {
  id: InteractionId; label: string; selected: boolean; hovered: boolean; disabled?: boolean
  onSelect: (id: InteractionId) => void; onHover: (id: InteractionId | null) => void
  hitbox: V3; hitboxSize: V3; tooltip: V3; children: ReactNode
}) {
  const active = hovered || selected
  return <group name={`interactive-${id}`}>
    {children}
    <mesh position={hitbox} onClick={event => { event.stopPropagation(); if (!disabled) onSelect(id) }}
      onPointerOver={event => { event.stopPropagation(); (event.nativeEvent.target as HTMLElement).style.cursor = disabled ? 'not-allowed' : 'pointer'; onHover(id) }}
      onPointerOut={event => { event.stopPropagation(); (event.nativeEvent.target as HTMLElement).style.cursor = 'grab'; onHover(null) }}>
      <boxGeometry args={hitboxSize} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    {active && <>
      <mesh position={[hitbox[0], hitbox[1] - hitboxSize[1] / 2 + .015, hitbox[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(hitboxSize[0], hitboxSize[2]) * .42, Math.min(hitboxSize[0], hitboxSize[2]) * .49, 32]} />
        <meshBasicMaterial color={selected ? '#d99d4d' : '#92b484'} transparent opacity={.78} depthWrite={false} />
      </mesh>
      <Html position={tooltip} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <span className={`home-object-tip${selected ? ' is-selected' : ''}`}>{disabled ? 'Scenario playing' : selected ? 'Selected · ' + label : label}</span>
      </Html>
    </>}
  </group>
}
