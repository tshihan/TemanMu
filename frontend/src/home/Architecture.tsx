import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, type Group } from 'three'
import { Box, Plant } from './primitives'
import { getMaterials } from './materials'
import { InteractiveObject } from './interactions/InteractiveObject'
import { interactionPrompt, type InteractionBindings } from './interactions/registry'

function Window({ at, rotation = 0, width = 1.8 }: { at: [number, number, number]; rotation?: number; width?: number }) {
  const m = getMaterials()
  return <group position={at} rotation={[0, rotation, 0]} name="window">
    <Box size={[width, .95, .045]} mat={m.glass} radius={0} />
    {[-width / 2, 0, width / 2].map(x => <Box key={x} at={[x, 0, 0]} size={[.045, 1.05, .1]} mat={m.cream} radius={0} />)}
    {[-.52, .52].map(y => <Box key={y} at={[0, y, 0]} size={[width + .1, .06, .14]} mat={m.cream} radius={0} />)}
    <Box at={[0, -.56, .05]} size={[width + .2, .08, .28]} mat={m.cream} />
    {[-1, 1].map(side => <group key={side} position={[side * (width / 2 - .1), 0, .1]}>
      {Array.from({ length: 5 }, (_, i) => <Box key={i} at={[i * .055 * side, 0, Math.sin(i * 2) * .025]} size={[.08, 1.2, .06]} mat={m.linen} radius={.03} />)}
    </group>)}
    <Box at={[0, .65, .11]} size={[width + .55, .035, .035]} mat={m.brass} />
  </group>
}
function Wall({ x, z, width, depth, height = 2.5 }: { x: number; z: number; width: number; depth: number; height?: number }) {
  const m = getMaterials()
  return <group>
    <Box at={[x, height / 2, z]} size={[width, height, depth]} mat={m.wall} radius={.012} />
    <Box at={[x, height + .018, z]} size={[width + .015, .04, depth + .015]} mat={m.edge} radius={.008} />
    <Box at={[x, .075, z]} size={[width + .025, .13, depth + .025]} mat={m.trim} radius={.006} />
  </group>
}
function EntranceDoor({ interaction }: { interaction?: InteractionBindings }) {
  const leaf = useRef<Group>(null)
  useFrame((_, delta) => {
    if (interaction?.paused) return
    if (leaf.current) leaf.current.rotation.y = MathUtils.damp(leaf.current.rotation.y, interaction?.states.mainDoor ? .85 : 0, 4.5, delta)
  })
  const model = <group ref={leaf} name="main-door" position={[2.3, .03, 5]}>
    <Box at={[-.56, 1.07, 0]} size={[1.12, 2.14, .075]} mat={getMaterials().walnut} />
    {[.55, 1.48].map(y => <Box key={y} at={[-.56, y, .05]} size={[.9, .71, .035]} mat={getMaterials().oak} radius={.008} />)}
    <Box at={[-.98, 1.05, -.08]} size={[.055, .22, .055]} mat={getMaterials().brass} />
    <Box at={[-.98, 1.06, .08]} size={[.055, .22, .055]} mat={getMaterials().brass} />
  </group>
  return interaction ? <InteractiveObject id="mainDoor" label={interactionPrompt('mainDoor', interaction.states)}
    selected={interaction.selected === 'mainDoor'} hovered={interaction.hovered === 'mainDoor'} disabled={interaction.disabled}
    onSelect={interaction.onSelect} onHover={interaction.onHover}
    hitbox={[1.69, 1.03, 5.25]} hitboxSize={[1.3, 2.1, 1.5]} tooltip={[1.6, 2.5, 5]}>
    {model}
  </InteractiveObject> : model
}

export function Architecture({ interaction }: { interaction?: InteractionBindings }) {
  const m = getMaterials()
  return <group name="architecture">
    <Box at={[-.7, -.23, -3]} size={[9.82, .44, 4.22]} mat={m.trim} radius={.035} />
    <Box at={[-1.375, -.23, 2]} size={[8.47, .44, 6.22]} mat={m.trim} radius={.035} />
    <Box at={[4.13, -.23, 1.08]} size={[2.98, .44, 4.38]} mat={m.trim} radius={.035} />
    <Box at={[-.7, .005, -3]} size={[9.6, .06, 4]} mat={m.oak} radius={0} />
    <Box at={[-1.375, .005, 2]} size={[8.25, .06, 6]} mat={m.oak} radius={0} />
    <Box at={[1.8, .045, -3]} size={[4.4, .05, 3.85]} mat={m.tile} radius={0} />
    <Box at={[4.05, .05, 1.05]} size={[2.7, .06, 4.1]} mat={m.tile} radius={0} />
    <Wall x={-2.75} z={-5} width={5.5} depth={.18} />
    <Wall x={2} z={-5} width={4.1} depth={.18} />
    <Wall x={-5.5} z={-3} width={.18} depth={4} height={1.5} />
    <Window at={[-5.48, 1.98, -4.05]} rotation={Math.PI / 2} width={1.35} />
    <Wall x={-5.5} z={2} width={.18} depth={6} height={.65} />
    <Window at={[-5.48, 1.45, 2]} rotation={Math.PI / 2} width={2.5} />
    <Wall x={4.1} z={-3} width={.18} depth={4.1} height={1.5} />
    <Wall x={4.8} z={-1} width={1.6} depth={.18} height={1.5} />
    <Wall x={5.5} z={1.05} width={.18} depth={4.1} height={.65} />
    <Window at={[5.48, 1.65, .3]} rotation={-Math.PI / 2} width={1.3} />
    <Wall x={4.1} z={3.15} width={2.8} depth={.18} height={.55} />
    <Wall x={2.75} z={4.05} width={.18} depth={1.8} height={.55} />
    <Wall x={-2.2} z={5} width={6.6} depth={.18} height={.5} />
    <Wall x={2.55} z={5} width={.5} depth={.18} height={.6} />
    {/* Wide, unobstructed doorways connect the two private rooms to the open plan. */}
    <Wall x={-.45} z={-3.55} width={.18} depth={2.9} height={1.35} />
    <Wall x={-3.475} z={-1} width={4.05} depth={.18} height={.85} />
    <Wall x={.15} z={-1} width={1.2} depth={.18} height={.85} />
    <Wall x={3.2} z={-1} width={1.8} depth={.18} height={.85} />
    <Box at={[-.6, .075, -1]} size={[1.2, .05, .18]} mat={m.walnut} radius={0} />
    <Box at={[1.5, .08, -1]} size={[1.5, .05, .18]} mat={m.trim} radius={0} />
    <Box at={[1.6, -.14, 5.68]} size={[3.2, .25, 1.4]} mat={m.tile} />
    <Box at={[1.6, -.28, 6.35]} size={[3.6, .18, .3]} mat={m.trim} />
    <Box at={[1.62, .015, 5.65]} size={[1.05, .035, .6]} mat={m.rug} />
    <Plant at={[.2, .02, 5.6]} scale={.85} /><Plant at={[3, .02, 5.6]} scale={.85} />
    <EntranceDoor interaction={interaction} />
  </group>
}
