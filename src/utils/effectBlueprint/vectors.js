export const toVector3 = (value) => {
  const source = value && typeof value === 'object' ? value : {}
  return {
    x: Number.isFinite(source.x) ? source.x : 0,
    y: Number.isFinite(source.y) ? source.y : 0,
    z: Number.isFinite(source.z) ? source.z : 0
  }
}

export const addVectors = (a, b) => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z
})

export const scaleVector = (v, scalar) => ({
  x: v.x * scalar,
  y: v.y * scalar,
  z: v.z * scalar
})

export const vectorLength = (v) => Math.hypot(v.x, v.y, v.z)

export const normalizeVector = (v) => {
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

