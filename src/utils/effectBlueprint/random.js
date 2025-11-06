export const stringHash = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export const seededRandom = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export const createRandomGenerator = (effectType, index) => {
  const base = stringHash(effectType) * 0.0001 + index * 13.37
  return (salt = 0) => seededRandom(base + salt * 17.17)
}
