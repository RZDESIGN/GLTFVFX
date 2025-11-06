import { clamp, wrap01 } from './math'
import {
  mixHexColors,
  normalizeGradientStops,
  sampleGradient,
  rgbToHex
} from './colors'
import { createRandomGenerator } from './random'
import { computeEmissionPosition } from './emitters'
import {
  addVectors,
  normalizeVector,
  scaleVector,
  toVector3,
  vectorLength
} from './vectors'

export const buildParticleState = (params, style, index, totalCount = 1) => {
  const random = createRandomGenerator(params.effectType, index)
  const baseSize = Math.max(0.02, params.particleSize * (style.sizeMultiplier ?? 1))
  const sizeVariation = (random(1) - 0.5) * (style.sizeJitter ?? 0) * baseSize * 2
  const sizeScalar = Math.max(0.02, baseSize + sizeVariation)

  const scaleVariance = style.scaleVariance || [0, 0, 0]
  const scale = {
    x: Math.max(
      0.02,
      sizeScalar * (style.baseScale[0] ?? 1) *
        (1 - (scaleVariance[0] || 0) / 2 + random(2) * (scaleVariance[0] || 0))
    ),
    y: Math.max(
      0.02,
      sizeScalar * (style.baseScale[1] ?? 1) *
        (1 - (scaleVariance[1] || 0) / 2 + random(3) * (scaleVariance[1] || 0))
    ),
    z: Math.max(
      0.02,
      sizeScalar * (style.baseScale[2] ?? 1) *
        (1 - (scaleVariance[2] || 0) / 2 + random(4) * (scaleVariance[2] || 0))
    )
  }

  const colorMix =
    clamp(
      (style.colorBias ?? 0.5) +
        (random(5) - 0.5) * (style.colorVariance ?? 0.2),
      0,
      1
    )
  let color = mixHexColors(params.primaryColor, params.secondaryColor, colorMix)

  const [opacityMin, opacityMax] = style.opacityRange || [1, 1]
  const opacity =
    opacityMin + random(6) * Math.max(0, opacityMax - opacityMin)

  const emissiveVariance = style.emissiveVariance ?? 0.15
  const emissiveIntensity =
    params.glowIntensity *
    (style.emissiveMultiplier ?? 1.2) *
    (0.8 + random(7) * emissiveVariance)

  const spread = params.spread * (style.spreadMultiplier ?? 1)
  const emission = computeEmissionPosition(
    params.emissionShape,
    spread,
    random,
    style,
    params
  )

  let {
    x,
    y,
    z,
    angle: emissionAngle,
    radius: emissionRadius,
    baseRadius: emissionBaseRadius,
    tipRadius: emissionTipRadius,
    layerT: emissionLayer,
    height: emissionHeight
  } = emission

  if (style.customEmitter === 'vortex') {
    const radialJitterScale = (style.radialJitter ?? 0) * 0.3
    const verticalJitterScale = (style.verticalJitter ?? 0) * 0.3
    x *= 1 + (random(8) - 0.5) * radialJitterScale
    z *= 1 + (random(9) - 0.5) * radialJitterScale
    y += (random(10) - 0.5) * verticalJitterScale
  } else {
    x *= 1 + (random(8) - 0.5) * (style.radialJitter ?? 0)
    z *= 1 + (random(9) - 0.5) * (style.radialJitter ?? 0)
    y += (random(10) - 0.5) * (style.verticalJitter ?? 0)
  }

  y += style.heightBias ?? 0

  const emitterOffset = toVector3(params.emissionOffset)
  const relativePosition = { x, y, z }

  const arcAngleRange =
    emission.arcAngleRange ||
    (style.customEmitter === 'rainbowArc'
      ? {
          start: style.arcStartAngle ?? Math.PI * 0.1,
          end: style.arcEndAngle ?? Math.PI * 0.9
        }
      : null)

  let arcRadius = emission.arcRadius
  const arcHeightOffset = style.arcHeightOffset ?? 0
  let arcLateralBase = emission.lateral ?? 0
  let selectedArcLayer = null

  if (style.customEmitter === 'rainbowArc' && Array.isArray(style.arcLayers) && style.arcLayers.length > 0) {
    selectedArcLayer = style.arcLayers[index % style.arcLayers.length]
    if (selectedArcLayer) {
      const layerOffset = Number(selectedArcLayer.offset ?? 0)
      relativePosition.z += layerOffset
      arcLateralBase += layerOffset
    }
  }

  if (!Number.isFinite(arcRadius)) {
    const fallbackRadius = style.arcRadius ?? params.spread
    arcRadius = Math.max(fallbackRadius, Math.hypot(relativePosition.x, relativePosition.z))
  }

  const angle = emissionAngle ?? Math.atan2(relativePosition.z, relativePosition.x)
  let arcOffset = null

  if (style.customEmitter === 'rainbowArc') {
    const baseX = Math.cos(angle) * (arcRadius ?? 0)
    const baseY = Math.sin(angle) * (arcRadius ?? 0) + arcHeightOffset
    const baseZ = arcLateralBase
    arcOffset = {
      x: relativePosition.x - baseX,
      y: relativePosition.y - baseY,
      z: relativePosition.z - baseZ
    }
  }

  const initialPosition = addVectors(relativePosition, emitterOffset)

  const radius = emissionRadius ?? Math.hypot(relativePosition.x, relativePosition.z)
  const baseRadius = emissionBaseRadius ?? radius
  const tipRadius = emissionTipRadius ?? Math.max(0.02, baseRadius * 0.15)
  const orbitOffset =
    style.customEmitter === 'vortex'
      ? (emissionAngle ?? 0) + random(11) * Math.PI * 0.6
      : random(11) * Math.PI * 2
  const floatStrength =
    (style.floatStrength ?? 0.2) * (0.7 + random(12) * 0.6)
  const floatFrequency =
    (style.floatFrequency ?? 2) * (0.8 + random(13) * 0.4)

  let colorGradientState = null
  const gradientStopsRaw = style.colorGradient
  const normalizedGradientStops = normalizeGradientStops(gradientStopsRaw)

  if (normalizedGradientStops && normalizedGradientStops.length) {
    const gradientPlayback = style.colorGradientPlayback || 'static'
    const gradientSource = style.colorGradientSource || 'random'
    const gradientSpeed = style.colorGradientSpeed ?? 0
    let gradientBaseT = 0

    switch (gradientSource) {
      case 'angle':
        gradientBaseT = wrap01(angle / (Math.PI * 2))
        break
      case 'layer':
        gradientBaseT = clamp(emissionLayer ?? random(25), 0, 1)
        break
      case 'radius': {
        const maxRadius = Math.max(1e-3, spread)
        gradientBaseT = clamp((radius ?? 0) / maxRadius, 0, 1)
        break
      }
      case 'height': {
        const range = Math.max(1e-3, spread * 2)
        gradientBaseT = clamp((initialPosition.y + spread) / range, 0, 1)
        break
      }
      case 'random':
      default:
        gradientBaseT = random(25)
        break
    }

    const wrap = gradientPlayback === 'scroll'
    const baseSample = wrap ? wrap01(gradientBaseT) : clamp(gradientBaseT, 0, 1)
    const initialRgb = sampleGradient(normalizedGradientStops, baseSample, {
      wrap
    })
    color = rgbToHex(initialRgb)

    colorGradientState = {
      stops: normalizedGradientStops,
      baseT: baseSample,
      playback: gradientPlayback,
      speed: gradientSpeed,
      wrap,
      source: gradientSource
    }
  }

  if (selectedArcLayer && selectedArcLayer.color) {
    color = selectedArcLayer.color
    colorGradientState = null
  }

  const spinRates = style.spinRates || [1, 1, 1]
  const spin = {
    x: spinRates[0] * (0.6 + random(14) * 0.8),
    y: spinRates[1] * (0.6 + random(15) * 0.8),
    z: spinRates[2] * (0.6 + random(16) * 0.8)
  }

  const speedOffset =
    (random(17) - 0.5) * (style.speedVariance ?? 0)
  const speedMultiplier = Math.max(0, 1 + speedOffset)

  const outwardDirection = normalizeVector(relativePosition)
  const customDirection = normalizeVector(toVector3(params.motionDirection))
  const animationType = params.animationType || 'orbit'
  const motionMode = params.motionDirectionMode || 'outwards'
  let direction
  switch (motionMode) {
    case 'inwards':
      direction = scaleVector(outwardDirection, -1)
      break
    case 'custom':
      direction = customDirection
      break
    case 'outwards':
    default:
      direction = outwardDirection
      break
  }

  const allowDirectionalVelocity =
    motionMode === 'custom' ||
    animationType === 'explode' ||
    animationType === 'rise'

  const baseSpeed = allowDirectionalVelocity
    ? Math.max(0, params.particleSpeed) * speedMultiplier
    : 0
  const velocity = allowDirectionalVelocity
    ? scaleVector(direction, baseSpeed)
    : { x: 0, y: 0, z: 0 }
  const acceleration = allowDirectionalVelocity
    ? toVector3(params.motionAcceleration)
    : { x: 0, y: 0, z: 0 }
  const velocityMagnitude = vectorLength(velocity)

  const driftAmplitude =
    (style.driftStrength ?? 0) * (0.6 + random(18) * 0.8)
  const driftPhase = random(19) * Math.PI * 2

  const swirlPhase = random(24) * Math.PI * 2

  const totalParticles = Math.max(1, totalCount)
  let arcFlowMode = params.arcFlowMode || style.arcFlowMode || 'continuous'
  let arcTravelSpeed = Math.max(
    0.01,
    params.arcFlowSpeed ?? style.arcFlowSpeed ?? 1
  )
  let arcTravelOffset = 0

  if (style.customEmitter === 'rainbowArc') {
    if (arcFlowMode !== 'continuous' && arcFlowMode !== 'burst') {
      arcFlowMode = 'continuous'
    }
    if (arcFlowMode === 'continuous') {
      const baseOffsetRatio = totalParticles > 1 ? index / totalParticles : 0
      const jitter = (random(26) - 0.5) * (1 / totalParticles)
      arcTravelOffset = ((baseOffsetRatio + jitter) % 1 + 1) % 1
    } else {
      arcTravelOffset = 0
    }
  } else {
    arcFlowMode = 'continuous'
    arcTravelSpeed = 0
    arcTravelOffset = 0
  }

  return {
    index,
    color,
    opacity,
    emissiveIntensity,
    scale,
    initialPosition,
    colorGradient: colorGradientState,
    radius,
    baseRadius,
    tipRadius,
    angle,
    orbitOffset,
    floatStrength,
    floatFrequency,
    spinRates: spin,
    speedOffset,
    driftAmplitude,
    driftPhase,
    swirlPhase,
    sizeScalar,
    arcRadius,
    arcRange: arcAngleRange,
    arcOffset,
    arcLateral: arcLateralBase,
    arcTravelOffset,
    arcTravelSpeed,
    arcFlowMode,
    direction,
    velocity,
    acceleration,
    velocityMagnitude,
    layerT: emissionLayer ?? random(20),
    emitterHeight: emissionHeight ?? null
  }
}
