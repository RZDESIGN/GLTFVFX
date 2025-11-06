const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const hexToRgb = (hex) => {
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

const rgbToHex = ({ r, g, b }) => {
  const to255 = (value) => {
    const clamped = clamp(Math.round(value * 255), 0, 255)
    return clamped.toString(16).padStart(2, '0')
  }
  return `#${to255(r)}${to255(g)}${to255(b)}`
}

const mixHexColors = (hexA, hexB, t) => {
  const colorA = hexToRgb(hexA)
  const colorB = hexToRgb(hexB)
  return rgbToHex({
    r: colorA.r + (colorB.r - colorA.r) * t,
    g: colorA.g + (colorB.g - colorA.g) * t,
    b: colorA.b + (colorB.b - colorA.b) * t
  })
}

const stringHash = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const seededRandom = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const createRandomGenerator = (effectType, index) => {
  const base = stringHash(effectType) * 0.0001 + index * 13.37
  return (salt = 0) => seededRandom(base + salt * 17.17)
}

const eulerToQuaternion = (x, y, z) => {
  const cx = Math.cos(x / 2)
  const sx = Math.sin(x / 2)
  const cy = Math.cos(y / 2)
  const sy = Math.sin(y / 2)
  const cz = Math.cos(z / 2)
  const sz = Math.sin(z / 2)

  return {
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz
  }
}

const normalizeQuaternion = (quat) => {
  const length = Math.hypot(quat.x, quat.y, quat.z, quat.w) || 1
  return {
    x: quat.x / length,
    y: quat.y / length,
    z: quat.z / length,
    w: quat.w / length
  }
}

const computeEmissionPosition = (shape, spread, random, style) => {
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

  switch (shape) {
    case 'sphere': {
      const u = random(10)
      const v = random(11)
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const radius = spread * Math.cbrt(random(12))
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)
      return { x, y, z }
    }
    case 'cone': {
      const angle = random(13) * Math.PI * 2
      const height = spread * (style.coneHeightMultiplier ?? 2) * random(14)
      const radius = spread * (style.coneRadiusMultiplier ?? 0.6) * Math.sqrt(random(15))
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      const y = height
      return { x, y, z }
    }
    case 'ring': {
      const angle = random(16) * Math.PI * 2
      const thickness = style.ringThickness ?? 0.35
      const radius = spread * (style.ringRadiusMultiplier ?? 0.8)
      const x = (radius + (random(17) - 0.5) * thickness) * Math.cos(angle)
      const z = (radius + (random(18) - 0.5) * thickness) * Math.sin(angle)
      const y = (random(19) - 0.5) * (style.ringHeight ?? 0.3)
      return { x, y, z }
    }
    case 'box':
    default: {
      const x = (random(20) - 0.5) * spread * 2
      const y = (random(21) - 0.5) * spread * 2
      const z = (random(22) - 0.5) * spread * 2
      return { x, y, z }
    }
  }
}

const DEFAULT_STYLE = {
  geometry: { type: 'box' },
  baseScale: [1, 1, 1],
  scaleVariance: [0, 0, 0],
  sizeMultiplier: 1,
  sizeJitter: 0.25,
  colorBias: 0.5,
  colorVariance: 0.2,
  opacityRange: [0.7, 1],
  emissiveMultiplier: 1.2,
  emissiveVariance: 0.15,
  roughness: 0.45,
  metalness: 0.2,
  alphaMode: 'OPAQUE',
  depthWrite: true,
  floatStrength: 0.2,
  floatFrequency: 2.0,
  verticalJitter: 0.2,
  radialJitter: 0.15,
  heightBias: 0,
  spreadMultiplier: 1,
  spinRates: [1.2, 0.9, 1.1],
  speedVariance: 0.25,
  driftStrength: 0,
  spiralHeight: 1.0,
  spiralTaper: 0.3,
  spiralRevolutions: 3,
  spiralAngularSpeed: 1,
  riseSpeed: 0.5,
  riseHeight: 3.2,
  explosionSpread: 2.0,
  explosionShrink: 0.85,
  pulseScaleBase: 0.55,
  pulseScaleRange: 0.75,
  systemRotationSpeed: 0.35,
  maxParticles: 160,
  keyframeSteps: 6
}

