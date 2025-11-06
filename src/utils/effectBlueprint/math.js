export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export const wrap01 = (value) => {
  if (!Number.isFinite(value)) return 0
  return ((value % 1) + 1) % 1
}

