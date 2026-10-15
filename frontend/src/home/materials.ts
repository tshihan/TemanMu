import * as THREE from 'three'

// Local, deterministic textures: the home needs no CDN assets or network requests.
function texture(kind: 'oak' | 'walnut' | 'linen' | 'rug' | 'tile') {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  let seed = 123
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const wood = kind === 'oak' || kind === 'walnut'
  ctx.fillStyle = { oak: '#c59a68', walnut: '#846044', linen: '#eee3d2', rug: '#c8bda8', tile: '#b8b8ae' }[kind]
  ctx.fillRect(0, 0, 512, 512)
  if (wood) {
    for (let i = 0; i < 2400; i++) {
      const y = random() * 512
      ctx.strokeStyle = `rgba(${random() > .5 ? '65,38,19' : '250,221,169'},${.02 + random() * .12})`
      ctx.lineWidth = .3 + random() * 1.1
      ctx.beginPath(); ctx.moveTo(0, y)
      ctx.bezierCurveTo(170, y + random() * 5, 340, y - random() * 5, 512, y + random() * 3)
      ctx.stroke()
    }
    if (kind === 'oak') {
      for (let row = 0; row < 8; row++) {
        ctx.fillStyle = 'rgba(70,42,20,.22)'; ctx.fillRect(0, row * 64, 512, 1.5)
        ctx.fillRect((row % 3) * 170 + 40, row * 64, 1, 64)
      }
    }
  } else if (kind === 'tile') {
    for (let i = 0; i < 16000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${random() * .13})`
      ctx.fillRect(random() * 512, random() * 512, 2, 2)
    }
    ctx.fillStyle = '#ddd9d0'; ctx.fillRect(0, 0, 512, 3); ctx.fillRect(0, 0, 3, 512)
  } else {
    for (let i = 0; i < 512; i += 2) {
      ctx.strokeStyle = `rgba(70,55,37,${.03 + random() * .09})`
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke()
      ctx.strokeStyle = `rgba(255,255,255,${.1 + random() * .18})`
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
    }
  }
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(wood ? 2 : 3, kind === 'tile' ? 3 : 2)
  map.anisotropy = 8
  return map
}

export type Materials = ReturnType<typeof createMaterials>
function createMaterials() {
  const matte = (color: string, roughness = .75) => new THREE.MeshStandardMaterial({ color, roughness })
  const oak = texture('oak'), walnut = texture('walnut'), linen = texture('linen'), rug = texture('rug'), tile = texture('tile')
  return {
    oak: new THREE.MeshStandardMaterial({ map: oak, roughness: .65 }),
    walnut: new THREE.MeshStandardMaterial({ map: walnut, roughness: .6 }),
    linen: new THREE.MeshStandardMaterial({ map: linen, roughness: .97 }),
    rug: new THREE.MeshStandardMaterial({ map: rug, roughness: 1 }),
    tile: new THREE.MeshStandardMaterial({ map: tile, roughness: .65 }),
    wall: matte('#eee5d5'), trim: matte('#d9cfb9'), edge: matte('#555c51'),
    sage: matte('#82917c'), green: matte('#345b35'), leaf: matte('#648849'),
    terracotta: matte('#b56f50'), blush: matte('#cf9a87'), cream: matte('#fff4dd'),
    porcelain: matte('#faf9f1', .2), dark: matte('#292f2c', .38), soil: matte('#42382b'),
    brass: new THREE.MeshStandardMaterial({ color: '#b49858', metalness: .75, roughness: .3 }),
    steel: new THREE.MeshStandardMaterial({ color: '#aeb8b6', metalness: .7, roughness: .25 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bfdcd6', transparent: true, opacity: .2, roughness: .1, metalness: .12, depthWrite: false, side: THREE.DoubleSide }),
    mirror: new THREE.MeshStandardMaterial({ color: '#bdcdd0', metalness: .35, roughness: .12 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#ffe7b3', emissive: '#ffcc80', emissiveIntensity: .45, roughness: .8 }),
    screen: new THREE.MeshStandardMaterial({ color: '#202f2b', roughness: .15, metalness: .2 }),
  }
}
let cached: Materials | undefined
export function getMaterials() { return cached ??= createMaterials() }