const PARTICLE_SHAPE_DEFINITIONS = [
  {
    id: 'style',
    name: 'Effect Default',
    icon: '🎯'
  },
  {
    id: 'cube',
    name: 'Block',
    icon: '🧊',
    geometry: { type: 'box' }
  },
  {
    id: 'sphere',
    name: 'Sphere',
    icon: '⚪',
    geometry: { type: 'sphere', widthSegments: 16, heightSegments: 12 }
  },
  {
    id: 'tetra',
    name: 'Tetrahedron',
    icon: '🔺',
    geometry: { type: 'tetrahedron' }
  },
  {
    id: 'octa',
    name: 'Octahedron',
    icon: '💠',
    geometry: { type: 'octahedron', detail: 0 }
  },
  {
    id: 'cylinder',
    name: 'Cylinder',
    icon: '🛢️',
    geometry: { type: 'cylinder', topRadius: 0.25, bottomRadius: 0.25, height: 1.2, radialSegments: 18, openEnded: false },
    styleOverrides: {
      baseScale: [0.7, 1.4, 0.7]
    }
  },
  {
    id: 'plane',
    name: 'Plane',
    icon: '⬛',
    geometry: { type: 'plane' },
    styleOverrides: {
      baseScale: [1.3, 0.1, 1.3],
      scaleVariance: [0.15, 0.05, 0.15]
    }
  }
]

export const PARTICLE_SHAPE_OPTIONS = PARTICLE_SHAPE_DEFINITIONS.map(shape => ({
  id: shape.id,
  name: shape.name,
  icon: shape.icon
}))

export const getParticleShapeDefinition = (shapeId) => {
  if (!shapeId || shapeId === 'style') return null
  return PARTICLE_SHAPE_DEFINITIONS.find(shape => shape.id === shapeId) || null
}

