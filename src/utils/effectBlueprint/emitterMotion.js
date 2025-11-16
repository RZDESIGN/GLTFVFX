const DEG_TO_RAD = Math.PI / 180
const SAFE_EXPRESSION = /^[0-9a-z_\-+*/().,\s:]*$/i

const molangMath = {
  sin: (deg) => Math.sin(deg * DEG_TO_RAD),
  cos: (deg) => Math.cos(deg * DEG_TO_RAD),
  tan: (deg) => Math.tan(deg * DEG_TO_RAD)
}

const compileAxisExpression = (expression) => {
  if (typeof expression !== 'string' || !/variable\.emitter_age/i.test(expression)) {
    return null
  }
  const trimmed = expression.trim()
  if (!trimmed) return null
  const sanitized = trimmed.replace(/math\.[a-z_]+/gi, match => match.toLowerCase())
  if (!SAFE_EXPRESSION.test(sanitized.replace(/variable\.emitter_age/gi, 'time'))) {
    return null
  }

  const jsExpression = trimmed
    .replace(/math\.(sin|cos|tan)/gi, (_, fn) => `__MATH.${fn.toLowerCase()}`)
    .replace(/variable\.emitter_age/gi, '__time')

  try {
    const evaluator = new Function('__time', '__MATH', `return ${jsExpression};`)
    return (time) => {
      try {
        const value = evaluator(time, molangMath)
        return Number.isFinite(value) ? value : 0
      } catch {
        return 0
      }
    }
  } catch {
    return null
  }
}

export const compileEmitterMotion = (config) => {
  if (!config || config.mode !== 'expression' || !config.axisExpressions) {
    return null
  }
  const axisFns = {}
  let hasAxis = false
  for (const axis of ['x', 'y', 'z']) {
    const fn = compileAxisExpression(config.axisExpressions[axis])
    if (fn) {
      axisFns[axis] = fn
      hasAxis = true
    }
  }
  if (!hasAxis) {
    return null
  }
  return {
    mode: 'expression',
    axisFns
  }
}

export const sampleEmitterMotion = (compiledMotion, time) => {
  if (!compiledMotion || !compiledMotion.axisFns) {
    return null
  }
  const result = { x: 0, y: 0, z: 0 }
  for (const axis of ['x', 'y', 'z']) {
    const fn = compiledMotion.axisFns[axis]
    if (typeof fn === 'function') {
      result[axis] = fn(time)
    }
  }
  return result
}
