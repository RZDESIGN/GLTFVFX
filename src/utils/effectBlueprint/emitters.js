import { clamp } from './math'

export const computeEmissionPosition = (shape, spread, random, style, params) => {
  const surfaceOnly = Boolean(params?.emissionSurfaceOnly)

  if (style.customEmitter === 'vortex') {
    const height = style.vortexHeight ?? spread * 2.3
    const layers = Math.max(2, Math.floor(style.vortexLayers ?? 16))
    const layerIndex = Math.min(layers - 1, Math.floor(random(30) * layers))
    const layerT = layers > 1 ? layerIndex / (layers - 1) : 0

    const maxRadius =
      (style.vortexBaseRadius ?? spread * 1.05) * (style.spreadMultiplier ?? 1)
    const minRadius = Math.max(
      0.02,
      style.vortexTipRadius ?? maxRadius * 0.18
    )
    const radiusFalloff = style.vortexRadiusFalloff ?? 1.35
    const radiusRange = Math.max(0.001, maxRadius - minRadius)
    const radius = minRadius + radiusRange * Math.pow(layerT, radiusFalloff)

    const angle = random(31) * Math.PI * 2
    const radialJitter = (style.vortexJitter ?? 0.06) * maxRadius
    const verticalJitter = (style.vortexVerticalJitter ?? 0.04) * height
    const x = Math.cos(angle) * radius + (random(32) - 0.5) * radialJitter
    const z = Math.sin(angle) * radius + (random(33) - 0.5) * radialJitter
    const y = -height * 0.5 + layerT * height + (random(34) - 0.5) * verticalJitter

    return {
      x,
      y,
      z,
      angle,
      radius,
      baseRadius: maxRadius,
      tipRadius: minRadius,
      layerT,
      height
    }
  }

  if (style.customEmitter === 'rainbowArc') {
    const radius = style.arcRadius ?? spread * 1.1
    const startAngle = style.arcStartAngle ?? Math.PI * 0.1
    const endAngle = style.arcEndAngle ?? Math.PI * 0.9
    const angleRange = Math.max(1e-5, endAngle - startAngle)
    const t = random(35)
    const angle = startAngle + angleRange * t
    const thickness = style.arcThickness ?? 0.4
    const heightOffset = style.arcHeightOffset ?? 0
    const lateral = (random(36) - 0.5) * thickness
    const layerT = thickness !== 0 ? clamp((lateral / thickness) + 0.5, 0, 1) : 0.5

    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius + heightOffset
    const z = lateral

    return {
      x,
      y,
      z,
      angle,
      radius,
      arcRadius: radius,
      arcAngleRange: { start: startAngle, end: endAngle },
      lateral,
      heightOffset,
      layerT
    }
  }

  switch (shape) {
    case 'sphere': {
      const u = random(10)
      const v = random(11)
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const baseRadius = Math.max(spread, 0)
      const radius = surfaceOnly
        ? baseRadius
        : baseRadius * Math.cbrt(Math.max(0, random(12)))
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)
      return { x, y, z, radius }
    }
    case 'cone': {
      const angle = random(13) * Math.PI * 2
      const heightRange = spread * (style.coneHeightMultiplier ?? 2)
      const heightT = random(14)
      const height = heightRange * heightT
      const radiusMax = spread * (style.coneRadiusMultiplier ?? 0.6)
      const baseRadius = Math.max(0, radiusMax)
      const radius = surfaceOnly
        ? baseRadius * clamp(heightRange > 0 ? height / heightRange : 0, 0, 1)
        : baseRadius * Math.sqrt(Math.max(0, random(15)))
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      const y = height
      return { x, y, z, radius, height }
    }
    case 'ring': {
      const angle = random(16) * Math.PI * 2
      const thickness = surfaceOnly ? 0 : (style.ringThickness ?? 0.35)
      const radius = spread * (style.ringRadiusMultiplier ?? 0.8)
      const radialOffset = thickness * (random(17) - 0.5)
      const sampleRadius = surfaceOnly ? radius : radius + radialOffset
      const x = sampleRadius * Math.cos(angle)
      const z = sampleRadius * Math.sin(angle)
      const y = (random(19) - 0.5) * (style.ringHeight ?? 0.3)
      return { x, y, z, angle, radius }
    }
    case 'disc': {
      const angle = random(40) * Math.PI * 2
      const baseRadius = Math.max(spread, 0)
      const radius = surfaceOnly
        ? baseRadius
        : baseRadius * Math.sqrt(Math.max(0, random(41)))
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      const y = 0
      return { x, y, z, angle, radius }
    }
    case 'box':
    default: {
      const half = spread
      if (surfaceOnly) {
        const axis = Math.floor(random(42) * 3)
        const sign = random(43) > 0.5 ? 1 : -1
        const coords = [
          (random(44) - 0.5) * half * 2,
          (random(45) - 0.5) * half * 2,
          (random(46) - 0.5) * half * 2
        ]
        coords[axis] = sign * half
        return { x: coords[0], y: coords[1], z: coords[2] }
      }
      const x = (random(20) - 0.5) * half * 2
      const y = (random(21) - 0.5) * half * 2
      const z = (random(22) - 0.5) * half * 2
      return { x, y, z }
    }
  }
}