const EFFECT_STYLES = {
  aura: {
    geometry: { type: 'icosahedron', detail: 1 },
    baseScale: [1, 1, 1],
    scaleVariance: [0.2, 0.2, 0.2],
    sizeMultiplier: 1.1,
    sizeJitter: 0.35,
    colorBias: 0.65,
    colorVariance: 0.3,
    opacityRange: [0.6, 0.95],
    emissiveMultiplier: 1.9,
    emissiveVariance: 0.25,
    roughness: 0.25,
    metalness: 0.12,
    alphaMode: 'BLEND',
    depthWrite: false,
    floatStrength: 0.4,
    floatFrequency: 2.6,
    verticalJitter: 0.45,
    radialJitter: 0.2,
    heightBias: 0.1,
    spreadMultiplier: 1.3,
    spinRates: [1.6, 1.1, 1.4],
    speedVariance: 0.18,
    driftStrength: 0.15,
    systemRotationSpeed: 0.42
  },
  fireball: {
    geometry: { type: 'sphere', widthSegments: 16, heightSegments: 12 },
    baseScale: [1, 1, 1],
    scaleVariance: [0.1, 0.1, 0.1],
    sizeMultiplier: 1.35,
    sizeJitter: 0.28,
    colorBias: 0.35,
    colorVariance: 0.22,
    opacityRange: [0.75, 1],
    emissiveMultiplier: 2.6,
    emissiveVariance: 0.2,
    roughness: 0.35,
    metalness: 0.18,
    floatStrength: 0.18,
    floatFrequency: 3.2,
    verticalJitter: 0.25,
    radialJitter: 0.18,
    spreadMultiplier: 0.9,
    spinRates: [2.1, 1.4, 1.6],
    speedVariance: 0.22,
    explosionSpread: 2.8,
    explosionShrink: 0.9,
    maxParticles: 120
  },
  ice: {
    geometry: { type: 'octahedron', detail: 1 },
    baseScale: [1, 1.2, 1],
    scaleVariance: [0.15, 0.2, 0.15],
    sizeMultiplier: 1.05,
    sizeJitter: 0.2,
    colorBias: 0.7,
    colorVariance: 0.18,
    opacityRange: [0.65, 0.9],
    emissiveMultiplier: 1.4,
    emissiveVariance: 0.15,
    roughness: 0.55,
    metalness: 0.05,
    alphaMode: 'BLEND',
    depthWrite: false,
    floatStrength: 0.28,
    floatFrequency: 2.1,
    verticalJitter: 0.35,
    radialJitter: 0.12,
    heightBias: 0.2,
    spreadMultiplier: 1.15,
    spinRates: [1.1, 0.8, 1.3],
    speedVariance: 0.16,
    driftStrength: 0.12
  },
  'ground-smash': {
    geometry: { type: 'box' },
    baseScale: [1.4, 0.6, 1.4],
    scaleVariance: [0.2, 0.15, 0.2],
    sizeMultiplier: 1.55,
    sizeJitter: 0.22,
    colorBias: 0.45,
    colorVariance: 0.18,
    opacityRange: [0.85, 1],
    emissiveMultiplier: 1.0,
    emissiveVariance: 0.1,
    roughness: 0.85,
    metalness: 0.06,
    floatStrength: 0.08,
    floatFrequency: 1.5,
    verticalJitter: 0.25,
    radialJitter: 0.35,
    heightBias: -0.25,
    spreadMultiplier: 1.4,
    spinRates: [0.6, 1.3, 0.5],
    speedVariance: 0.12,
    explosionSpread: 1.9,
    explosionShrink: 0.7,
    riseHeight: 2.2,
    maxParticles: 90
  },
  tornado: {
    customEmitter: 'vortex',
    geometry: { type: 'cylinder', topRadius: 0.08, bottomRadius: 0.4, height: 1.4, radialSegments: 20, openEnded: true },
    baseScale: [0.35, 2.8, 0.35],
    scaleVariance: [0.25, 0.65, 0.25],
    sizeMultiplier: 1.0,
    sizeJitter: 0.28,
    colorBias: 0.52,
    colorVariance: 0.22,
    opacityRange: [0.45, 0.85],
    emissiveMultiplier: 1.6,
    emissiveVariance: 0.22,
    roughness: 0.48,
    metalness: 0.1,
    alphaMode: 'BLEND',
    depthWrite: false,
    floatStrength: 0.14,
    floatFrequency: 2.8,
    verticalJitter: 0.4,
    radialJitter: 0.08,
    spreadMultiplier: 1.25,
    spinRates: [0.9, 2.4, 1],
    speedVariance: 0.24,
    spiralHeight: 3.2,
    spiralTaper: 0.55,
    spiralRevolutions: 5.5,
    spiralAngularSpeed: 1.1,
    driftStrength: 0.12,
    vortexHeight: 3.6,
    vortexBaseRadius: 1.45,
    vortexTipRadius: 0.18,
    vortexRadiusFalloff: 1.4,
    vortexLayers: 20,
    vortexLayerDrift: 0.85,
    vortexJitter: 0.08,
    vortexVerticalJitter: 0.05,
    vortexSway: 0.1,
    vortexSwaySpeed: 1.4,
    vortexSwayRadius: 0.06,
    systemRotationSpeed: 0.48,
    maxParticles: 150
  },
  sparkles: {
    geometry: { type: 'tetrahedron' },
    baseScale: [1, 1, 1],
    scaleVariance: [0.35, 0.35, 0.35],
    sizeMultiplier: 0.95,
    sizeJitter: 0.5,
    colorBias: 0.5,
    colorVariance: 0.4,
    opacityRange: [0.35, 0.8],
    emissiveMultiplier: 3,
    emissiveVariance: 0.35,
    roughness: 0.15,
    metalness: 0.15,
    alphaMode: 'BLEND',
    depthWrite: false,
    floatStrength: 0.5,
    floatFrequency: 4.2,
    verticalJitter: 0.4,
    radialJitter: 0.15,
    spreadMultiplier: 1,
    spinRates: [3.1, 2.8, 2.2],
    speedVariance: 0.32,
    pulseScaleBase: 0.45,
    pulseScaleRange: 1.0,
    driftStrength: 0.1,
    maxParticles: 150,
    keyframeSteps: 8
  },
  smoke: {
    geometry: { type: 'sphere', widthSegments: 14, heightSegments: 12 },
    baseScale: [1.3, 1.6, 1.3],
    scaleVariance: [0.25, 0.4, 0.25],
    sizeMultiplier: 1.7,
    sizeJitter: 0.45,
    colorBias: 0.55,
    colorVariance: 0.2,
    opacityRange: [0.22, 0.55],
    emissiveMultiplier: 0.4,
    emissiveVariance: 0.12,
    roughness: 0.95,
    metalness: 0.02,
    alphaMode: 'BLEND',
    depthWrite: false,
    floatStrength: 0.12,
    floatFrequency: 1.6,
    verticalJitter: 0.6,
    radialJitter: 0.15,
    heightBias: 0.15,
    spreadMultiplier: 1.6,
    spinRates: [0.25, 0.4, 0.3],
    speedVariance: 0.18,
    driftStrength: 0.45,
    riseSpeed: 0.35,
    riseHeight: 2.6,
    maxParticles: 140
  },
  'energy-beam': {
    geometry: { type: 'cylinder', topRadius: 0.12, bottomRadius: 0.12, height: 1.3, radialSegments: 16, openEnded: false },
    baseScale: [0.3, 3.8, 0.3],
    scaleVariance: [0.1, 0.15, 0.1],
    sizeMultiplier: 1.15,
    sizeJitter: 0.12,
    colorBias: 0.4,
    colorVariance: 0.2,
    opacityRange: [0.6, 0.95],
    emissiveMultiplier: 3.3,
    emissiveVariance: 0.3,
    roughness: 0.2,
    metalness: 0.25,
    alphaMode: 'BLEND',
    depthWrite: true,
    floatStrength: 0.22,
    floatFrequency: 3.6,
    verticalJitter: 0.2,
    radialJitter: 0.08,
    heightBias: 0.35,
    spreadMultiplier: 0.75,
    spinRates: [1.9, 2.5, 1.9],
    speedVariance: 0.18,
    pulseScaleBase: 0.6,
    pulseScaleRange: 0.9,
    driftStrength: 0.05,
    spiralHeight: 2.2,
    systemRotationSpeed: 0.48,
    maxParticles: 110
  }
}

