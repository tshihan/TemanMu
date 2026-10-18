import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { getMaterials } from './materials'

type V3 = [number, number, number]
type M = THREE.Material
const boxes = new Map<string, THREE.BufferGeometry>()
const sphere = new THREE.SphereGeometry(1, 20, 12)
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24)
export function Box({ at = [0, 0, 0], size, mat, radius = .025, rotation, name }: { at?: V3; size: V3; mat: M; radius?: number; rotation?: V3; name?: string }) {
  const key = `${size.join(',')}:${radius}`
  if (!boxes.has(key)) boxes.set(key, radius ? new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 2)) : new THREE.BoxGeometry(...size))
  return <mesh name={name} position={at} rotation={rotation} geometry={boxes.get(key)} material={mat} castShadow receiveShadow dispose={null} />
}
export function Ball({ at = [0, 0, 0], size, mat, rotation }: { at?: V3; size: V3; mat: M; rotation?: V3 }) {
  return <mesh position={at} scale={size} rotation={rotation} geometry={sphere} material={mat} castShadow receiveShadow dispose={null} />
}
export function Cylinder({ at = [0, 0, 0], radius, height, mat, rotation }: { at?: V3; radius: number; height: number; mat: M; rotation?: V3 }) {
  return <mesh position={at} scale={[radius, height, radius]} rotation={rotation} geometry={cylinder} material={mat} castShadow receiveShadow dispose={null} />
}
export function Pipe({ points, radius = .025, mat }: { points: V3[]; radius?: number; mat: M }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 8, false), [points, radius])
  return <mesh geometry={geometry} material={mat} castShadow />
}
export function Plant({ at, scale = 1 }: { at: V3; scale?: number }) {
  const m = getMaterials()
  return <group name="potted-plant" position={at} scale={scale}>
    <mesh position={[0, .22, 0]} castShadow receiveShadow><cylinderGeometry args={[.23, .17, .44, 24]} /><primitive object={m.cream} attach="material" /></mesh>
    <Cylinder at={[0, .44, 0]} radius={.205} height={.02} mat={m.soil} />
    {Array.from({ length: 9 }, (_, i) => {
      const angle = i * 2.4, r = .16 + (i % 3) * .06, y = .64 + (i % 3) * .18
      return <group key={i} rotation={[0, angle, 0]}>
        <Pipe points={[[0, .42, 0], [r / 2, y, 0], [r, y + .14, 0]]} radius={.013} mat={m.green} />
        <Ball at={[r + .08, y + .12, 0]} size={[.12, .29, .047]} rotation={[0, 0, -.8]} mat={i % 2 ? m.green : m.leaf} />
      </group>
    })}
  </group>
}
export function Lamp({ at, lit = true }: { at: V3; lit?: boolean }) {
  const m = getMaterials()
  return <group position={at} name="table-lamp">
    <Cylinder at={[0, .025, 0]} radius={.15} height={.05} mat={m.brass} />
    <Cylinder at={[0, .21, 0]} radius={.025} height={.4} mat={m.brass} />
    <mesh position={[0, .42, 0]} castShadow><cylinderGeometry args={[.16, .22, .27, 32]} /><primitive object={lit ? m.lamp : m.linen} attach="material" /></mesh>
    <Ball at={[0, .42, 0]} size={[.09, .09, .09]} mat={lit ? m.lamp : m.linen} />
    {lit && <pointLight position={[0, .44, 0]} color="#ffe0a0" intensity={.5} distance={2.6} decay={2} />}
  </group>
}
export function Books({ at }: { at: V3 }) {
  const m = getMaterials()
  return <group position={at}>{[m.sage, m.linen, m.blush].map((mat, i) => <Box key={i} at={[i * .015, i * .055, 0]} size={[.3, .05, .22]} rotation={[0, i * .12, 0]} mat={mat} radius={.008} />)}</group>
}
export function Art({ at, width = 1, height = .8, rotation = 0 }: { at: V3; width?: number; height?: number; rotation?: number }) {
  const m = getMaterials()
  return <group name="botanical-wall-art" position={at} rotation={[0, rotation, 0]}>
    <Box size={[width, height, .055]} mat={m.walnut} />
    <Box at={[0, 0, .034]} size={[width - .08, height - .08, .012]} mat={m.cream} radius={0} />
    <Ball at={[-width * .14, .07, .047]} size={[width * .2, height * .3, .008]} mat={m.sage} rotation={[0, 0, -.3]} />
    <Ball at={[width * .18, -height * .15, .05]} size={[width * .22, height * .18, .008]} mat={m.terracotta} />
    <Box at={[0, -.1, .061]} size={[.012, height * .6, .008]} mat={m.walnut} radius={0} rotation={[0, 0, -.2]} />
  </group>
}
