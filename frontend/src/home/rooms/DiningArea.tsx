import { Books, Box, Cylinder, Plant } from '../primitives'
import { getMaterials } from '../materials'

function Chair({ at, rotation }: { at: [number, number, number]; rotation: number }) {
  const m = getMaterials()
  return <group name="dining-chair" position={at} rotation={[0, rotation, 0]}>
    {[-.23, .23].flatMap(x => [-.22, .22].map(z => <Box key={`${x}${z}`} at={[x, .29, z]} size={[.045, .5, .045]} rotation={[z * .12, 0, -x * .16]} mat={m.walnut} />))}
    <Box at={[0, .53, 0]} size={[.6, .075, .59]} mat={m.walnut} radius={.09} />
    <Box at={[0, .59, .02]} size={[.51, .075, .48]} mat={m.linen} radius={.07} />
    {[-.24, .24].map(x => <Box key={x} at={[x, .84, -.25]} size={[.045, .57, .045]} rotation={[-.12, 0, 0]} mat={m.walnut} />)}
    <Box at={[0, 1.04, -.29]} size={[.6, .24, .075]} mat={m.oak} radius={.09} />
  </group>
}
export function DiningArea() {
  const m = getMaterials()
  return <group name="dining-area">
    <group name="dining-table" position={[1.15, 0, 1.35]}>
      {[-.43, .43].flatMap(x => [-.69, .69].map(z => <Box key={`${x}${z}`} at={[x, .47, z]} size={[.085, .84, .085]} mat={m.walnut} />))}
      <Box at={[0, .94, 0]} size={[1.3, .12, 2.02]} mat={m.oak} radius={.11} />
      <Box at={[0, 1.005, 0]} size={[.42, .012, 1.85]} mat={m.linen} radius={.008} />
      <Plant at={[0, 1.02, 0]} scale={.33} />
      {[-.64, .64].map(z => <group key={z}>
        <Cylinder at={[0, 1.028, z]} radius={.2} height={.025} mat={m.porcelain} />
        <Cylinder at={[0, 1.046, z]} radius={.15} height={.012} mat={m.cream} />
        <Box at={[.27, 1.025, z]} size={[.018, .009, .22]} mat={m.steel} radius={.008} />
      </group>)}
    </group>
    <Chair at={[1.15, 0, -.05]} rotation={0} />
    <Chair at={[1.15, 0, 2.76]} rotation={Math.PI} />
    <Chair at={[.16, 0, 1.35]} rotation={Math.PI / 2} />
    <Chair at={[2.14, 0, 1.35]} rotation={-Math.PI / 2} />
    <group name="entry-bench" position={[-.35, 0, 4.52]}>
      <Box at={[0, .47, 0]} size={[1.25, .14, .46]} mat={m.oak} />
      {[-.49, .49].map(x => <Box key={x} at={[x, .25, 0]} size={[.07, .42, .4]} mat={m.walnut} />)}
      <Box at={[.22, .57, 0]} size={[.65, .08, .39]} mat={m.linen} radius={.06} />
      <Books at={[-.38, .57, 0]} />
    </group>
    <Box at={[1.5, .08, 4.35]} size={[1.15, .025, .67]} mat={m.rug} radius={.025} />
  </group>
}