export const EFFECT_PRESETS = {
  aura: {
    particleCount: 90,
    particleSize: 0.18,
    particleSpeed: 0.8,
    spread: 1.4,
    primaryColor: '#7f75ff',
    secondaryColor: '#a7f7ff',
    emissionShape: 'sphere',
    animationType: 'orbit',
    glowIntensity: 2.6,
    lifetime: 3,
    particleShape: 'style'
  },
  fireball: {
    particleCount: 70,
    particleSize: 0.24,
    particleSpeed: 1.9,
    spread: 0.9,
    primaryColor: '#ff4b1f',
    secondaryColor: '#ffb347',
    emissionShape: 'sphere',
    animationType: 'explode',
    glowIntensity: 3.4,
    lifetime: 1.6,
    particleShape: 'style'
  },
  ice: {
    particleCount: 65,
    particleSize: 0.17,
    particleSpeed: 1,
    spread: 1.2,
    primaryColor: '#66d4ff',
    secondaryColor: '#f3fbff',
    emissionShape: 'cone',
    animationType: 'rise',
    glowIntensity: 1.8,
    lifetime: 2.8,
    particleShape: 'style'
  },
  'ground-smash': {
    particleCount: 50,
    particleSize: 0.3,
    particleSpeed: 1.3,
    spread: 1.6,
    primaryColor: '#8b5a2b',
    secondaryColor: '#f2d3a2',
    emissionShape: 'box',
    animationType: 'explode',
    glowIntensity: 1.2,
    lifetime: 1.4,
    particleShape: 'style'
  },
  tornado: {
    particleCount: 140,
    particleSize: 0.17,
    particleSpeed: 1.9,
    spread: 1.5,
    primaryColor: '#7dd8ff',
    secondaryColor: '#e0f7ff',
    emissionShape: 'cone',
    animationType: 'spiral',
    glowIntensity: 2.0,
    lifetime: 3.8,
    particleShape: 'style'
  },
  sparkles: {
    particleCount: 120,
    particleSize: 0.15,
    particleSpeed: 2,
    spread: 1,
    primaryColor: '#fff8c6',
    secondaryColor: '#ffe4f6',
    emissionShape: 'ring',
    animationType: 'pulse',
    glowIntensity: 3,
    lifetime: 2.2,
    particleShape: 'style'
  },
  smoke: {
    particleCount: 85,
    particleSize: 0.32,
    particleSpeed: 0.7,
    spread: 1.7,
    primaryColor: '#6b6b6b',
    secondaryColor: '#a8a8a8',
    emissionShape: 'sphere',
    animationType: 'rise',
    glowIntensity: 0.9,
    lifetime: 3.6,
    particleShape: 'style'
  },
  'energy-beam': {
    particleCount: 70,
    particleSize: 0.2,
    particleSpeed: 2.3,
    spread: 0.8,
    primaryColor: '#45f6ff',
    secondaryColor: '#97fffb',
    emissionShape: 'ring',
    animationType: 'pulse',
    glowIntensity: 3.2,
    lifetime: 2.6,
    particleShape: 'style'
  }
}

