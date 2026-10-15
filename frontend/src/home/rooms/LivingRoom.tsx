import { Art, Ball, Books, Box, Cylinder, Pipe, Plant } from '../primitives'
import { getMaterials } from '../materials'

export function LivingRoom() {
  const m = getMaterials()
  return <group name="living-room">
    <Box at={[-3.2, .085, 2.06]} size={[3.75, .045, 4.2]} mat={m.rug} radius={.15} />
    {[-4.98, -1.42].map(x => <Box key={x} at={[x, .111, 2.06]} size={[.028, .004, 3.96]} mat={m.cream} radius={0} />)}
    <group name="sofa" position={[-3.1, 0, .75]}>
      {[-1.05, 1.05].flatMap(x => [-.38, .38].map(z => <Cylinder key={`${x}${z}`} at={[x, .2, z]} radius={.055} height={.3} mat={m.walnut} />))}
      <Box at={[0, .38, 0]} size={[2.7, .35, 1.05]} mat={m.linen} radius={.14} />
      <Box at={[0, .82, -.43]} size={[2.7, .82, .26]} mat={m.linen} radius={.14} />
      {[-1.23, 1.23].map(x => <Box key={x} at={[x, .65, .02]} size={[.3, .57, 1.13]} mat={m.linen} radius={.14} />)}
      {[-.73, 0, .73].map(x => <group key={x}>
        <Box at={[x, .59, .07]} size={[.7, .21, .83]} mat={m.linen} radius={.085} />
        <Box at={[x, .88, -.29]} size={[.7, .61, .22]} mat={m.linen} radius={.09} rotation={[-.14, 0, 0]} />
      </group>)}
      <Box at={[.78, .9, -.04]} size={[.44, .46, .17]} mat={m.sage} rotation={[-.22, .1, -.2]} radius={.09} />
      <Box at={[.3, .86, .04]} size={[.42, .42, .16]} mat={m.blush} rotation={[-.27, -.13, .2]} radius={.085} />
      <Box at={[-.94, .73, .18]} size={[.39, .065, .85]} mat={m.cream} radius={.04} />
      <Box at={[-.94, .49, .57]} size={[.39, .49, .04]} mat={m.cream} radius={.02} />
      {[-1.07, -.99, -.91, -.83].map(x => <Box key={x} at={[x, .27, .58]} size={[.012, .1, .012]} mat={m.linen} />)}
    </group>
    <group name="coffee-table" position={[-3.08, 0, 2.55]}>
      {[-1, 1].flatMap(x => [-1, 1].map(z => <Cylinder key={`${x}${z}`} at={[x * .36, .31, z * .3]} radius={.055} height={.48} mat={m.walnut} />))}
      <Cylinder at={[0, .57, 0]} radius={.69} height={.09} mat={m.oak} />
      <Books at={[-.18, .64, .1]} /><Plant at={[.22, .63, -.16]} scale={.25} />
      <Cylinder at={[.27, .64, .25]} radius={.1} height={.025} mat={m.porcelain} />
      <Cylinder at={[.27, .7, .25]} radius={.059} height={.09} mat={m.cream} />
      <Cylinder at={[.27, .749, .25]} radius={.047} height={.005} mat={m.walnut} />
    </group>
    <group name="television-console" position={[-5.02, 0, 1.55]} rotation={[0, Math.PI / 2, 0]}>
      <Box at={[0, .4, 0]} size={[2.1, .57, .48]} mat={m.oak} />
      {[-.67, 0, .67].map(x => <Box key={x} at={[x, .4, .25]} size={[.61, .4, .02]} mat={m.walnut} />)}
      <Box at={[0, 1.19, 0]} size={[1.72, .99, .075]} mat={m.dark} radius={.035} />
      <Box at={[0, 1.2, .041]} size={[1.62, .89, .01]} mat={m.screen} radius={.025} />
      {[-.53, .53].map(x => <Box key={x} at={[x, .72, .06]} size={[.06, .14, .3]} mat={m.dark} />)}
    </group>
    <Plant at={[-4.9, .08, -.35]} scale={.85} />
    <group name="telephone-table" position={[-4.72, 0, 4.05]}>
      <Box at={[0, .6, 0]} size={[.75, .075, .65]} mat={m.oak} />
      {[-.28, .28].flatMap(x => [-.23, .23].map(z => <Box key={`${x}${z}`} at={[x, .32, z]} size={[.055, .58, .055]} mat={m.walnut} />))}
      <group name="telephone" position={[0, .69, 0]}>
        <Box size={[.37, .1, .38]} mat={m.dark} radius={.05} rotation={[.1, 0, 0]} />
        <Box at={[.055, .07, -.08]} size={[.16, .012, .09]} mat={m.sage} />
        {Array.from({ length: 12 }, (_, i) => <Box key={i} at={[.005 + (i % 3) * .052, .065, .015 + Math.floor(i / 3) * .043]} size={[.035, .015, .027]} mat={m.cream} radius={.007} />)}
        <Box at={[-.13, .12, 0]} size={[.1, .09, .36]} mat={m.dark} radius={.045} />
        {[-.13, .13].map(z => <Ball key={z} at={[-.13, .1, z]} size={[.075, .055, .065]} mat={m.dark} />)}
        <Pipe points={[[-.17, .04, -.12], [-.29, -.03, -.15], [-.29, -.03, .15], [-.15, .06, .17]]} radius={.012} mat={m.dark} />
      </group>
    </group>
    <group name="console" position={[-3.1, 0, -.73]}>
      <Box at={[0, .58, 0]} size={[1.35, .075, .36]} mat={m.walnut} />
      {[-.55, .55].map(x => <Box key={x} at={[x, .31, 0]} size={[.05, .54, .3]} mat={m.walnut} />)}
      <Books at={[-.3, .65, 0]} /><Plant at={[.4, .63, 0]} scale={.27} />
    </group>
    <Art at={[-5.36, 1.1, -.4]} rotation={Math.PI / 2} width={.65} height={.65} />
  </group>
}
