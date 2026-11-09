import { useEffect, useRef, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { OrthographicCamera, PCFShadowMap, Vector3 } from 'three'
import { attentionStatus, initialHomes, needsAttention, plots, statusColors, type DemoHome } from './demoData'

type SceneProps = { homes: DemoHome[]; selected: string; filter: 'unresolved_concern' | 'unusual_inactivity' | null; top: boolean; zoom: number; reset: number; onUnavailable: () => void; labels: RefObject<HTMLDivElement | null> }

function fitCamera(camera: OrthographicCamera, width: number, height: number, zoom: number) {
  camera.zoom = Math.min(width / 168, height / 112) * zoom
  camera.updateProjectionMatrix()
}

function Box({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={at} receiveShadow castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={1} /></mesh>
}

function Camera({ top, zoom, reset }: Pick<SceneProps, 'top' | 'zoom' | 'reset'>) {
  const { camera, size, invalidate } = useThree()
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  useEffect(() => {
    camera.position.set(top ? 6 : 98, top ? 180 : 108, top ? 6.01 : 130)
    camera.up.set(0, 1, 0)
    controls.current?.target.set(6, 0, 6)
    camera.lookAt(6, 0, 6)
    if (camera instanceof OrthographicCamera) fitCamera(camera, size.width, size.height, zoom)
    controls.current?.update()
    invalidate()
  }, [camera, size, top, zoom, reset, invalidate])
  return <OrbitControls ref={controls} makeDefault enableDamping={false} enableRotate={!top} minZoom={1.4} maxZoom={18} maxPolarAngle={Math.PI / 2.15} />
}

function Tree({ x, z, small = false }: { x: number; z: number; small?: boolean }) {
  const s = small ? 0.7 : 1
  return <group position={[x, 0, z]} scale={s}>
    <Box at={[0, 1, 0]} size={[0.35, 2, 0.35]} color="#8b7b62" />
    <mesh position={[0, 3, 0]} castShadow><icosahedronGeometry args={[1.8, 1]} /><meshStandardMaterial color="#7f9367" flatShading /></mesh>
    <mesh position={[0.6, 2.5, 0.5]} castShadow><icosahedronGeometry args={[1.3, 0]} /><meshStandardMaterial color="#98a875" flatShading /></mesh>
  </group>
}

function ProjectLabels({ labels }: Pick<SceneProps, 'labels'>) {
  const projected = useRef(new Vector3())
  useFrame(({ camera, size }) => {
    const placed: { left: number; right: number; top: number; bottom: number }[] = []
    labels.current?.querySelectorAll<HTMLElement>('[data-map-x]').forEach(element => {
      projected.current.set(Number(element.dataset.mapX), Number(element.dataset.mapY ?? 5.5), Number(element.dataset.mapZ)).project(camera)
      const { x, y, z } = projected.current
      const visible = z >= -1 && z <= 1 && Math.abs(x) <= 1 && Math.abs(y) <= 1
      const anchorX = (x * .5 + .5) * size.width
      const anchorY = (-y * .5 + .5) * size.height
      const width = element.offsetWidth, height = element.offsetHeight
      const center = Math.max(width / 2 + 8, Math.min(size.width - width / 2 - 8, anchorX))
      let bottom = anchorY
      if (element instanceof HTMLButtonElement && visible) {
        for (const other of placed) {
          if (center - width / 2 < other.right + 8 && center + width / 2 > other.left - 8 && bottom - height < other.bottom + 8 && bottom > other.top - 8) bottom = other.top - 8
        }
        bottom = Math.max(height + 8, bottom)
        placed.push({ left: center - width / 2, right: center + width / 2, top: bottom - height, bottom })
      }
      element.style.transform = `translate(${center}px, ${bottom}px) translate(-50%, -100%)`
      element.style.visibility = visible ? 'visible' : 'hidden'
      const leader = element.dataset.homeId && labels.current?.querySelector<SVGLineElement>(`[data-map-leader="${element.dataset.homeId}"]`)
      if (leader) {
        leader.setAttribute('x1', String(anchorX)); leader.setAttribute('y1', String(anchorY))
        leader.setAttribute('x2', String(center)); leader.setAttribute('y2', String(bottom))
        leader.style.visibility = visible ? 'visible' : 'hidden'
      }
    })
  })
  return null
}

function Model({ homes, selected, filter }: Pick<SceneProps, 'homes' | 'selected' | 'filter'>) {
  return <group>
    <Box at={[5, -0.8, 7]} size={[124, 1.4, 86]} color="#bfc5ab" />
    <Box at={[5, -0.05, 7]} size={[121, 0.3, 83]} color="#d7d9c3" />
    {[-18, 2, 21, 35].map((z, i) => <group key={z}>
      <Box at={[i > 1 ? 24 : 4, 0.2, z]} size={[i > 1 ? 76 : 116, 0.14, 5]} color="#a5a49a" />
      {Array.from({ length: i > 1 ? 15 : 24 }, (_, j) => <Box key={j} at={[(i > 1 ? -10 : -51) + j * 4.7, 0.29, z]} size={[1.7, 0.025, 0.12]} color="#ece8dc" />)}
    </group>)}
    <Box at={[56, 0.2, 8]} size={[5, 0.16, 64]} color="#a5a49a" />
    <Box at={[17, 0.2, 14]} size={[5, 0.16, 42]} color="#a5a49a" />
    <Box at={[-51, 0.2, -19]} size={[5, 0.16, 12]} color="#a5a49a" />
    <Box at={[35, 0.22, 20]} size={[29, 0.2, 12]} color="#a6b48b" />
    <Box at={[35, 0.4, 20]} size={[26, 0.1, 1.4]} color="#e6d9bb" />
    <Box at={[33, 0.4, 20]} size={[1.4, 0.1, 11]} color="#e6d9bb" />
    <Box at={[37, 1.6, 20]} size={[4, 3, 3]} color="#e5d6b8" />
    <mesh position={[37, 3.6, 20]} rotation={[0, Math.PI / 4, 0]} scale={[3.4, 1, 2.7]}><coneGeometry args={[1, 1.8, 4]} /><meshStandardMaterial color="#877963" /></mesh>
    {plots.map(plot => {
      const home = homes.find(h => h.x === plot.x && h.z === plot.z)
      const active = home && needsAttention(home) && (!filter || attentionStatus(home) === filter)
      const isSelected = active && home.id === selected
      const color = active ? statusColors[home.status] : '#b4a99b'
      return <group key={plot.id} position={[plot.x, 0.35, plot.z]}>
        <Box at={[0, 0.1, 0]} size={[plot.twin ? 4.2 : 3.2, 0.2, 7]} color={isSelected ? '#d8ab8a' : '#e7e1d2'} />
        <Box at={[0, 1.8, 0]} size={[plot.twin ? 3.8 : 2.9, 3.4, 4.2]} color={active ? '#faf1df' : '#ddd6c7'} />
        <mesh position={[0, 4.1, 0]} rotation={[0, Math.PI / 4, 0]} scale={[plot.twin ? 3.05 : 2.35, 1, 3.4]} castShadow>
          <coneGeometry args={[1, 1.4, 4]} /><meshStandardMaterial color={color} roughness={1} />
        </mesh>
        <Box at={[0, 1, 2.12]} size={[0.75, 1.7, 0.08]} color="#928474" />
        <Box at={[-0.8, 2.7, 2.13]} size={[0.6, 0.7, 0.08]} color="#748789" />
        {isSelected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.28, 0]}><ringGeometry args={[4.3, 4.65, 64]} /><meshBasicMaterial color="#8b4429" /></mesh>}
      </group>
    })}
    {Array.from({ length: 25 }, (_, i) => <Tree key={`north-${i}`} x={-54 + i * 4.7} z={-32} small={i % 3 === 0} />)}
    {Array.from({ length: 12 }, (_, i) => <Tree key={`west-${i}`} x={-52 + i * 3.6} z={-5 + i * 4.5} />)}
    {[23, 28, 43, 48].map(x => <Tree key={x} x={x} z={19} small />)}
    {Array.from({ length: 12 }, (_, i) => <Tree key={`south-${i}`} x={2 + i * 4.7} z={47} small />)}
    <Box at={[61, 1.5, 1]} size={[5, 3, 5]} color="#f0e7d6" />
    <Box at={[61, 3.4, 1]} size={[6, 0.8, 6]} color="#8e7c66" />
    <Box at={[59, 2, -3]} size={[1, 4, 1]} color="#e8dcc6" />
    <Box at={[59, 2, 5]} size={[1, 4, 1]} color="#e8dcc6" />
    <Box at={[59, 4, 1]} size={[1.3, 0.6, 9]} color="#a78b67" />
  </group>
}

export default function LandedScene(props: SceneProps) {
  return <Canvas orthographic frameloop="demand" shadows={{ type: PCFShadowMap }} dpr={[1, 1.7]} camera={{ position: [98, 108, 130], zoom: 5, near: 0.1, far: 800 }}
    onCreated={({ gl }) => {
      const canvas = gl.domElement
      canvas.addEventListener('webglcontextlost', () => { if (canvas.isConnected) props.onUnavailable() }, { once: true })
    }}
    fallback={<p className="lt-scene-message">3D is unavailable in this browser. Use Needs attention or the official plan.</p>}>
    <color attach="background" args={['#edeadb']} />
    <ambientLight intensity={1.6} />
    <directionalLight position={[-50, 100, 50]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90} shadow-bias={-0.002} />
    <Camera top={props.top} zoom={props.zoom} reset={props.reset} />
    <ProjectLabels labels={props.labels} />
    <Model homes={props.homes.length ? props.homes : initialHomes} selected={props.selected} filter={props.filter} />
  </Canvas>
}