export const getEffectPreset = (effectType) => {
  return EFFECT_PRESETS[effectType] ? { ...EFFECT_PRESETS[effectType] } : null
}

export const getEffectStyle = (effectType) => {
  const overrides = EFFECT_STYLES[effectType] || {}
  return {
    ...DEFAULT_STYLE,
    ...overrides,
    geometry: {
      ...DEFAULT_STYLE.geometry,
      ...(overrides.geometry || {})
    },
    baseScale: [...(overrides.baseScale || DEFAULT_STYLE.baseScale)],
    scaleVariance: [...(overrides.scaleVariance || DEFAULT_STYLE.scaleVariance)],
    spinRates: [...(overrides.spinRates || DEFAULT_STYLE.spinRates)]
  }
}

const buildParticleState = (params, style, index) => {
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
  const color = mixHexColors(params.primaryColor, params.secondaryColor, colorMix)

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
    style
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

  const radius = emissionRadius ?? Math.hypot(x, z)
  const baseRadius = emissionBaseRadius ?? radius
  const tipRadius = emissionTipRadius ?? Math.max(0.02, baseRadius * 0.15)
  const angle = emissionAngle ?? Math.atan2(z, x)
  const orbitOffset =
    style.customEmitter === 'vortex'
      ? (emissionAngle ?? 0) + random(11) * Math.PI * 0.6
      : random(11) * Math.PI * 2
  const floatStrength =
    (style.floatStrength ?? 0.2) * (0.7 + random(12) * 0.6)
  const floatFrequency =
    (style.floatFrequency ?? 2) * (0.8 + random(13) * 0.4)

  const spinRates = style.spinRates || [1, 1, 1]
  const spin = {
    x: spinRates[0] * (0.6 + random(14) * 0.8),
    y: spinRates[1] * (0.6 + random(15) * 0.8),
    z: spinRates[2] * (0.6 + random(16) * 0.8)
  }

  const speedOffset =
    (random(17) - 0.5) * (style.speedVariance ?? 0)

  const driftAmplitude =
    (style.driftStrength ?? 0) * (0.6 + random(18) * 0.8)
  const driftPhase = random(19) * Math.PI * 2

  const swirlPhase = random(24) * Math.PI * 2

  return {
    index,
    color,
    opacity,
    emissiveIntensity,
    scale,
    initialPosition: { x, y, z },
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
    layerT: emissionLayer ?? random(20),
    emitterHeight: emissionHeight ?? null
  }
}

