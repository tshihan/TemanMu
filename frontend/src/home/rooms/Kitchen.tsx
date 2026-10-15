import { Ball, Box, Cylinder, Pipe, Plant } from '../primitives'
import { getMaterials } from '../materials'
import { Tap } from './Bathroom'

export function Kitchen() {
  const m = getMaterials()
  return <group name="kitchen">
    <group name="refrigerator" position={[3.35, 0, -.45]}>
      <Box at={[0, 1.02, 0]} size={[.85, 1.94, .86]} mat={m.steel} radius={.07} />
      <Box at={[0, 1.37, .45]} size={[.8, 1.17, .07]} mat={m.steel} radius={.035} />
      <Box at={[0, .43, .45]} size={[.8, .64, .07]} mat={m.steel} radius={.035} />
      <Box at={[-.28, 1.3, .52]} size={[.035, .5, .05]} mat={m.dark} />
      <Box at={[0, .65, .52]} size={[.45, .035, .05]} mat={m.dark} />
    </group>
    <group name="kitchen-cabinets">
      <Box at={[4.55, .49, -.48]} size={[1.45, .88, .82]} mat={m.walnut} />
      <Box at={[5.03, .49, 1.3]} size={[.82, .88, 2.8]} mat={m.walnut} />
      <Box at={[4.56, .97, -.48]} size={[1.53, .09, .9]} mat={m.cream} />
      <Box at={[5.03, .97, 1.29]} size={[.9, .09, 2.78]} mat={m.cream} />
      {[.25, 1.07, 1.9, 2.5].map((z, i) => <group key={z}>
        <Box at={[4.6, .51, z]} size={[.035, .77, i === 3 ? .35 : .73]} mat={m.oak} />
        <Box at={[4.56, .78, z]} size={[.045, .025, .22]} mat={m.brass} />
      </group>)}
      {[4.15, 4.85].map(x => <group key={x}>
        <Box at={[x, .5, -.05]} size={[.63, .76, .035]} mat={m.oak} />
        <Box at={[x, .79, 0]} size={[.21, .025, .045]} mat={m.brass} />
      </group>)}
    </group>
    <group name="kitchen-sink" position={[4.48, 1.02, -.49]}>
      <Box size={[.7, .015, .52]} mat={m.steel} radius={.08} />
      <Box at={[0, .009, 0]} size={[.59, .018, .41]} mat={m.dark} radius={.075} />
      <Box at={[0, .021, .015]} size={[.49, .009, .31]} mat={m.steel} radius={.065} />
      <Tap at={[0, .01, -.3]} name="kitchen-tap" />
    </group>
    <group name="stove-and-oven" position={[5, 0, 1.1]}>
      <Box at={[0, 1.025, 0]} size={[.69, .035, .85]} mat={m.dark} radius={.035} />
      {[-.17, .17].flatMap(x => [-.22, .22].map(z => <group key={`${x}${z}`}>
        <Cylinder at={[x, 1.05, z]} radius={.12} height={.012} mat={m.steel} />
        <Cylinder at={[x, 1.06, z]} radius={.095} height={.012} mat={m.dark} />
      </group>))}
      <Box at={[-.44, .44, 0]} size={[.045, .5, .63]} mat={m.dark} />
      <Box at={[-.48, .68, 0]} size={[.05, .035, .5]} mat={m.steel} />
      {[-.2, 0, .2].map(z => <Cylinder key={z} at={[-.46, .83, z]} radius={.04} height={.02} rotation={[0, 0, Math.PI / 2]} mat={m.steel} />)}
    </group>
    <group name="electric-kettle" position={[5, 1.04, 2.07]}>
      <Cylinder at={[0, .02, 0]} radius={.19} height={.04} mat={m.dark} />
      <Ball at={[0, .2, 0]} size={[.17, .2, .17]} mat={m.steel} />
      <Cylinder at={[0, .38, 0]} radius={.12} height={.025} mat={m.dark} />
      <Pipe points={[[.1, .32, 0], [.26, .34, 0], [.28, .11, 0], [.12, .1, 0]]} radius={.035} mat={m.dark} />
      <Pipe points={[[-.1, .13, 0], [-.23, .21, 0], [-.25, .3, 0]]} radius={.045} mat={m.steel} />
    </group>
    <Plant at={[4.01, 1.03, -.61]} scale={.35} />
    <Cylinder at={[5.04, 1.18, -.38]} radius={.1} height={.3} mat={m.terracotta} />
    {[-.05, .02, .07].map((x, i) => <group key={x} position={[5.04 + x, 1.4, -.38]} rotation={[.1 * i, 0, x * 2]}>
      <Cylinder radius={.013} height={.32} mat={m.walnut} />
      <Ball at={[0, .18, 0]} size={[.045, .07, .015]} mat={m.walnut} />
    </group>)}
    <Box at={[5.06, 1.03, 2.48]} size={[.51, .03, .32]} mat={m.walnut} radius={.07} />
    <Ball at={[4.96, 1.11, 2.47]} size={[.075, .075, .075]} mat={m.terracotta} />
    <Ball at={[5.13, 1.11, 2.47]} size={[.075, .075, .075]} mat={m.sage} />
  </group>
}
