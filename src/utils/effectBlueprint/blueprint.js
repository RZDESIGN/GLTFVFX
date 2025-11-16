import { EFFECT_STYLES, getParticleShapeDefinition } from './constants'
import { buildAnimationKeyframes } from './keyframes'
import { buildParticleState } from './state'
import { getEffectStyle } from './styles'

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export const buildParticleSystemBlueprint = (params) => {
  const style = getEffectStyle(params.effectType)
  const hasNamedStyle = !!EFFECT_STYLES[params.effectType]
  const shapeDefinition = getParticleShapeDefinition(params.particleShape)
  const emitterSettings = params.emitter || {}
  const emitterRateMode = emitterSettings.rateMode || 'steady'
  const emitterLifetimeMode = emitterSettings.lifetimeMode || 'looping'
  const useEmissionLoop = !!emitterSettings.loopParticles

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

  if (Array.isArray(params.colorGradient) && params.colorGradient.length > 0) {
    style.colorMode = params.colorMode || 'gradient'
    style.colorGradient = params.colorGradient
      .map(stop => ({
        stop: clamp01(stop.stop ?? stop.t ?? 0),
        color: stop.color || stop.value || '#ffffff'
      }))
      .sort((a, b) => a.stop - b.stop)
    if (params.colorGradientSource) {
      style.colorGradientSource = params.colorGradientSource
    }
    if (params.colorGradientPlayback) {
      style.colorGradientPlayback = params.colorGradientPlayback
    }
    if (Number.isFinite(params.colorGradientSpeed)) {
      style.colorGradientSpeed = params.colorGradientSpeed
    }
  }

  // Apply user-controlled opacity if provided
  if (typeof params.opacity === 'number' && Number.isFinite(params.opacity)) {
    const userOpacity = Math.max(0, Math.min(1, params.opacity))
    style.opacityRange = [userOpacity, userOpacity]
    if (userOpacity < 1 && style.alphaMode !== 'BLEND') {
      style.alphaMode = 'BLEND'
      // Prefer disabling depthWrite for proper blending
      style.depthWrite = false
    }
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
    if (!hasNamedStyle && style.customEmitter !== 'rainbowArc' && EFFECT_STYLES.rainbow) {
      const arcDefaults = EFFECT_STYLES.rainbow
      Object.keys(arcDefaults).forEach(key => {
        if (key === 'customEmitter') return
        const value = arcDefaults[key]
        if (Array.isArray(value)) {
          style[key] = [...value]
        } else if (value && typeof value === 'object') {
          style[key] = { ...value }
        } else {
          style[key] = value
        }
      })
    }
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
    const cycleOffset = useEmissionLoop ? (i / count) : 0
    const state = buildParticleState(params, style, i, count)
    state.cycleOffset = cycleOffset
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
    duration: times.length > 0 ? times[times.length - 1] : params.lifetime,
    loops: useEmissionLoop
  }
}
