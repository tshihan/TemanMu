import { Ball, Box, Cylinder, Pipe } from '../primitives'
import { getMaterials } from '../materials'

export function Tap({ at, name = 'tap' }: { at: [number, number, number]; name?: string }) {
  const m = getMaterials()
  return <group name={name} position={at}>
    <Cylinder radius={.06} height={.035} mat={m.steel} />
    <Pipe points={[[0, 0, 0], [0, .27, 0], [0, .35, .14], [0, .28, .23]]} radius={.025} mat={m.steel} />
    <Box at={[.09, .09, 0]} size={[.15, .025, .04]} mat={m.steel} />
  </group>
}
export function Bathroom() {
  const m = getMaterials()
  return <group name="bathroom">
    <Box at={[1.82, 1.1, -4.88]} size={[4.35, 2.13, .045]} mat={m.tile} radius={0} />
    <group name="bathroom-vanity" position={[.35, 0, -3.76]}>
      <Box at={[0, .55, 0]} size={[1.06, .8, .68]} mat={m.oak} />
      {[-.25, .25].map(x => <Box key={x} at={[x, .61, .36]} size={[.46, .6, .025]} mat={m.walnut} />)}
      <Box at={[0, .98, 0]} size={[1.14, .1, .78]} mat={m.porcelain} />
      <Ball at={[0, 1.03, .04]} size={[.4, .055, .28]} mat={m.steel} />
      <Ball at={[0, 1.045, .04]} size={[.35, .035, .24]} mat={m.porcelain} />
      <Cylinder at={[0, 1.08, .05]} radius={.03} height={.004} mat={m.steel} />
      <Tap at={[0, 1.04, -.26]} name="bathroom-tap" />
      <Box at={[.43, 1.15, -.1]} size={[.09, .23, .09]} mat={m.sage} />
    </group>
    <Box at={[.35, 1.73, -4.81]} size={[.95, .83, .06]} mat={m.brass} radius={.16} />
    <Box at={[.35, 1.73, -4.77]} size={[.88, .76, .02]} mat={m.mirror} radius={.14} />
    <group name="toilet" position={[1.75, 0, -3.83]}>
      <Box at={[0, .62, -.25]} size={[.54, .81, .28]} mat={m.porcelain} radius={.07} />
      <Ball at={[0, .29, .05]} size={[.24, .27, .34]} mat={m.porcelain} />
      <Ball at={[0, .49, .18]} size={[.31, .15, .43]} mat={m.porcelain} />
      <Box at={[0, .62, .16]} size={[.57, .055, .75]} mat={m.cream} radius={.19} />
      <Cylinder at={[0, 1.04, -.25]} radius={.045} height={.01} mat={m.steel} />
    </group>
    <group name="shower" position={[3.15, 0, -3.45]}>
      <Box at={[0, .11, 0]} size={[1.55, .13, 2.55]} mat={m.porcelain} radius={.025} />
      <Box at={[0, .185, 0]} size={[1.4, .02, 2.4]} mat={m.tile} radius={.02} />
      <Box at={[-.76, 1.12, -.35]} size={[.035, 1.95, 1.82]} mat={m.glass} radius={0} />
      {[-1.26, .56].map(z => <Box key={z} at={[-.77, 1.12, z]} size={[.03, 1.98, .035]} mat={m.steel} />)}
      <Box at={[-.77, 2.12, -.35]} size={[.035, .035, 1.85]} mat={m.steel} />
      <Pipe points={[[.3, .85, -1.33], [.3, 2.05, -1.33], [.3, 2.12, -.94]]} mat={m.steel} />
      <Cylinder at={[.3, 2.1, -.91]} radius={.17} height={.025} mat={m.steel} />
      <Box at={[.3, 1.05, -1.35]} size={[.28, .12, .05]} mat={m.steel} />
      <Cylinder at={[.2, .2, .7]} radius={.08} height={.008} mat={m.steel} />
      <Box at={[.57, .7, -.95]} size={[.5, .07, .35]} mat={m.walnut} />
      <Cylinder at={[.58, .87, -.95]} radius={.055} height={.26} mat={m.sage} />
    </group>
    <Box at={[.65, .09, -2.45]} size={[1.2, .03, .65]} mat={m.rug} radius={.06} />
    <Box at={[3.99, .9, -1.8]} size={[.1, .04, .6]} mat={m.brass} />
    <Box at={[3.9, .72, -1.8]} size={[.07, .42, .42]} mat={m.linen} radius={.035} />
  </group>
}
