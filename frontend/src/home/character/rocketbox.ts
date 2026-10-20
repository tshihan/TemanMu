import { AnimationClip, Group, LoadingManager, type SkinnedMesh, type Texture } from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

// Rocketbox avatars are authored in centimetres; this keeps every character in house metres.
export const ROCKETBOX_SCALE = .0095

/** FBX loader that serves the bundled WebP copies in place of the source TGA textures. */
export function rocketboxLoader(assetRoot: string, rename: (stem: string) => string = stem => stem) {
  const manager = new LoadingManager()
  manager.setURLModifier(url => {
    const file = decodeURIComponent(url).split(/[\\/]/).pop() || ''
    return file.toLowerCase().endsWith('.tga') ? `${assetRoot}textures/${rename(file.slice(0, -4))}.webp` : url
  })
  return new FBXLoader(manager)
}

export function prepareAvatar(avatar: Group, scale: number) {
  avatar.scale.setScalar(scale)
  avatar.traverse(object => {
    if ('isSkinnedMesh' in object && object.isSkinnedMesh) {
      const mesh = object as SkinnedMesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      // FBXLoader reads zero diffuse values from Rocketbox FBX files. White
      // allows their supplied colour textures to show under house lighting.
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if ('color' in material) (material.color as { set: (value: string) => void }).set('#ffffff')
      }
    }
  })
}

export function inPlace(clip: AnimationClip) {
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

export function disposeAvatar(group: Group) {
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
