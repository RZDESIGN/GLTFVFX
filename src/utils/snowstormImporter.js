import { createInitialParams, PARAM_FALLBACKS } from './vfxParameters'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const NUMBER_PATTERN = /-?(?:\d+\.?\d*|\.\d+)/g

const extractNumbers = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [value]
  }
  if (typeof value === 'string') {
    const matches = value.match(NUMBER_PATTERN)
    return matches ? matches.map(Number) : []
  }
  return []
}

const substituteVariables = (expression, context = {}, options = {}) => {
  if (typeof expression !== 'string') {
    return expression
  }
  const variables = context.variables || {}
  const normalized = expression.replace(/variable\.([a-z0-9_]+)/gi, (_, rawName) => {
    const name = rawName.toLowerCase()
    if (options.variableOverrides && Object.prototype.hasOwnProperty.call(options.variableOverrides, name)) {
      return `${options.variableOverrides[name]}`
    }
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return `${variables[name]}`
    }
    if (name.startsWith('particle_random')) {
      const randomValue = options.random ?? context.random ?? 0.5
      return `${randomValue}`
    }
    if (name === 'particle_age') {
      if (options.particleAge !== undefined) {
        return `${options.particleAge}`
      }
      if (context.particleAge !== undefined) {
        return `${context.particleAge}`
      }
      if (variables.lifetime !== undefined) {
        return `${variables.lifetime * 0.5}`
      }
      return '0'
    }
    if (name === 'emitter_age') {
      const emitterAge = options.emitterAge ?? context.emitterAge ?? 0
      return `${emitterAge}`
    }
    if (name === 'lifetime' && variables.lifetime !== undefined) {
      return `${variables.lifetime}`
    }
    if (name === 'size' && variables.size !== undefined) {
      return `${variables.size}`
    }
    return '0'
  })
  return normalized
}

const NUMERIC_EXPRESSION_PATTERN = /^[0-9+\-*/().\s]+$/

const resolveNumber = (value, fallback = 0, context, options = {}) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const normalized = substituteVariables(value, context, options)
    const numbers = extractNumbers(normalized)
    if (numbers.length === 0) return fallback
    if (/random/i.test(normalized) && numbers.length >= 2) {
      const min = Math.min(numbers[0], numbers[1])
      const max = Math.max(numbers[0], numbers[1])
      return (min + max) / 2
    }
    if (/clamp/i.test(normalized) && numbers.length >= 1) {
      return numbers[0]
    }
    if (/math\.(sin|cos|tan)/i.test(normalized)) {
      return numbers[numbers.length - 1] ?? fallback
    }
    if (NUMERIC_EXPRESSION_PATTERN.test(normalized.trim())) {
      try {
        const evaluated = Function('"use strict"; return (' + normalized + ');')()
        if (typeof evaluated === 'number' && Number.isFinite(evaluated)) {
          return evaluated
        }
      } catch (_) {
        // ignore parsing failures
      }
    }
    return numbers[0]
  }
  return fallback
}

const resolveVector3 = (value, fallback = PARAM_FALLBACKS.emissionOffset, context, options = {}) => {
  if (Array.isArray(value)) {
    return {
      x: resolveNumber(value[0], fallback.x, context, options),
      y: resolveNumber(value[1], fallback.y, context, options),
      z: resolveNumber(value[2], fallback.z, context, options)
    }
  }
  if (value && typeof value === 'object') {
    return {
      x: resolveNumber(value.x, fallback.x, context, options),
      y: resolveNumber(value.y, fallback.y, context, options),
      z: resolveNumber(value.z, fallback.z, context, options)
    }
  }
  return { ...fallback }
}