const buildAnimationKeyframes = (params, style, state, times) => {
  const positions = new Float32Array(times.length * 3)
  const rotations = new Float32Array(times.length * 4)
  const scales = new Float32Array(times.length * 3)

  const spiralHeight = style.spiralHeight ?? 1
  const riseSpeed = style.riseSpeed ?? 0.5
  const riseHeight = style.riseHeight ?? 3
  const explosionSpread = style.explosionSpread ?? 2
  const explosionShrink = style.explosionShrink ?? 0.85
  const driftStrength = state.driftAmplitude ?? 0
  const pulseBase = style.pulseScaleBase ?? 0.55
  const pulseRange = style.pulseScaleRange ?? 0.75

  const effectiveSpeedMultiplier = 1 + state.speedOffset

  const duration = params.lifetime > 0 ? params.lifetime : 1

  for (let i = 0; i < times.length; i++) {
    const time = times[i]
    const elapsed = time
    const progress = duration === 0 ? 0 : Math.min(1, elapsed / duration)
    const effectiveSpeed = params.particleSpeed * effectiveSpeedMultiplier

    let x = state.initialPosition.x
    let y = state.initialPosition.y
    let z = state.initialPosition.z

    let scaleX = state.scale.x
    let scaleY = state.scale.y
    let scaleZ = state.scale.z

    switch (params.animationType) {
      case 'rise': {
        const riseProgress = progress * riseHeight * riseSpeed
        y = state.initialPosition.y + riseProgress

        if (driftStrength > 0) {
          const drift = driftStrength
          const driftAngle = progress * Math.PI * 2 + state.driftPhase
          x += Math.sin(driftAngle) * drift
          z += Math.cos(driftAngle * 0.8) * drift
        }
        break
      }
      case 'explode': {
        const normalized = progress
        const expansion = 1 + normalized * explosionSpread
        x = state.initialPosition.x * expansion
        y = state.initialPosition.y * expansion
        z = state.initialPosition.z * expansion
        const shrink = Math.max(0.12, 1 - normalized * explosionShrink)
        scaleX = state.scale.x * shrink
        scaleY = state.scale.y * shrink
        scaleZ = state.scale.z * shrink
        break
      }
      case 'spiral': {
        const spiralTurns = (style.spiralRevolutions ?? 4.5) * Math.max(0.4, effectiveSpeed * (style.spiralAngularSpeed ?? 1))
        const revolutions = spiralTurns * progress
        const angle = state.orbitOffset + state.swirlPhase + revolutions * Math.PI * 2
        const fractionalRevolution = revolutions - Math.floor(revolutions)

        if (style.customEmitter === 'vortex') {
          const height = style.vortexHeight ?? style.spiralHeight ?? 2
          const drift = style.vortexLayerDrift ?? 0.75
          const totalProgress = (state.layerT ?? 0) + revolutions * drift
          const layerProgress = totalProgress - Math.floor(totalProgress)

          const maxRadius = style.vortexBaseRadius ?? state.baseRadius ?? state.radius
          const minRadius = Math.max(
            0.02,
            style.vortexTipRadius ?? state.tipRadius ?? maxRadius * 0.15
          )
          const falloff = style.vortexRadiusFalloff ?? 1.3
          const radiusRange = Math.max(0.001, maxRadius - minRadius)
          let swirlRadius =
            minRadius + radiusRange * Math.pow(layerProgress, falloff)

          const taper = 1 - (style.spiralTaper ?? 0.35) * (1 - layerProgress)
          swirlRadius *= Math.max(0.25, taper)

          const swayRadius = style.vortexSwayRadius ?? 0
          if (swayRadius > 0) {
            swirlRadius += Math.sin(angle * 0.35 + state.swirlPhase) * swayRadius
          }

          x = Math.cos(angle) * swirlRadius
          z = Math.sin(angle) * swirlRadius
          y = -height * 0.5 + layerProgress * height

          const sway = style.vortexSway ?? 0
          if (sway !== 0) {
            y += Math.sin(
              angle * (style.vortexSwaySpeed ?? 1.5) + state.swirlPhase
            ) * sway
          }

          const radialScale = 0.65 + layerProgress * 0.45
          scaleX = state.scale.x * radialScale
          scaleZ = state.scale.z * radialScale
          scaleY = state.scale.y * (0.85 + (1 - layerProgress) * 0.25)
        } else {
          const taper = Math.max(0.2, 1 - fractionalRevolution * (style.spiralTaper ?? 0.3))
          const spiralRadius = state.radius * taper
          x = Math.cos(angle) * spiralRadius
          z = Math.sin(angle) * spiralRadius
          y =
            state.initialPosition.y +
            fractionalRevolution * spiralHeight
        }

        break
      }
      case 'pulse': {
        const cycles = Math.max(1, effectiveSpeed)
        const oscillation =
          Math.sin(progress * Math.PI * 2 * cycles + state.orbitOffset) * 0.5 + 0.5
        const scaleFactor = pulseBase + oscillation * pulseRange
        scaleX = state.scale.x * scaleFactor
        scaleY = state.scale.y * scaleFactor
        scaleZ = state.scale.z * scaleFactor
        break
      }
      case 'orbit':
      default: {
        const orbitTurns = Math.max(1, effectiveSpeed)
        const orbitAngle =
          state.orbitOffset + progress * Math.PI * 2 * orbitTurns
        x = Math.cos(orbitAngle) * state.radius
        z = Math.sin(orbitAngle) * state.radius
        y =
          state.initialPosition.y +
          Math.sin(progress * Math.PI * 2 * (state.floatFrequency || 1) + state.orbitOffset) *
            state.floatStrength
        break
      }
    }

    const rotation = normalizeQuaternion(
      eulerToQuaternion(
        elapsed * state.spinRates.x,
        elapsed * state.spinRates.y,
        elapsed * state.spinRates.z
      )
    )

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    rotations[i * 4] = rotation.x
    rotations[i * 4 + 1] = rotation.y
    rotations[i * 4 + 2] = rotation.z
    rotations[i * 4 + 3] = rotation.w

    scales[i * 3] = scaleX
    scales[i * 3 + 1] = scaleY
    scales[i * 3 + 2] = scaleZ
  }

  return { positions, rotations, scales }
}

