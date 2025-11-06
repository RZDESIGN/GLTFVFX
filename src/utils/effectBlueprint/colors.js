import { clamp, wrap01 } from './math'

export const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return { r: 1, g: 1, b: 1 }
  }
  const bigint = parseInt(normalized, 16)
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  }
}

export const rgbToHex = ({ r, g, b }) => {
  const to255 = (value) => {
    const clamped = clamp(Math.round(value * 255), 0, 255)
    return clamped.toString(16).padStart(2, '0')
  }
  return `#${to255(r)}${to255(g)}${to255(b)}`
}

export const mixHexColors = (hexA, hexB, t) => {
  const colorA = hexToRgb(hexA)
  const colorB = hexToRgb(hexB)
  return rgbToHex({
    r: colorA.r + (colorB.r - colorA.r) * t,
    g: colorA.g + (colorB.g - colorA.g) * t,
    b: colorA.b + (colorB.b - colorA.b) * t
  })
}

export const normalizeGradientStops = (stops) => {
  if (!Array.isArray(stops)) return null
  const normalized = stops
    .map(stop => {
      if (!stop) return null
      const t = clamp(Number(stop.stop ?? stop.t ?? 0), 0, 1)
      const colorValue = stop.color || stop.value || '#ffffff'
      const rgb = hexToRgb(colorValue)
      return { t, color: rgb }
    })
    .filter(entry => entry !== null)
    .sort((a, b) => a.t - b.t)

  if (!normalized.length) {
    return null
  }
  return normalized
}

export const sampleGradient = (stops, t, { wrap = false } = {}) => {
  if (!stops || stops.length === 0) {
    return { r: 1, g: 1, b: 1 }
  }
  let target = wrap ? wrap01(t) : clamp(t, 0, 1)

  for (let i = 0; i < stops.length - 1; i++) {
    const current = stops[i]
    const next = stops[i + 1]
    if (target >= current.t && target <= next.t) {
      const span = Math.max(1e-6, next.t - current.t)
      const alpha = (target - current.t) / span
      return {
        r: current.color.r + (next.color.r - current.color.r) * alpha,
        g: current.color.g + (next.color.g - current.color.g) * alpha,
        b: current.color.b + (next.color.b - current.color.b) * alpha
      }
    }
  }

  if (target <= stops[0].t) {
    return { ...stops[0].color }
  }
  return { ...stops[stops.length - 1].color }
}