const colorFromNormalized = (r = 1, g = 1, b = 1) => {
  const clamp01 = (n) => clamp(Number.isFinite(n) ? n : 1, 0, 1)
  const toHex = (n) => Math.round(clamp01(n) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const adjustColor = (hex, delta = 0) => {
  const clampChannel = (v) => clamp(v, 0, 255)
  if (typeof hex !== 'string' || !/^#?[0-9a-f]{6}$/i.test(hex)) {
    return hex || '#ffffff'
  }
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const add = (channel) => clampChannel(channel + delta * 255)
  const toHex = (channel) => Math.round(add(channel)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const AXES = ['x', 'y', 'z']
const SAFE_MOTION_EXPRESSION = /^[0-9a-z_\-+*/().,\s:]*$/i

const sanitizeEmitterMotionExpression = (expression) => {
  if (typeof expression !== 'string') return null
  const trimmed = expression.trim()
  if (!trimmed || !/variable\.emitter_age/i.test(trimmed)) return null
  if (!SAFE_MOTION_EXPRESSION.test(trimmed.replace(/math\.[a-z_]+/gi, '').replace(/variable\.emitter_age/gi, 'time'))) {
    return null
  }
  return trimmed
}

const registerEmitterMotionAxis = (params, axis, expression) => {
  const sanitized = sanitizeEmitterMotionExpression(expression)
  if (!sanitized) return
  const motion = ensureNested(params, 'emitterMotion', cloneEmitterMotionDefaults)
  motion.mode = 'expression'
  if (!motion.axisExpressions) {
    motion.axisExpressions = { x: null, y: null, z: null }
  }
  motion.axisExpressions[axis] = sanitized
}

const toHexColor = (value, fallback = '#ffffff') => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
    if (/^[0-9a-f]{6}$/i.test(normalized)) {
      return `#${normalized}`
    }
  }
  if (Array.isArray(value)) {
    return colorFromNormalized(value[0], value[1], value[2])
  }
  if (typeof value === 'object' && value !== null) {
    return colorFromNormalized(value.r, value.g, value.b)
  }
  return fallback
}

const extractGradientStops = (gradient) => {
  if (!gradient || typeof gradient !== 'object') return []
  return Object.entries(gradient)
    .map(([stop, color]) => ({
      stop: clamp(parseFloat(stop), 0, 1),
      color: toHexColor(color)
    }))
    .sort((a, b) => a.stop - b.stop)
}

const findRadiusFromOffsetExpr = (expr) => {
  if (typeof expr !== 'string') return null
  const parts = expr.split('*').map(part => part.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const segment = parts[i]
    if (/emitter_age/i.test(segment)) continue
    const samples = extractNumbers(segment).map(num => Math.abs(num)).filter(num => Number.isFinite(num))
    if (samples.length) {
      return Math.max(...samples)
    }
  }
  const fallbackSamples = extractNumbers(expr).map(num => Math.abs(num)).filter(num => Number.isFinite(num))
  return fallbackSamples.length ? Math.max(...fallbackSamples) : null
}

const detectArcEmitterFromPointShape = (shape, context) => {
  if (!shape || !Array.isArray(shape.offset) || shape.offset.length < 2) {
    return null
  }
  const [xExpr, yExpr, zExpr = 0] = shape.offset
  if (typeof xExpr !== 'string' || typeof yExpr !== 'string') return null
  const hasCos = /math\.cos/i.test(xExpr)
  const hasSin = /math\.sin/i.test(yExpr)
  if (!hasCos || !hasSin) return null
  const radiusGuess =
    findRadiusFromOffsetExpr(xExpr) ??
    findRadiusFromOffsetExpr(yExpr) ??
    2.5
  const radius = Math.max(0.05, radiusGuess)
  const thicknessBase = Math.max(radius * 0.35, 0.1)
  return {
    radius,
    thickness: Math.max(0.05, thicknessBase),
    heightOffset: resolveNumber(zExpr, 0, context),
    startAngle: Math.PI * 0.05,
    endAngle: Math.PI * 0.95,
    flowSpeed: 0.65,
    flowMode: 'continuous'
  }
}

const ensureNested = (params, key, fallback) => {
  if (params[key]) return params[key]
  const next = typeof fallback === 'function' ? fallback() : { ...(fallback || {}) }
  params[key] = next
  return next
}

const cloneEmitterDefaults = () => ({ ...PARAM_FALLBACKS.emitter })
const cloneEmitterSpaceDefaults = () => ({ ...PARAM_FALLBACKS.emitterSpace })
const cloneRotationDefaults = () => ({ ...PARAM_FALLBACKS.rotation })
const cloneCollisionDefaults = () => ({ ...PARAM_FALLBACKS.collision })
const cloneFlipbookDefaults = () => ({
  ...PARAM_FALLBACKS.textureFlipbook,
  baseUV: { ...PARAM_FALLBACKS.textureFlipbook.baseUV },
  sizeUV: { ...PARAM_FALLBACKS.textureFlipbook.sizeUV },
  stepUV: { ...PARAM_FALLBACKS.textureFlipbook.stepUV }
})
const cloneEmitterMotionDefaults = () => ({
  ...PARAM_FALLBACKS.emitterMotion,
  axisExpressions: {
    ...(PARAM_FALLBACKS.emitterMotion?.axisExpressions || {})
  }
})

const parseEmitterInitialization = (components = {}) => {
  const init = components['minecraft:emitter_initialization']
  const variables = {}
  if (!init || typeof init.creation_expression !== 'string') {
    return variables
  }
  const statements = init.creation_expression.split(';')
  statements.forEach(segment => {
    const statement = segment.trim()
    if (!statement) return
    const match = statement.match(/^variable\.([a-z0-9_]+)\s*=\s*(.+)$/i)
    if (!match) return
    const [, rawName, expr] = match
    const name = rawName.toLowerCase()
    const value = resolveNumber(expr.trim(), NaN, { variables })
    if (Number.isFinite(value)) {
      variables[name] = value
    }
  })
  return variables
}

const buildExpressionContext = (components = {}) => {
  const variables = parseEmitterInitialization(components)
  return {
    variables,
    random: 0.5,
    emitterAge: 0,
    particleAge: 0
  }
}

const pickEmitterShape = (components = {}, params, warnings, context) => {
  const sphere = components['minecraft:emitter_shape_sphere']
  const disc = components['minecraft:emitter_shape_disc']
  const box = components['minecraft:emitter_shape_box']
  const point = components['minecraft:emitter_shape_point']
  const shape = sphere || disc || box || point || null

  if (!shape) return

  if (point) {
    const arcConfig = detectArcEmitterFromPointShape(point, context)
    if (arcConfig) {
      params.useArcEmitter = true
      params.emissionShape = 'disc'
      params.emissionSurfaceOnly = true
      params.arcRadius = arcConfig.radius
      params.arcThickness = arcConfig.thickness
      params.arcHeightOffset = arcConfig.heightOffset
      params.arcStartAngle = arcConfig.startAngle
      params.arcEndAngle = arcConfig.endAngle
      params.arcFlowSpeed = arcConfig.flowSpeed
      params.arcFlowMode = arcConfig.flowMode
      params.motionDirectionMode = params.motionDirectionMode || 'outwards'
      return
    }
  }

  if (sphere) {
    params.emissionShape = 'sphere'
    params.spread = clamp(resolveNumber(sphere.radius, params.spread, context), 0.01, 6)
  } else if (disc) {
    params.emissionShape = 'disc'
    params.spread = clamp(resolveNumber(disc.radius, params.spread, context), 0.05, 6)
  } else if (box) {
    params.emissionShape = 'box'
    if (Array.isArray(box.half_dimensions)) {
      const dims = box.half_dimensions.map(v => resolveNumber(v, 0.25, context))
      const avg = dims.reduce((sum, val) => sum + Math.abs(val), 0) / dims.length || 1
      params.spread = clamp(avg * 2, 0.1, 6)
    }
  } else if (point) {
    params.emissionShape = 'sphere'
    params.spread = 0.15
  }

  if (shape.offset) {
    if (Array.isArray(shape.offset)) {
      const resolved = { ...params.emissionOffset }
      shape.offset.forEach((component, index) => {
        const axis = AXES[index]
        if (!axis) return
        if (typeof component === 'string' && /variable\.emitter_age/i.test(component)) {
          registerEmitterMotionAxis(params, axis, component)
          if (resolved[axis] === undefined) {
            resolved[axis] = params.emissionOffset?.[axis] ?? 0
          }
        } else {
          resolved[axis] = resolveNumber(component, resolved[axis] ?? params.emissionOffset?.[axis] ?? 0, context)
        }
      })
      params.emissionOffset = {
        ...params.emissionOffset,
        ...resolved
      }
    } else {
      params.emissionOffset = resolveVector3(shape.offset, params.emissionOffset, context)
    }
  }
  if (typeof shape.surface_only === 'boolean') {
    params.emissionSurfaceOnly = shape.surface_only
  }

  if (shape.direction && typeof shape.direction === 'string') {
    const lower = shape.direction.toLowerCase()
    if (lower === 'outwards' || lower === 'inwards') {
      params.motionDirectionMode = lower
    }
  } else if (shape.direction && (Array.isArray(shape.direction) || typeof shape.direction === 'object')) {
    const approximation = resolveVector3(shape.direction, params.motionDirection || PARAM_FALLBACKS.motionDirection, context)
    const magnitude = Math.hypot(approximation.x || 0, approximation.y || 0, approximation.z || 0)
    if (magnitude > 1e-3) {
      params.motionDirectionMode = 'custom'
      params.motionDirection = {
        x: approximation.x / magnitude,
        y: approximation.y / magnitude,
        z: approximation.z / magnitude
      }
    }
  }
}

const pickLifetime = (components = {}, params, context) => {
  const expression = components['minecraft:particle_lifetime_expression']
  const constant = components['minecraft:particle_lifetime_constant']
  const linear = components['minecraft:particle_lifetime_linear']
  const source = expression || constant || linear || null
  if (!source) return
  const lifetime = resolveNumber(source.max_lifetime, params.lifetime, context)
  params.lifetime = clamp(lifetime, 0.2, 10)
}

const pickRate = (components = {}, params, context) => {
  const steady = components['minecraft:emitter_rate_steady']
  const instant = components['minecraft:emitter_rate_instant']
  const emitter = ensureNested(params, 'emitter', cloneEmitterDefaults)
  if (steady) {
    emitter.rateMode = 'steady'
    emitter.spawnRate = clamp(resolveNumber(steady.spawn_rate, emitter.spawnRate, context), 0, 10000)
    emitter.maxParticles = clamp(resolveNumber(steady.max_particles, emitter.maxParticles, context), 1, 50000)
    const estimate = Math.max(emitter.spawnRate * params.lifetime, emitter.maxParticles || 0)
    params.particleCount = clamp(Math.round(estimate || emitter.spawnRate || params.particleCount), 8, 200)
    return
  }
  if (instant) {
    emitter.rateMode = 'instant'
    emitter.burstAmount = clamp(resolveNumber(instant.amount, emitter.burstAmount, context), 1, 5000)
    emitter.maxParticles = clamp(resolveNumber(instant.max_particles, emitter.maxParticles, context), 1, 50000)
    params.particleCount = clamp(Math.round(emitter.burstAmount || params.particleCount), 8, 200)
  }
}

const pickSpeed = (components = {}, params, context) => {
  const speed = components['minecraft:particle_initial_speed']
  if (speed !== undefined) {
    params.particleSpeed = clamp(resolveNumber(speed, params.particleSpeed, context), 0, 12)
  }
}

const pickAcceleration = (components = {}, params, context) => {
  const motion = components['minecraft:particle_motion_dynamic']
  if (motion?.linear_acceleration) {
    params.motionAcceleration = resolveVector3(motion.linear_acceleration, params.motionAcceleration, context)
  }
  if (motion?.linear_drag_coefficient !== undefined) {
    params.motionDrag = resolveNumber(motion.linear_drag_coefficient, params.motionDrag || 0, context)
  }
}

const pickSize = (components = {}, params, context) => {
  const appearance = components['minecraft:particle_appearance_billboard']
  if (!appearance) return
  const size = appearance.size
  if (Array.isArray(size)) {
    const avg =
      (resolveNumber(size[0], params.particleSize, context, { particleAge: 0 }) +
        resolveNumber(size[1], params.particleSize, context, { particleAge: 0 })) / 2
    params.particleSize = clamp(Math.abs(avg) || params.particleSize, 0.02, 2)
  } else if (typeof size === 'number' || typeof size === 'string') {
    params.particleSize = clamp(
      Math.abs(resolveNumber(size, params.particleSize, context, { particleAge: 0 })) || params.particleSize,
      0.02,
      2
    )
  }
}

const pickColors = (components = {}, params, warnings, context) => {
  const tint = components['minecraft:particle_appearance_tinting']
  if (!tint?.color) return

  if (tint.color && typeof tint.color === 'object' && tint.color.gradient) {
    const stops = extractGradientStops(tint.color.gradient)
    if (stops.length) {
      params.colorMode = 'gradient'
      params.colorGradient = stops
      params.colorGradientSource = params.useArcEmitter ? 'layer' : 'random'
      params.colorGradientPlayback = 'static'
      params.colorGradientSpeed = 0
      params.primaryColor = stops[0].color
      params.secondaryColor = stops[stops.length - 1].color
      return
    }
  }

  const colorValues = Array.isArray(tint.color) ? tint.color : [tint.color]
  const r = resolveNumber(colorValues[0], 1, context)
  const g = resolveNumber(colorValues[1], 1, context)
  const b = resolveNumber(colorValues[2], 1, context)
  const primary = colorFromNormalized(r, g, b)
  const secondary = adjustColor(primary, 0.1)
  params.primaryColor = primary
  params.secondaryColor = secondary
  if (typeof colorValues[0] === 'string') {
    warnings.push('Color expressions were simplified to approximate RGB values.')
  }
}

const pickEmitterSpace = (components = {}, params) => {
  const config = components['minecraft:emitter_local_space']
  if (!config) return
  const emitterSpace = ensureNested(params, 'emitterSpace', cloneEmitterSpaceDefaults)
  emitterSpace.localPosition = !!config.position
  emitterSpace.localRotation = !!config.rotation
  emitterSpace.localVelocity = !!config.velocity
}

const pickEmitterLifetime = (components = {}, params, warnings, context) => {
  const looping = components['minecraft:emitter_lifetime_looping']
  const once = components['minecraft:emitter_lifetime_once']
  const expression = components['minecraft:emitter_lifetime_expression']
  const emitter = ensureNested(params, 'emitter', cloneEmitterDefaults)
  if (looping) {
    emitter.lifetimeMode = 'looping'
    emitter.activeTime = Math.max(0, resolveNumber(looping.active_time, emitter.activeTime, context))
    emitter.sleepTime = Math.max(0, resolveNumber(looping.sleep_time, emitter.sleepTime, context))
    return
  }
  if (once) {
    emitter.lifetimeMode = 'once'
    emitter.onceDuration = Math.max(0, resolveNumber(once.active_time, emitter.onceDuration, context))
    return
  }
  if (expression) {
    emitter.lifetimeMode = 'expression'
    emitter.activationExpression = typeof expression.activation === 'string'
      ? expression.activation
      : emitter.activationExpression || ''
    emitter.expirationExpression = typeof expression.expiration === 'string'
      ? expression.expiration
      : emitter.expirationExpression || ''
    warnings.push('Emitter lifetime expressions are imported as metadata only.')
  }

  emitter.loopParticles = emitter.rateMode === 'steady' && emitter.lifetimeMode !== 'once'
}

const pickRotation = (components = {}, params, context) => {
  const spin = components['minecraft:particle_initial_spin']
  if (!spin) return
  const rotation = ensureNested(params, 'rotation', cloneRotationDefaults)
  rotation.mode = 'dynamic'
  rotation.rate = resolveNumber(spin.rotation_rate, rotation.rate, context)
  rotation.acceleration = resolveNumber(spin.rotation_acceleration, rotation.acceleration, context)
}

const pickCollision = (components = {}, params, context) => {
  const collision = components['minecraft:particle_motion_collision']
  if (!collision) return
  const state = ensureNested(params, 'collision', cloneCollisionDefaults)
  state.enabled = true
  state.radius = Math.max(0, resolveNumber(collision.collision_radius, state.radius, context))
  state.drag = resolveNumber(collision.collision_drag, state.drag, context)
  state.bounciness = resolveNumber(collision.coefficient_of_restitution, state.bounciness, context)
  state.expireOnContact = !!collision.expire_on_contact
}

const pickFacingAndUV = (components = {}, params, context) => {
  const appearance = components['minecraft:particle_appearance_billboard']
  if (!appearance) return
  if (appearance.facing_camera_mode) {
    params.billboardFacing = appearance.facing_camera_mode
  }
  if (appearance.direction_mode) {
    params.billboardDirectionMode = appearance.direction_mode
  }
  if (appearance.direction) {
    params.billboardCustomDirection = resolveVector3(appearance.direction, params.billboardCustomDirection, context)
  }
  if (appearance.speed_threshold !== undefined) {
    params.billboardSpeedThreshold = Math.max(0, resolveNumber(appearance.speed_threshold, params.billboardSpeedThreshold, context))
  }
  if (appearance.uv) {
    const uv = appearance.uv
    if (Array.isArray(uv.uv)) {
      params.uvOffset = {
        u: resolveNumber(uv.uv[0], params.uvOffset.u, context),
        v: resolveNumber(uv.uv[1], params.uvOffset.v, context)
      }
    }
    if (Array.isArray(uv.uv_size)) {
      params.uvSize = {
        u: resolveNumber(uv.uv_size[0], params.uvSize.u, context),
        v: resolveNumber(uv.uv_size[1], params.uvSize.v, context)
      }
    }
    const flip = uv.flipbook
    if (flip) {
      const flipbook = ensureNested(params, 'textureFlipbook', cloneFlipbookDefaults)
      flipbook.enabled = true
      flipbook.textureWidth = resolveNumber(uv.texture_width, flipbook.textureWidth, context)
      flipbook.textureHeight = resolveNumber(uv.texture_height, flipbook.textureHeight, context)
      flipbook.baseUV = {
        u: resolveNumber(flip.base_UV?.[0], flipbook.baseUV.u, context),
        v: resolveNumber(flip.base_UV?.[1], flipbook.baseUV.v, context)
      }
      flipbook.sizeUV = {
        u: resolveNumber(flip.size_UV?.[0], flipbook.sizeUV.u, context),
        v: resolveNumber(flip.size_UV?.[1], flipbook.sizeUV.v, context)
      }
      flipbook.stepUV = {
        u: resolveNumber(flip.step_UV?.[0], flipbook.stepUV.u, context),
        v: resolveNumber(flip.step_UV?.[1], flipbook.stepUV.v, context)
      }
      flipbook.maxFrame = Math.max(1, resolveNumber(flip.max_frame, flipbook.maxFrame, context))
      flipbook.fps = Math.max(0, resolveNumber(flip.frames_per_second ?? uv.frames_per_second, flipbook.fps, context))
      flipbook.stretchToLifetime = !!flip.stretch_to_lifetime
      flipbook.loop = flip.loop !== undefined ? !!flip.loop : flipbook.loop
    }
  }
}

const applyMaterialDefaults = (description = {}, params) => {
  const material = description.basic_render_parameters?.material
  if (typeof material === 'string') {
    if (material.includes('add')) {
      params.glowIntensity = 2.2
    } else if (material.includes('opaque')) {
      params.opacity = 1
      params.glowIntensity = 0.8
    } else if (material.includes('alpha')) {
      params.opacity = 0.85
    }
  }
}

const buildImportMetadata = (description = {}) => {
  const id = description.identifier || null
  const material = description.basic_render_parameters?.material
  const texture = description.basic_render_parameters?.texture
  return {
    source: 'snowstorm',
    identifier: id,
    material,
    texturePath: texture || null
  }
}

export const convertSnowstormToVfxParams = (raw) => {
  const warnings = []
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid Snowstorm file: missing JSON payload.')
  }
  const effect = payload.particle_effect
  if (!effect || typeof effect !== 'object') {
    throw new Error('Invalid Snowstorm file: missing particle_effect block.')
  }

  const params = createInitialParams()
  const description = effect.description || {}
  const identifier = description.identifier || 'snowstorm:import'
  params.effectType = identifier
  params.effectIdentifier = identifier
  params.effectDescription = description?.basic_render_parameters?.texture || ''
  params.animationType = 'custom'

  applyMaterialDefaults(description, params)
  const components = effect.components || {}
  const expressionContext = buildExpressionContext(components)
  const initVars = expressionContext.variables || {}

  if (Number.isFinite(initVars.lifetime)) {
    params.lifetime = clamp(Math.abs(initVars.lifetime), 0.2, 10)
  }
  if (Number.isFinite(initVars.size)) {
    params.particleSize = clamp(Math.abs(initVars.size), 0.02, 2)
  }

  pickEmitterShape(components, params, warnings, expressionContext)
  pickLifetime(components, params, expressionContext)
  pickRate(components, params, expressionContext)
  pickSpeed(components, params, expressionContext)
  pickAcceleration(components, params, expressionContext)
  pickSize(components, params, expressionContext)
  pickColors(components, params, warnings, expressionContext)
  pickEmitterSpace(components, params)
  pickEmitterLifetime(components, params, warnings, expressionContext)
  pickRotation(components, params, expressionContext)
  pickCollision(components, params, expressionContext)
  pickFacingAndUV(components, params, expressionContext)

  params.importMetadata = buildImportMetadata(description)
  if (!params.importMetadata.texturePath) {
    warnings.push('Texture path was not provided; using blocky procedural colors.')
  }

  if (!params.importMetadata.texturePath) {
    params.textureMode = 'auto'
    params.customTexture = null
  }

  return { params, warnings }
}
