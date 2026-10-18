import { Art, Box, Cylinder, Lamp, Plant } from '../primitives'
import { getMaterials } from '../materials'
import { InteractiveObject } from '../interactions/InteractiveObject'
import { interactionPrompt, type InteractionBindings } from '../interactions/registry'

export function Bedroom({ interaction }: { interaction?: InteractionBindings }) {
  const m = getMaterials()
  return <group name="bedroom">
    <Box at={[-2.85, .085, -2.95]} size={[3.3, .035, 3.35]} mat={m.rug} radius={.09} />
    <group name="double-bed" position={[-2.8, 0, -3.25]}>
      <Box at={[0, .29, 0]} size={[2.18, .4, 2.85]} mat={m.walnut} radius={.08} />
      <Box at={[0, .58, 0]} size={[2.1, .32, 2.72]} mat={m.linen} radius={.14} />
      <Box at={[0, .8, -1.42]} size={[2.33, 1.3, .17]} mat={m.oak} radius={.09} />
      <Box at={[0, 1.05, -1.31]} size={[2.12, .66, .12]} mat={m.linen} radius={.065} />
      {[-.54, .54].map(x => <Box key={x} at={[x, .81, -.93]} size={[.89, .2, .53]} rotation={[-.12, x * .06, 0]} mat={m.linen} radius={.13} />)}
      <Box at={[0, .8, .4]} size={[2.15, .13, 1.68]} mat={m.blush} radius={.065} />
      <Box at={[0, .79, -.37]} size={[2.16, .15, .25]} mat={m.terracotta} radius={.06} />
      <Box at={[0, .59, 1.31]} size={[2.15, .5, .12]} mat={m.blush} radius={.06} />
      {[-1.04, 1.04].map(x => <Box key={x} at={[x, .61, .47]} size={[.1, .37, 1.58]} mat={m.blush} radius={.045} />)}
      <Box at={[0, .96, -.72]} size={[.55, .18, .5]} mat={m.terracotta} rotation={[-.25, .15, .05]} radius={.09} />
      {/* Subtle stitched channels make the cover readable at close range. */}
      {[-.78, -.39, 0, .39, .78].map(x => <Box key={x} at={[x, .87, .47]} size={[.009, .006, 1.35]} mat={m.blush} radius={.002} />)}
    </group>
    {[-4.38, -1.22].map(x => <group key={x} name="bedside-table" position={[x, 0, -4.13]}>
      <Box at={[0, .4, 0]} size={[.68, .67, .65]} mat={m.oak} />
      <Box at={[0, .53, .34]} size={[.59, .22, .035]} mat={m.walnut} />
      <Box at={[0, .54, .37]} size={[.15, .025, .025]} mat={m.brass} />
      {x === -1.22 && interaction ? <InteractiveObject id="bedroomLamp" label={interactionPrompt('bedroomLamp', interaction.states)}
        selected={interaction.selected === 'bedroomLamp'} hovered={interaction.hovered === 'bedroomLamp'} disabled={interaction.disabled}
        onSelect={interaction.onSelect} onHover={interaction.onHover}
        hitbox={[0, 1.16, 0]} hitboxSize={[.5, .65, .5]} tooltip={[0, 1.7, 0]}>
        <Lamp at={[0, .76, 0]} lit={interaction.states.bedroomLamp} />
      </InteractiveObject> : <Lamp at={[0, .76, 0]} lit={!interaction} />}
    </group>)}
    <group name="wardrobe" position={[-4.98, 0, -2.55]}>
      <Box at={[0, 1.03, 0]} size={[.68, 2, 1.58]} mat={m.walnut} />
      {[-.39, .39].map(z => <group key={z}>
        <Box at={[.36, 1.04, z]} size={[.04, 1.9, .75]} mat={m.oak} />
        <Box at={[.4, 1.05, z + (z < 0 ? .27 : -.27)]} size={[.04, .32, .03]} mat={m.brass} />
      </group>)}
    </group>
    <Art at={[-2.8, 1.98, -4.87]} width={1.2} height={.62} />
    <Plant at={[-1.03, .08, -2.05]} scale={.7} />
    <Cylinder at={[-4.8, .25, -1.55]} radius={.23} height={.35} mat={m.rug} />
  </group>
}
