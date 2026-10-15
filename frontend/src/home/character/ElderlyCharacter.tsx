import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AnimationClip, AnimationMixer, Group, LoadingManager, MathUtils, type AnimationAction, type SkinnedMesh, type Texture } from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { WAYPOINTS, routeBetween, type RoomId, type Waypoint } from './navigation'

export type CharacterCommand = { destination: RoomId | 'reset'; id: number }
export type CharacterStatus = { room: RoomId; destination: RoomId | null; phase: 'loading' | 'idle' | 'walking' | 'error' }

const ASSET_ROOT = '/models/madam-lee/'
const WALK_SPEED = .57 // metres per second: deliberately unhurried
const TURN_SPEED = 2.4 // radians per second

function inPlace(clip: AnimationClip) {
  const copy = clip.clone()
  // Rocketbox clips animate the Biped root in world space. Keep the vertical
  // gait, but let our waypoint controller own horizontal movement.
  const root = copy.tracks.find(track => track.name === 'Bip01.position')
  if (root) {
    const values = root.values
    for (let index = 0; index < values.length; index += 3) {
      values[index] = values[0]
      values[index + 2] = values[2]
    }
  }
  return copy
}

function disposeAvatar(group: Group) {
  group.traverse(object => {
    if ('isMesh' in object && object.isMesh) {
      const mesh = object as SkinnedMesh
      mesh.geometry.dispose()
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const maps = material as typeof material & Partial<Record<'map' | 'normalMap' | 'specularMap' | 'alphaMap', Texture>>
        for (const key of ['map', 'normalMap', 'specularMap', 'alphaMap'] as const) {
          maps[key]?.dispose()
        }
        material.dispose()
      }
    }
  })
}

