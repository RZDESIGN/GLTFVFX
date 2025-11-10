import * as THREE from 'three'

const clamp01 = (v) => Math.max(0, Math.min(1, v))

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return { r: 255, g: 255, b: 255 }
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  }
}

const lerp = (a, b, t) => a + (b - a) * t

const mixRgb = (a, b, t) => ({
  r: Math.round(lerp(a.r, b.r, t)),
  g: Math.round(lerp(a.g, b.g, t)),
  b: Math.round(lerp(a.b, b.b, t))
})

const rgbToCss = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`

const vary = (v, amount) => {
  return clamp01(v + (Math.random() * 2 - 1) * amount)
}

const varyRgb = (rgb, amount = 0.08) => {
  return {
    r: Math.round(clamp01(rgb.r / 255 + (Math.random() * 2 - 1) * amount) * 255),
    g: Math.round(clamp01(rgb.g / 255 + (Math.random() * 2 - 1) * amount) * 255),
    b: Math.round(clamp01(rgb.b / 255 + (Math.random() * 2 - 1) * amount) * 255)
  }
}

/**
 * Generate a small blocky canvas texture using two base colors.
 * The look aims to mimic simple voxel game textures: chunky cells with subtle noise.
 */
export const generateBlockyCanvas = (
  primaryHex = '#ffffff',
  secondaryHex = '#cccccc',
  resolution = 16,
  options = {}
) => {
  const size = Math.max(4, Math.min(128, Math.floor(resolution)))
  const cellSize = Math.max(1, Math.floor(size / (options.cellsPerSide || 4)))
  const noise = options.noiseAmount ?? 0.08

  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d', { willReadFrequently: false })

  const a = hexToRgb(primaryHex)
  const b = hexToRgb(secondaryHex)

  for (let y = 0; y < size; y += cellSize) {
    for (let x = 0; x < size; x += cellSize) {
      // Choose a base mix between primary and secondary per cell
      const t = Math.random() * 0.9 + 0.05
      const base = mixRgb(a, b, t)
      const varied = varyRgb(base, noise)

      ctx.fillStyle = rgbToCss(varied)
      ctx.fillRect(x, y, cellSize, cellSize)

      // Add a subtle highlight/shadow edge for "blocky" depth
      if (cellSize >= 3) {
        const shade = Math.random() < 0.5 ? 12 : -12
        ctx.fillStyle = rgbToCss({
          r: Math.max(0, Math.min(255, varied.r + shade)),
          g: Math.max(0, Math.min(255, varied.g + shade)),
          b: Math.max(0, Math.min(255, varied.b + shade))
        })
        // Randomly choose an edge to shade
        if (Math.random() < 0.5) {
          ctx.fillRect(x, y, cellSize, 1)
        } else {
          ctx.fillRect(x, y + cellSize - 1, cellSize, 1)
        }
      }
    }
  }

  return c
}

export const createCanvasTexture = (canvas) => {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export const generateBlockyTexture = (
  primaryHex = '#ffffff',
  secondaryHex = '#cccccc',
  resolution = 16,
  options = {}
) => {
  const canvas = generateBlockyCanvas(primaryHex, secondaryHex, resolution, options)
  return createCanvasTexture(canvas)
}

export const createTextureFromDataURL = async (dataUrl) => {
  if (!dataUrl) return null
  const img = new Image()
  img.crossOrigin = 'anonymous'
  const loadPromise = new Promise((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
  })
  img.src = dataUrl
  await loadPromise
  const tex = new THREE.Texture(img)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export const disposeTexture = (texture) => {
  try {
    if (texture && typeof texture.dispose === 'function') {
      texture.dispose()
    }
  } catch (_) {}
}


