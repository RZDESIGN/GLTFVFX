import * as THREE from 'three'

const tempNormal = new THREE.Vector3()

export const ensureNormalizedNormals = (geometry) => {
  if (!geometry || typeof geometry.getAttribute !== 'function') return
  const normalAttr = geometry.getAttribute('normal')
  if (!normalAttr) return

  let updated = false
  for (let i = 0; i < normalAttr.count; i++) {
    tempNormal.fromBufferAttribute(normalAttr, i)
    const length = tempNormal.length()

    if (!Number.isFinite(length) || length < 1e-6) {
      tempNormal.set(1, 0, 0)
      updated = true
    } else if (Math.abs(length - 1) > 5e-4) {
      tempNormal.divideScalar(length)
      updated = true
    } else {
      continue
    }

    normalAttr.setXYZ(i, tempNormal.x, tempNormal.y, tempNormal.z)
  }

  if (updated) {
    normalAttr.needsUpdate = true
  }
}

