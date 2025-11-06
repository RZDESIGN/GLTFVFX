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

const toVector3 = (value) => {
  const source = value && typeof value === 'object' ? value : {}
  return {
    x: Number.isFinite(source.x) ? source.x : 0,
    y: Number.isFinite(source.y) ? source.y : 0,
    z: Number.isFinite(source.z) ? source.z : 0
  }
}

const addVectors = (a, b) => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z
})

const scaleVector = (v, scalar) => ({
  x: v.x * scalar,
  y: v.y * scalar,
  z: v.z * scalar
})

const vectorLength = (v) => Math.hypot(v.x, v.y, v.z)

const normalizeVector = (v) => {
  const length = vectorLength(v)
  if (length === 0) {
    return { x: 0, y: 1, z: 0 }
  }
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length
  }
}

const wrap01 = (value) => {
  if (!Number.isFinite(value)) return 0
  return ((value % 1) + 1) % 1
}

const normalizeGradientStops = (stops) => {
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

const sampleGradient = (stops, t, { wrap = false } = {}) => {
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

const computeEmissionPosition = (shape, spread, random, style, params) => {
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
      heightOffset
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

const DEFAULT_STYLE = {
  geometry: { type: 'box' },
  baseScale: [1, 1, 1],
  scaleVariance: [0, 0, 0],
  sizeMultiplier: 1,
  sizeJitter: 0.25,
  colorBias: 0.5,
  colorVariance: 0.2,
  colorMode: 'mix',
  colorGradient: null,
  colorGradientSource: 'random',
  colorGradientPlayback: 'static',
  colorGradientSpeed: 0,
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
  keyframeSteps: 6,
  arcRadius: 1.5,
  arcStartAngle: Math.PI * 0.2,
  arcEndAngle: Math.PI * 0.8,
  arcThickness: 0.2,
  arcHeightOffset: 0,
  arcFlowSpeed: 1,
  arcFlowMode: 'continuous',
  arcLayers: null
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
  },
  rainbow: {
    customEmitter: 'rainbowArc',
    geometry: { type: 'plane' },
    baseScale: [0.6, 0.6, 0.6],
    scaleVariance: [0.12, 0.08, 0.12],
    sizeMultiplier: 0.85,
    sizeJitter: 0.12,
    colorMode: 'bands',
    colorGradient: null,
    opacityRange: [0.4, 0.75],
    emissiveMultiplier: 1.9,
    emissiveVariance: 0.25,
    roughness: 0.2,
    metalness: 0.05,
    alphaMode: 'BLEND',
    depthWrite: false,
    floatStrength: 0.2,
    floatFrequency: 3.2,
    radialJitter: 0.02,
    verticalJitter: 0.05,
    spreadMultiplier: 1,
    spinRates: [0.6, 1.1, 0.5],
    speedVariance: 0.15,
    driftStrength: 0.12,
    pulseScaleBase: 0.6,
    pulseScaleRange: 0.45,
    systemRotationSpeed: 0.62,
    maxParticles: 220,
    keyframeSteps: 8,
    arcRadius: 3,
    arcStartAngle: Math.PI * 0.1,
    arcEndAngle: Math.PI * 0.9,
    arcThickness: 0.12,
    arcHeightOffset: 0,
    arcFlowSpeed: 1,
    arcFlowMode: 'continuous',
    arcLayers: [
      { color: '#ff4f4f', offset: -0.45 },
      { color: '#ff9f2f', offset: -0.28 },
      { color: '#fff94f', offset: -0.1 },
      { color: '#4fff9b', offset: 0.08 },
      { color: '#4fd3ff', offset: 0.26 },
      { color: '#9d4fff', offset: 0.44 }
    ]
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
    glowIntensity: 1,
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
    glowIntensity: 1,
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
    glowIntensity: 1,
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
    glowIntensity: 1,
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
    glowIntensity: 1,
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
    glowIntensity: 1,
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
    glowIntensity: 1,
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
    glowIntensity: 1,
    lifetime: 2.6,
    particleShape: 'style'
  },
  rainbow: {
    particleCount: 180,
    particleSize: 0.16,
    particleSpeed: 0.35,
    spread: 2.4,
    primaryColor: '#ff4f4f',
    secondaryColor: '#4fffff',
    emissionShape: 'disc',
    animationType: 'orbit',
    glowIntensity: 1.2,
    lifetime: 3,
    particleShape: 'style',
    emissionSurfaceOnly: true,
    emissionOffset: { x: 0, y: 0.1, z: 0 },
    motionDirectionMode: 'outwards',
    motionAcceleration: { x: 0, y: 0.65, z: 0 },
    useArcEmitter: true,
    arcRadius: 3,
    arcStartAngle: Math.PI * 0.1,
    arcEndAngle: Math.PI * 0.9,
    arcThickness: 0.12,
    arcHeightOffset: 0,
    arcFlowSpeed: 1,
    arcFlowMode: 'continuous'
  }
}

export const getEffectPreset = (effectType) => {
  return EFFECT_PRESETS[effectType] ? { ...EFFECT_PRESETS[effectType] } : null
}

export const getEffectStyle = (effectType) => {
  const overrides = EFFECT_STYLES[effectType] || {}
  const gradientStops = overrides.colorGradient ?? DEFAULT_STYLE.colorGradient
  return {
    ...DEFAULT_STYLE,
    ...overrides,
    geometry: {
      ...DEFAULT_STYLE.geometry,
      ...(overrides.geometry || {})
    },
    baseScale: [...(overrides.baseScale || DEFAULT_STYLE.baseScale)],
    scaleVariance: [...(overrides.scaleVariance || DEFAULT_STYLE.scaleVariance)],
    spinRates: [...(overrides.spinRates || DEFAULT_STYLE.spinRates)],
    arcRadius: overrides.arcRadius ?? DEFAULT_STYLE.arcRadius,
    arcStartAngle: overrides.arcStartAngle ?? DEFAULT_STYLE.arcStartAngle,
    arcEndAngle: overrides.arcEndAngle ?? DEFAULT_STYLE.arcEndAngle,
    arcThickness: overrides.arcThickness ?? DEFAULT_STYLE.arcThickness,
    arcHeightOffset: overrides.arcHeightOffset ?? DEFAULT_STYLE.arcHeightOffset,
    arcFlowSpeed: overrides.arcFlowSpeed ?? DEFAULT_STYLE.arcFlowSpeed,
    arcFlowMode: overrides.arcFlowMode ?? DEFAULT_STYLE.arcFlowMode,
    arcLayers: overrides.arcLayers
      ? overrides.arcLayers.map(layer => ({ ...layer }))
      : DEFAULT_STYLE.arcLayers
        ? DEFAULT_STYLE.arcLayers.map(layer => ({ ...layer }))
        : null,
    colorGradient: gradientStops
      ? gradientStops.map(stop => ({ ...stop }))
      : null
  }
}

const buildParticleState = (params, style, index, totalCount = 1) => {
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
  let direction
  switch (params.motionDirectionMode) {
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

  const baseSpeed = Math.max(0, params.particleSpeed) * speedMultiplier
  const velocity = scaleVector(direction, baseSpeed)
  const acceleration = toVector3(params.motionAcceleration)
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

const buildAnimationKeyframes = (params, style, state, times) => {
  const positions = new Float32Array(times.length * 3)
  const rotations = new Float32Array(times.length * 4)
  const scales = new Float32Array(times.length * 3)
  const gradientInfo = state.colorGradient
  const colors =
    gradientInfo && gradientInfo.stops && gradientInfo.playback !== 'static'
      ? new Float32Array(times.length * 3)
      : null
  const gradientStops = gradientInfo?.stops || null
  const gradientPlayback = gradientInfo?.playback || 'static'
  const gradientBaseT = gradientInfo?.baseT ?? 0
  const gradientSpeed = gradientInfo?.speed ?? 0
  const gradientSampleOptions = {
    wrap: gradientInfo?.wrap ?? false
  }

  const isRainbowArc = style.customEmitter === 'rainbowArc'
  const arcRange = state.arcRange || {
    start: style.arcStartAngle ?? Math.PI * 0.1,
    end: style.arcEndAngle ?? Math.PI * 0.9
  }
  const arcStartAngle = arcRange.start ?? 0
  const arcEndAngle =
    arcRange.end ?? arcStartAngle + Math.PI * 0.8
  const arcSpan = Math.max(1e-5, arcEndAngle - arcStartAngle)
  const arcRadius = Math.max(
    0.01,
    state.arcRadius ?? style.arcRadius ?? params.spread
  )
  const arcFlowMode = state.arcFlowMode || style.arcFlowMode || 'continuous'
  const arcTravelSpeed = state.arcTravelSpeed ?? (style.arcFlowSpeed ?? 1)
  const arcTravelOffset = state.arcTravelOffset ?? 0
  const arcOffsetVec = state.arcOffset || { x: 0, y: 0, z: 0 }
  const arcLateral = state.arcLateral ?? 0

  const spiralHeight = style.spiralHeight ?? 1
  const riseSpeed = style.riseSpeed ?? 0.5
  const riseHeight = style.riseHeight ?? 3
  const explosionSpread = style.explosionSpread ?? 2
  const explosionShrink = style.explosionShrink ?? 0.85
  const driftStrength = state.driftAmplitude ?? 0
  const pulseBase = style.pulseScaleBase ?? 0.55
  const pulseRange = style.pulseScaleRange ?? 0.75
  const velocityVec = state.velocity || { x: 0, y: 0, z: 0 }
  const accelerationVec = state.acceleration || { x: 0, y: 0, z: 0 }
  const effectiveSpeedMultiplier = Math.max(0, 1 + (state.speedOffset ?? 0))
  const effectiveSpeed = Math.max(0, params.particleSpeed) * effectiveSpeedMultiplier
  const emitterOffset = toVector3(params.emissionOffset)

  const duration = params.lifetime > 0 ? params.lifetime : 1

  for (let i = 0; i < times.length; i++) {
    const time = times[i]
    const elapsed = time
    const progress = duration === 0 ? 0 : Math.min(1, elapsed / duration)
    let x = state.initialPosition.x
    let y = state.initialPosition.y
    let z = state.initialPosition.z

    let scaleX = state.scale.x
    let scaleY = state.scale.y
    let scaleZ = state.scale.z

    if (isRainbowArc) {
      const flowMode = arcFlowMode
      const startX = emitterOffset.x + Math.cos(arcStartAngle) * arcRadius + arcOffsetVec.x
      const startY = emitterOffset.y + Math.sin(arcStartAngle) * arcRadius + arcOffsetVec.y
      const startZ = emitterOffset.z + arcLateral + arcOffsetVec.z

      const endX = emitterOffset.x + Math.cos(arcEndAngle) * arcRadius + arcOffsetVec.x
      const endY = emitterOffset.y + Math.sin(arcEndAngle) * arcRadius + arcOffsetVec.y
      const endZ = emitterOffset.z + arcLateral + arcOffsetVec.z

      if (flowMode === 'continuous') {
        let phaseValue = progress * arcTravelSpeed + arcTravelOffset
        phaseValue = ((phaseValue % 1) + 1) % 1

        const arcAngle = arcStartAngle + phaseValue * arcSpan
        x = emitterOffset.x + Math.cos(arcAngle) * arcRadius + arcOffsetVec.x
        y = emitterOffset.y + Math.sin(arcAngle) * arcRadius + arcOffsetVec.y
        z = emitterOffset.z + arcLateral + arcOffsetVec.z

        if (driftStrength > 0) {
          const drift = driftStrength * 0.25
          const driftAngle = phaseValue * Math.PI * 2 + state.driftPhase
          x += Math.sin(driftAngle) * drift
          z += Math.cos(driftAngle * 0.6) * drift
        }

        const floatWave =
          Math.sin(progress * Math.PI * 2 * (state.floatFrequency || 1) + state.orbitOffset) *
          state.floatStrength *
          0.45
        y += floatWave

        const fadeIn = Math.min(1, phaseValue / 0.08)
        const fadeOut = Math.min(1, (1 - phaseValue) / 0.08)
        const visibility = Math.max(0, Math.min(fadeIn, fadeOut))

        const arcPulse =
          Math.sin(progress * Math.PI * 2 + state.orbitOffset + state.index * 0.18) * 0.2 + 0.9
        const scaleWave = arcPulse * visibility

        scaleX = state.scale.x * scaleWave
        scaleY = state.scale.y * scaleWave
        scaleZ = state.scale.z * scaleWave
      } else {
        const phaseValue = progress * arcTravelSpeed + arcTravelOffset

        if (phaseValue <= 0) {
          x = startX
          y = startY
          z = startZ
          scaleX = scaleY = scaleZ = 0
        } else if (phaseValue >= 1) {
          x = endX
          y = endY
          z = endZ
          scaleX = scaleY = scaleZ = 0
        } else {
          const arcAngle = arcStartAngle + phaseValue * arcSpan
          x = emitterOffset.x + Math.cos(arcAngle) * arcRadius + arcOffsetVec.x
          y = emitterOffset.y + Math.sin(arcAngle) * arcRadius + arcOffsetVec.y
          z = emitterOffset.z + arcLateral + arcOffsetVec.z

          const floatWave =
            Math.sin(progress * Math.PI * 2 * (state.floatFrequency || 1) + state.orbitOffset) *
            state.floatStrength *
            0.45
          y += floatWave

          const fadeIn = Math.min(1, phaseValue / 0.12)
          const fadeOut = Math.min(1, (1 - phaseValue) / 0.12)
          const visibility = Math.max(0, Math.min(fadeIn, fadeOut))

          const arcPulse =
            Math.sin(progress * Math.PI * 2 + state.orbitOffset + state.index * 0.18) * 0.2 + 0.9
          const scaleWave = arcPulse * visibility

          scaleX = state.scale.x * scaleWave
          scaleY = state.scale.y * scaleWave
          scaleZ = state.scale.z * scaleWave
        }
      }
    } else {
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

            x = emitterOffset.x + Math.cos(angle) * swirlRadius
            z = emitterOffset.z + Math.sin(angle) * swirlRadius
            y = emitterOffset.y - height * 0.5 + layerProgress * height

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
            x = emitterOffset.x + Math.cos(angle) * spiralRadius
            z = emitterOffset.z + Math.sin(angle) * spiralRadius
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
          x = emitterOffset.x + Math.cos(orbitAngle) * state.radius
          z = emitterOffset.z + Math.sin(orbitAngle) * state.radius
          y =
            state.initialPosition.y +
            Math.sin(progress * Math.PI * 2 * (state.floatFrequency || 1) + state.orbitOffset) *
              state.floatStrength
          break
        }
      }
    }

    if (
      !isRainbowArc &&
      (velocityVec.x !== 0 || velocityVec.y !== 0 || velocityVec.z !== 0 || accelerationVec.x !== 0 || accelerationVec.y !== 0 || accelerationVec.z !== 0)
    ) {
      const halfTimeSquared = 0.5 * elapsed * elapsed
      x += velocityVec.x * elapsed + accelerationVec.x * halfTimeSquared
      y += velocityVec.y * elapsed + accelerationVec.y * halfTimeSquared
      z += velocityVec.z * elapsed + accelerationVec.z * halfTimeSquared
    }

    if (colors && gradientStops) {
      let colorSampleT = gradientBaseT
      switch (gradientPlayback) {
        case 'lifetime':
          colorSampleT = wrap01(gradientBaseT + progress)
          break
        case 'scroll':
          colorSampleT = gradientBaseT + gradientSpeed * elapsed
          break
        default:
          colorSampleT = gradientBaseT
          break
      }
      const rgb = sampleGradient(gradientStops, colorSampleT, gradientSampleOptions)
      const colorIndex = i * 3
      colors[colorIndex] = rgb.r
      colors[colorIndex + 1] = rgb.g
      colors[colorIndex + 2] = rgb.b
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

  const keyframeData = { positions, rotations, scales }
  if (colors) {
    keyframeData.colors = colors
  }

  return keyframeData
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

  const wantsArcEmitter =
    params.useArcEmitter !== undefined
      ? params.useArcEmitter
      : style.customEmitter === 'rainbowArc'

  if (wantsArcEmitter) {
    style.customEmitter = 'rainbowArc'
  } else if (style.customEmitter === 'rainbowArc') {
    style.customEmitter = null
  }

  if (style.customEmitter === 'rainbowArc') {
    if (params.arcRadius !== undefined) {
      style.arcRadius = params.arcRadius
    }
    if (params.arcStartAngle !== undefined) {
      style.arcStartAngle = params.arcStartAngle
    }
    if (params.arcEndAngle !== undefined) {
      style.arcEndAngle = params.arcEndAngle
    }
    if (params.arcThickness !== undefined) {
      style.arcThickness = params.arcThickness
    }
    if (params.arcHeightOffset !== undefined) {
      style.arcHeightOffset = params.arcHeightOffset
    }
    if (params.arcFlowSpeed !== undefined) {
      style.arcFlowSpeed = params.arcFlowSpeed
    }
    if (params.arcFlowMode !== undefined) {
      style.arcFlowMode = params.arcFlowMode
    }
    if (!['continuous', 'burst'].includes(style.arcFlowMode)) {
      style.arcFlowMode = 'continuous'
    }
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
    const state = buildParticleState(params, style, i, count)
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
