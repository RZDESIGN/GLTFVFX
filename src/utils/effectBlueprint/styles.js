import {
  DEFAULT_STYLE,
  EFFECT_PRESETS,
  EFFECT_STYLES
} from './constants'

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

