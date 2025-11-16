import { EFFECT_PRESETS, getEffectPreset, PARTICLE_SHAPE_OPTIONS } from './effectBlueprint'
import { ARC_FLOW_MODE_OPTIONS, EMISSION_SHAPE_OPTIONS, MOTION_DIRECTION_OPTIONS } from '../constants/uiOptions'

const DEFAULT_FLIPBOOK = {
  enabled: false,
  textureWidth: 16,
  textureHeight: 16,
  baseUV: { u: 0, v: 0 },
  sizeUV: { u: 16, v: 16 },
  stepUV: { u: 0, v: 16 },
  fps: 16,
  maxFrame: 16,
  stretchToLifetime: true,
  loop: true
}

const DEFAULT_COLLISION = {
  enabled: false,
  radius: 0.1,
  drag: 0,
  bounciness: 0,
  expireOnContact: false,
  floorHeight: 0
}

const DEFAULT_ROTATION = {
  mode: 'none',
  rate: 0,
  acceleration: 0,
  drag: 0
}

const DEFAULT_EMITTER = {
  rateMode: 'steady',
  spawnRate: 20,
  burstAmount: 50,
  maxParticles: 200,
  lifetimeMode: 'looping',
  activeTime: 1,
  sleepTime: 0,
  onceDuration: 1,
  activationExpression: '',
  expirationExpression: '',
  loopParticles: false
}

const DEFAULT_EMITTER_SPACE = {
  localPosition: false,
  localRotation: false,
  localVelocity: false
}

const PARAM_FALLBACKS = {
  effectIdentifier: 'hytopia:effect',
  effectDescription: '',
  emissionSurfaceOnly: false,
  emissionOffset: { x: 0, y: 0, z: 0 },
  motionDirectionMode: 'outwards',
  motionDirection: { x: 0, y: 1, z: 0 },
  motionAcceleration: { x: 0, y: 0, z: 0 },
  motionDrag: 0,
  useArcEmitter: false,
  opacity: 1,
  arcRadius: 3,
  arcStartAngle: Math.PI * 0.1,
  arcEndAngle: Math.PI * 0.9,
  arcThickness: 0.12,
  arcHeightOffset: 0,
  arcFlowSpeed: 1,
  arcFlowMode: 'continuous',
  emitter: { ...DEFAULT_EMITTER },
  emitterSpace: { ...DEFAULT_EMITTER_SPACE },
  rotation: { ...DEFAULT_ROTATION },
  collision: { ...DEFAULT_COLLISION },
  textureFlipbook: { ...DEFAULT_FLIPBOOK },
  uvOffset: { u: 0, v: 0 },
  uvSize: { u: 1, v: 1 },
  billboardFacing: 'rotate_xyz',
  billboardDirectionMode: 'velocity',
  billboardSpeedThreshold: 0.01,
  billboardCustomDirection: { x: 0, y: 1, z: 0 }
}

const FALLBACK_PRESET = {
  particleCount: 60,
  particleSize: 0.22,
  particleSpeed: 1.6,
  spread: 1.1,
  primaryColor: '#ff4500',
  secondaryColor: '#ffa500',
  emissionShape: 'sphere',
  animationType: 'explode',
  glowIntensity: 1,
  lifetime: 1.8,
  particleShape: 'style'
}

const degToRad = (deg) => (deg * Math.PI) / 180

const getRandomItem = (items, fallback) => {
  if (!Array.isArray(items) || items.length === 0) return fallback
  return items[Math.floor(Math.random() * items.length)]
}

const getRandomInt = (min, max) => {
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  return Math.floor(Math.random() * (upper - lower + 1)) + lower
}

const getRandomFloat = (min, max, precision = 2) => {
  const value = min + Math.random() * (max - min)
  return Number(value.toFixed(precision))
}