/** Self-contained actor: loaded once, animated in the render loop, navigated on authored clear paths. */
export function ElderlyCharacter({ command, onStatus }: { command: CharacterCommand; onStatus: (status: CharacterStatus) => void }) {
  const shell = useRef<Group>(null)
  const [model, setModel] = useState<Group | null>(null)
  const mixer = useRef<AnimationMixer | null>(null)
  const actions = useRef<{ idle: AnimationAction; walk: AnimationAction } | null>(null)
  const gait = useRef<'idle' | 'walk'>('idle')
  const queue = useRef<Waypoint[]>([])
  const anchor = useRef<Waypoint>('bedroom')
  const destination = useRef<RoomId | null>(null)
  const { invalidate } = useThree()

  useEffect(() => {
    let active = true
    let loaded: Group | null = null
    let animationMixer: AnimationMixer | null = null
    const manager = new LoadingManager()
    manager.setURLModifier(url => {
      const file = decodeURIComponent(url).split(/[\\/]/).pop() || ''
      const aged = file === 'f003_head_color.tga' || file === 'f003_opacity_color.tga'
      return file.toLowerCase().endsWith('.tga')
        ? `${ASSET_ROOT}textures/${file.slice(0, -4)}${aged ? '_aged' : ''}.webp` : url
    })
    const loader = new FBXLoader(manager)
    Promise.all([
      loader.loadAsync(`${ASSET_ROOT}model.fbx`),
      loader.loadAsync(`${ASSET_ROOT}idle.fbx`),
      loader.loadAsync(`${ASSET_ROOT}walk.fbx`),
    ]).then(([avatar, idleFile, walkFile]) => {
      loaded = avatar
      if (!active) { disposeAvatar(avatar); return }
      avatar.scale.setScalar(.0095) // Rocketbox centimetres -> house metres; about 1.65 m tall
      avatar.traverse(object => {
        if ('isSkinnedMesh' in object && object.isSkinnedMesh) {
          const mesh = object as SkinnedMesh
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.frustumCulled = false
          // FBXLoader reads zero diffuse values from this source FBX. White
          // allows its supplied colour textures to show under house lighting.
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if ('color' in material) (material.color as { set: (value: string) => void }).set('#ffffff')
          }
        }
      })
      animationMixer = new AnimationMixer(avatar)
      const idle = animationMixer.clipAction(inPlace(idleFile.animations[0]))
      const walk = animationMixer.clipAction(inPlace(walkFile.animations[0]))
      walk.timeScale = .8
      idle.play()
      actions.current = { idle, walk }
      mixer.current = animationMixer
      setModel(avatar)
      onStatus({ room: anchor.current as RoomId, destination: null, phase: 'idle' })
      invalidate()
    }).catch(error => {
      console.error('Could not load Madam Lee model or animations', error)
      if (active) onStatus({ room: anchor.current as RoomId, destination: null, phase: 'error' })
    })
    return () => {
      active = false
      animationMixer?.stopAllAction()
      if (loaded) {
        animationMixer?.uncacheRoot(loaded)
        disposeAvatar(loaded)
      }
    }
  }, [invalidate, onStatus])

  useEffect(() => {
    if (command.id === 0 || !shell.current) return
    if (command.destination === 'reset') {
      queue.current = []
      anchor.current = 'bedroom'
      destination.current = null
      shell.current.position.set(WAYPOINTS.bedroom[0], .045, WAYPOINTS.bedroom[1])
      shell.current.rotation.y = 0
      onStatus({ room: 'bedroom', destination: null, phase: 'idle' })
      invalidate()
      return
    }
    const next = queue.current[0] ?? anchor.current
    const remaining = routeBetween(next, command.destination)
    queue.current = next === anchor.current ? remaining : [next, ...remaining]
    destination.current = command.destination
    if (!queue.current.length) {
      destination.current = null
      onStatus({ room: command.destination, destination: null, phase: 'idle' })
    } else {
      onStatus({ room: anchor.current as RoomId, destination: command.destination, phase: 'walking' })
    }
    invalidate()
  }, [command, invalidate, onStatus])

  useFrame((_, delta) => {
    const shellGroup = shell.current
    const animation = actions.current
    if (!shellGroup || !animation) return
    const frame = Math.min(delta, .05)
    const next = queue.current[0]
    if (next) {
      if (gait.current !== 'walk') {
        animation.walk.reset().play()
        animation.idle.crossFadeTo(animation.walk, .35, false)
        gait.current = 'walk'
      }
      const [x, z] = WAYPOINTS[next]
      const dx = x - shellGroup.position.x
      const dz = z - shellGroup.position.z
      const desired = Math.atan2(dx, dz) // source avatar faces local +Z
      const difference = Math.atan2(Math.sin(desired - shellGroup.rotation.y), Math.cos(desired - shellGroup.rotation.y))
      shellGroup.rotation.y += MathUtils.clamp(difference, -TURN_SPEED * frame, TURN_SPEED * frame)
      const remaining = Math.hypot(dx, dz)
      if (Math.abs(difference) < .42) {
        const step = Math.min(remaining, WALK_SPEED * frame)
        if (remaining > 0) {
          shellGroup.position.x += dx / remaining * step
          shellGroup.position.z += dz / remaining * step
        }
      }
      if (Math.hypot(x - shellGroup.position.x, z - shellGroup.position.z) < .025) {
        shellGroup.position.x = x
        shellGroup.position.z = z
        anchor.current = next
        queue.current.shift()
        if (!queue.current.length) {
          const arrived = destination.current
          destination.current = null
          onStatus({ room: (arrived ?? next) as RoomId, destination: null, phase: 'idle' })
        }
      }
    } else if (gait.current !== 'idle') {
      animation.idle.reset().play()
      animation.walk.crossFadeTo(animation.idle, .4, false)
      gait.current = 'idle'
    }
    mixer.current?.update(frame)
    invalidate() // idle breathing and gait remain visible with the demand-driven house canvas
  })

  return <group ref={shell} name="madam-lee-mei-ling" position={[WAYPOINTS.bedroom[0], .045, WAYPOINTS.bedroom[1]]}>
    {model && <primitive object={model} />}
  </group>
}