export const buildParticleSystemBlueprint = (params) => {
  const style = getEffectStyle(params.effectType)
  const shapeDefinition = getParticleShapeDefinition(params.particleShape)

  if (shapeDefinition && shapeDefinition.geometry) {
    style.geometry = { ...shapeDefinition.geometry }
  }

  if (shapeDefinition && shapeDefinition.styleOverrides) {
    const overrides = shapeDefinition.styleOverrides
    Object.keys(overrides).forEach(key => {
      const value = overrides[key]
      if (Array.isArray(value)) {
        style[key] = [...value]
      } else if (value && typeof value === 'object') {
        style[key] = { ...value }
      } else {
        style[key] = value
      }
    })
  }

  if (style.customEmitter === 'vortex') {
    if (!style.spiralHeight && style.vortexHeight) {
      style.spiralHeight = style.vortexHeight
    }
    style.spiralRevolutions = style.spiralRevolutions ?? 6
    style.spiralAngularSpeed = style.spiralAngularSpeed ?? 1.1
  }

  const count = Math.min(
    Math.max(Math.floor(params.particleCount) || 10, 8),
    style.maxParticles || 160
  )

  const steps = Math.max(style.keyframeSteps || 6, 4)
  const times = new Float32Array(steps)
  for (let i = 0; i < steps; i++) {
    times[i] = (params.lifetime * i) / (steps - 1)
  }

  const particles = []
  for (let i = 0; i < count; i++) {
    const state = buildParticleState(params, style, i)
    const keyframes = buildAnimationKeyframes(params, style, state, times)
    particles.push({
      ...state,
      keyframes
    })
  }

  return {
    style,
    keyframeTimes: times,
    particles,
    system: {
      autoRotateSpeed: style.systemRotationSpeed ?? 0.35
    },
    duration: times.length > 0 ? times[times.length - 1] : params.lifetime
  }
}