const getRandomColor = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`

const getRandomVector = (min, max, precision = 2) => ({
  x: getRandomFloat(min, max, precision),
  y: getRandomFloat(min, max, precision),
  z: getRandomFloat(min, max, precision)
})

const randomBoolean = (chance = 0.5) => Math.random() < chance

const getMotionDirectionForMode = (mode) => {
  const option = MOTION_DIRECTION_OPTIONS.find(opt => opt.id === mode)
  if (mode === 'custom') {
    const vector = getRandomVector(-1, 1, 2)
    const nearZero = Math.abs(vector.x) < 0.1 && Math.abs(vector.y) < 0.1 && Math.abs(vector.z) < 0.1
    return nearZero ? { x: 0, y: 1, z: 0 } : vector
  }
  if (option?.vector) {
    return { ...option.vector }
  }
  return { ...PARAM_FALLBACKS.motionDirection }
}

const cloneVector3 = (source = { x: 0, y: 0, z: 0 }, fallback = { x: 0, y: 0, z: 0 }) => ({
  x: Number.isFinite(source.x) ? source.x : fallback.x,
  y: Number.isFinite(source.y) ? source.y : fallback.y,
  z: Number.isFinite(source.z) ? source.z : fallback.z
})

const cloneFlipbook = (source = DEFAULT_FLIPBOOK) => ({
  ...DEFAULT_FLIPBOOK,
  ...source,
  baseUV: { ...(source.baseUV || DEFAULT_FLIPBOOK.baseUV) },
  sizeUV: { ...(source.sizeUV || DEFAULT_FLIPBOOK.sizeUV) },
  stepUV: { ...(source.stepUV || DEFAULT_FLIPBOOK.stepUV) }
})

const cloneEmitterSpace = (source = DEFAULT_EMITTER_SPACE) => ({
  ...DEFAULT_EMITTER_SPACE,
  ...source
})

const cloneEmitter = (source = DEFAULT_EMITTER) => ({
  ...DEFAULT_EMITTER,
  ...source
})

const cloneRotation = (source = DEFAULT_ROTATION) => ({
  ...DEFAULT_ROTATION,
  ...source
})

const cloneCollision = (source = DEFAULT_COLLISION) => ({
  ...DEFAULT_COLLISION,
  ...source
})

const buildPresetParams = (effectType = 'fireball') => {
  const preset = getEffectPreset(effectType) || {}
  const merged = {
    ...PARAM_FALLBACKS,
    ...FALLBACK_PRESET,
    ...preset
  }
  return {
    ...merged,
    effectIdentifier: merged.effectIdentifier || `${effectType}:effect`,
    emissionOffset: cloneVector3(merged.emissionOffset, PARAM_FALLBACKS.emissionOffset),
    motionDirection: cloneVector3(merged.motionDirection, PARAM_FALLBACKS.motionDirection),
    motionAcceleration: cloneVector3(merged.motionAcceleration, PARAM_FALLBACKS.motionAcceleration),
    emitter: cloneEmitter(merged.emitter),
    emitterSpace: cloneEmitterSpace(merged.emitterSpace),
    rotation: cloneRotation(merged.rotation),
    collision: cloneCollision(merged.collision),
    textureFlipbook: cloneFlipbook(merged.textureFlipbook),
    uvOffset: { ...(merged.uvOffset || PARAM_FALLBACKS.uvOffset) },
    uvSize: { ...(merged.uvSize || PARAM_FALLBACKS.uvSize) },
    billboardCustomDirection: cloneVector3(
      merged.billboardCustomDirection,
      PARAM_FALLBACKS.billboardCustomDirection
    ),
    glowIntensity: 1,
    particleShape: merged.particleShape || FALLBACK_PRESET.particleShape
  }
}

export const createInitialParams = () => ({
  effectType: 'fireball',
  ...buildPresetParams('fireball'),
  effectIdentifier: 'hytopia:effect',
  effectDescription: '',
  textureMode: 'auto',
  textureResolution: 16,
  customTexture: null,
  textureBlend: 1
})

export const updateParamsForEffectType = (currentParams, effectType) => {
  const preset = buildPresetParams(effectType)
  return {
    ...currentParams,
    ...preset,
    effectType
  }
}

export const createRandomParams = () => {
  const effectTypes = Object.keys(EFFECT_PRESETS)
  const particleShapeIds = PARTICLE_SHAPE_OPTIONS.map(shape => shape.id)
  const effectType = getRandomItem(effectTypes, 'fireball')
  const preset = getEffectPreset(effectType) || buildPresetParams(effectType)
  const particleShape = getRandomItem(particleShapeIds, 'style')
  const emissionShape = getRandomItem(EMISSION_SHAPE_OPTIONS)?.id || 'sphere'
  const motionDirectionMode = getRandomItem(MOTION_DIRECTION_OPTIONS)?.id || 'outwards'
  const motionDirection = getMotionDirectionForMode(motionDirectionMode)
  const useArcEmitter = randomBoolean()
  const arcFlowMode = getRandomItem(ARC_FLOW_MODE_OPTIONS)?.id || 'continuous'
  const arcStartDeg = getRandomInt(0, 170)
  const arcEndDeg = getRandomInt(arcStartDeg + 1, 180)
  const arcAngles = {
    arcStartAngle: degToRad(arcStartDeg),
    arcEndAngle: degToRad(arcEndDeg)
  }
  const arcSettings = useArcEmitter
    ? {
        arcRadius: getRandomFloat(0.5, 4, 1),
        arcThickness: getRandomFloat(0.05, 0.4, 2),
        arcHeightOffset: 0,
        arcFlowSpeed: getRandomFloat(0.1, 2.5, 2),
        arcFlowMode,
        ...arcAngles
      }
    : {
        arcRadius: PARAM_FALLBACKS.arcRadius,
        arcThickness: PARAM_FALLBACKS.arcThickness,
        arcHeightOffset: PARAM_FALLBACKS.arcHeightOffset,
        arcFlowSpeed: PARAM_FALLBACKS.arcFlowSpeed,
        arcFlowMode: PARAM_FALLBACKS.arcFlowMode,
        arcStartAngle: PARAM_FALLBACKS.arcStartAngle,
        arcEndAngle: PARAM_FALLBACKS.arcEndAngle
      }

  return {
    ...PARAM_FALLBACKS,
    ...preset,
    effectType,
    effectIdentifier: 'hytopia:' + effectType,
    effectDescription: '',
    particleShape,
    particleCount: getRandomInt(10, 200),
    particleSize: getRandomFloat(0.05, 0.5, 2),
    particleSpeed: getRandomFloat(0.1, 3, 1),
    spread: getRandomFloat(0.5, 3, 1),
    glowIntensity: getRandomFloat(0.5, 5, 1),
    lifetime: getRandomFloat(0.5, 5, 1),
    primaryColor: getRandomColor(),
    secondaryColor: getRandomColor(),
    emissionShape,
    emissionSurfaceOnly: randomBoolean(),
    emissionOffset: { ...PARAM_FALLBACKS.emissionOffset },
    motionDirectionMode,
    motionDirection,
    motionAcceleration: getRandomVector(-0.5, 0.5, 2),
    useArcEmitter,
    ...arcSettings,
    emitter: cloneEmitter(),
    emitterSpace: cloneEmitterSpace(),
    rotation: cloneRotation(),
    collision: cloneCollision(),
    textureFlipbook: cloneFlipbook(),
    uvOffset: { ...PARAM_FALLBACKS.uvOffset },
    uvSize: { ...PARAM_FALLBACKS.uvSize },
    billboardCustomDirection: cloneVector3(PARAM_FALLBACKS.billboardCustomDirection, PARAM_FALLBACKS.billboardCustomDirection),
    textureMode: 'auto',
    textureResolution: 16,
    customTexture: null,
    textureBlend: 1
  }
}

export { PARAM_FALLBACKS }
