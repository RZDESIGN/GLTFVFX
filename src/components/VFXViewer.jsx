import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './VFXViewer.css'
import { buildParticleSystemBlueprint } from '../utils/effectBlueprint'
import { generateBlockyTexture, createTextureFromDataURL, disposeTexture, generateBlockyCanvas } from '../utils/textureGenerator'

const geometryCache = new Map()

const tempQuatA = new THREE.Quaternion()
const tempQuatB = new THREE.Quaternion()
const tempColorVec = new THREE.Vector3()
const tempVec3A = new THREE.Vector3()

const getGeometryKey = (geometryConfig = {}) => JSON.stringify(geometryConfig)

const createGeometryFromConfig = (config = {}) => {
  switch (config.type) {
    case 'sphere':
      return new THREE.SphereGeometry(
        0.5,
        config.widthSegments ?? 16,
        config.heightSegments ?? 12
      )
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.5, config.detail ?? 0)
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.5, config.detail ?? 0)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(0.5, config.detail ?? 0)
    case 'plane':
      return new THREE.PlaneGeometry(1, 1)
    case 'cylinder': {
      const topRadius = config.topRadius ?? 0.2
      const bottomRadius = config.bottomRadius ?? topRadius
      const height = config.height ?? 1
      const radialSegments = config.radialSegments ?? 12
      const openEnded = config.openEnded ?? false
      return new THREE.CylinderGeometry(
        topRadius,
        bottomRadius,
        height,
        radialSegments,
        1,
        openEnded
      )
    }
    case 'box':
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

const getGeometryFromConfig = (config = {}) => {
  const key = getGeometryKey(config)
  if (!geometryCache.has(key)) {
    const geometry = createGeometryFromConfig(config)
    geometry.computeVertexNormals()
    geometryCache.set(key, geometry)
  }
  return geometryCache.get(key)
}

const createMaterialForParticle = (style, state, mapTexture, globalOpacity = 1, textureBlend = 1) => {
  // textureBlend is interpreted as "color share": 1 = pure color, 0 = pure texture
  const colorShare = Math.max(0, Math.min(1, textureBlend))
  const textureShare = 1 - colorShare
  const base = new THREE.Color(state.color)
  const color = base.clone()
  const useTexture = !!mapTexture && textureShare > 0.001
  const fullTexture = useTexture && textureShare >= 0.999

  if (useTexture) {
    if (fullTexture) {
      // Pure texture -> remove tint
      color.setRGB(1, 1, 1)
    } else {
      // As texture influence grows, move diffuse color toward white
      color.r = color.r + (1 - color.r) * textureShare
      color.g = color.g + (1 - color.g) * textureShare
      color.b = color.b + (1 - color.b) * textureShare
    }
  }

  const emissiveColor = (() => {
    if (!useTexture) return base.clone()
    if (fullTexture) return new THREE.Color(0, 0, 0)
    const e = base.clone()
    e.r *= colorShare
    e.g *= colorShare
    e.b *= colorShare
    return e
  })()

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: emissiveColor,
    emissiveIntensity: state.emissiveIntensity,
    metalness: style.metalness ?? 0.2,
    roughness: style.roughness ?? 0.5,
    transparent: style.alphaMode === 'BLEND',
    opacity: Math.max(0, Math.min(1, (state.opacity ?? 1) * (Number.isFinite(globalOpacity) ? globalOpacity : 1))),
    depthWrite: style.depthWrite ?? true
  })

  material.side = THREE.DoubleSide
  if (useTexture) {
    material.map = mapTexture
    material.needsUpdate = true
  }
  return material
}

const disposeMaterial = (material) => {
  if (!material) return
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
    return
  }
  material.dispose()
}

const findSegment = (times, time) => {
  const lastIndex = times.length - 1
  if (lastIndex <= 0) {
    return { index: 0, alpha: 0 }
  }

  if (time <= times[0]) {
    return { index: 0, alpha: 0 }
  }

  if (time >= times[lastIndex]) {
    return { index: lastIndex - 1, alpha: 1 }
  }

  for (let i = 0; i < lastIndex; i++) {
    const start = times[i]
    const end = times[i + 1]
    if (time >= start && time <= end) {
      const span = end - start || 1
      const alpha = (time - start) / span
      return { index: i, alpha }
    }
  }

  return { index: lastIndex - 1, alpha: 1 }
}

const sampleVector3 = (times, values, time, target) => {
  if (!times || times.length === 0 || !values || values.length === 0) {
    target.set(0, 0, 0)
    return target
  }

  if (times.length === 1) {
    target.set(values[0] || 0, values[1] || 0, values[2] || 0)
    return target
  }

  const { index, alpha } = findSegment(times, time)
  const stride = 3
  const offset = index * stride
  const nextOffset = offset + stride

  if (nextOffset >= values.length) {
    target.set(values[offset] || 0, values[offset + 1] || 0, values[offset + 2] || 0)
    return target
  }

  target.set(
    values[offset] + (values[nextOffset] - values[offset]) * alpha,
    values[offset + 1] + (values[nextOffset + 1] - values[offset + 1]) * alpha,
    values[offset + 2] + (values[nextOffset + 2] - values[offset + 2]) * alpha
  )

  return target
}

const sampleQuaternion = (times, values, time, target) => {
  if (!times || times.length === 0 || !values || values.length === 0) {
    target.identity()
    return target
  }

  if (times.length === 1) {
    target.set(values[0] || 0, values[1] || 0, values[2] || 0, values[3] || 1)
    return target
  }

  const { index, alpha } = findSegment(times, time)
  const stride = 4
  const offset = index * stride
  const nextOffset = offset + stride

  tempQuatA.set(
    values[offset] || 0,
    values[offset + 1] || 0,
    values[offset + 2] || 0,
    values[offset + 3] || 1
  )

  if (nextOffset >= values.length) {
    target.copy(tempQuatA)
    return target
  }

  tempQuatB.set(
    values[nextOffset] || 0,
    values[nextOffset + 1] || 0,
    values[nextOffset + 2] || 0,
    values[nextOffset + 3] || 1
  )

  target.copy(tempQuatA).slerp(tempQuatB, alpha)
  return target
}

const VFXViewer = ({ params }) => {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const previewGroupRef = useRef(null)
  const particleSystemRef = useRef(null)
  const animationIdRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())
  const blueprintRef = useRef(null)
  const effectStartTimeRef = useRef(0)
  const [particleCount, setParticleCount] = useState(0)
  const [texturePreviewUrl, setTexturePreviewUrl] = useState(null)

  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const zoomDistance = useRef(5)

  useEffect(() => {
    if (!canvasRef.current) return

    const parent = canvasRef.current.parentElement
    if (!parent) return

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      parent.clientWidth / parent.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 2.2, zoomDistance.current)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    })
    renderer.setSize(parent.clientWidth, parent.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    const previewGroup = new THREE.Group()
    previewGroup.rotation.set(-0.35, 0.4, 0)
    previewGroupRef.current = previewGroup
    scene.add(previewGroup)

    const gridHelper = new THREE.GridHelper(6, 12, 0xdddddd, 0xaaaaaa)
    gridHelper.material.opacity = 0.35
    gridHelper.material.transparent = true
    previewGroup.add(gridHelper)

    const axesHelper = new THREE.AxesHelper(2.5)
    previewGroup.add(axesHelper)

    const updateSceneOffset = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current || !previewGroupRef.current) return
      const canvas = rendererRef.current.domElement
      const cssWidth = canvas.clientWidth || parent.clientWidth
      const cssHeight = canvas.clientHeight || parent.clientHeight
      if (!cssWidth || !cssHeight) return

      let overlayWidth = 0
      const settings = document.querySelector('.settings-card')
      if (settings) {
        const style = window.getComputedStyle(settings)
        if (style.position === 'fixed' || style.position === 'sticky') {
          overlayWidth = settings.offsetWidth || 0
        }
      }

      // If overlay takes most of the width (mobile layout), don't offset
      if (overlayWidth >= cssWidth * 0.6) {
        previewGroupRef.current.position.x = 0
        return
      }

      const fov = cameraRef.current.fov * (Math.PI / 180)
      // Distance from camera to scene origin
      tempVec3A.set(0, 0, 0)
      const distance = cameraRef.current.position.distanceTo(tempVec3A)
      const worldWidthAtDepth = 2 * Math.tan(fov / 2) * distance * (cssWidth / cssHeight)
      const worldUnitsPerPx = worldWidthAtDepth / cssWidth
      const desiredPxOffset = overlayWidth * 0.5 + 12 // half overlay + padding
      let sign = -1
      if (settings) {
        const rect = settings.getBoundingClientRect()
        // If panel is nearer to the left side, shift scene to the right
        const distanceToLeft = rect.left
        const distanceToRight = (window.innerWidth - rect.right)
        if (distanceToLeft <= distanceToRight) sign = 1
      }
      previewGroupRef.current.position.x = sign * desiredPxOffset * worldUnitsPerPx
    }

    const handleResize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return
      const width = parent.clientWidth
      const height = parent.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
      updateSceneOffset()
    }
    window.addEventListener('resize', handleResize)

    const handleMouseDown = (event) => {
      if (!previewGroupRef.current) return
      isDragging.current = true
      lastPointer.current = { x: event.clientX, y: event.clientY }
    }

    const handleMouseMove = (event) => {
      if (!isDragging.current || !previewGroupRef.current) return
      const deltaX = event.clientX - lastPointer.current.x
      const deltaY = event.clientY - lastPointer.current.y

      previewGroupRef.current.rotation.y += deltaX * 0.01
      previewGroupRef.current.rotation.x += deltaY * 0.01
      previewGroupRef.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, previewGroupRef.current.rotation.x))

      lastPointer.current = { x: event.clientX, y: event.clientY }
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    const handleWheel = (event) => {
      if (!cameraRef.current) return
      zoomDistance.current = Math.max(2, Math.min(14, zoomDistance.current + event.deltaY * 0.01))
      const { x, y } = cameraRef.current.position
      cameraRef.current.position.set(x, y, zoomDistance.current)
      cameraRef.current.lookAt(0, 0, 0)
    }

    canvasRef.current.addEventListener('mousedown', handleMouseDown)
    canvasRef.current.addEventListener('mousemove', handleMouseMove)
    canvasRef.current.addEventListener('mouseup', handleMouseUp)
    canvasRef.current.addEventListener('mouseleave', handleMouseUp)
    canvasRef.current.addEventListener('wheel', handleWheel, { passive: true })

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1 || !previewGroupRef.current) return
      isDragging.current = true
      const touch = event.touches[0]
      lastPointer.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchMove = (event) => {
      if (!isDragging.current || event.touches.length !== 1 || !previewGroupRef.current) return
      const touch = event.touches[0]
      const deltaX = touch.clientX - lastPointer.current.x
      const deltaY = touch.clientY - lastPointer.current.y

      previewGroupRef.current.rotation.y += deltaX * 0.01
      previewGroupRef.current.rotation.x += deltaY * 0.01
      previewGroupRef.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, previewGroupRef.current.rotation.x))

      lastPointer.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = () => {
      isDragging.current = false
    }

    canvasRef.current.addEventListener('touchstart', handleTouchStart)
    canvasRef.current.addEventListener('touchmove', handleTouchMove)
    canvasRef.current.addEventListener('touchend', handleTouchEnd)

    // Initial offset to compensate for right settings overlay
    updateSceneOffset()

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      const elapsed = clockRef.current.getElapsedTime()

      const particleSystem = particleSystemRef.current
      const previewGroup = previewGroupRef.current
      const blueprint = blueprintRef.current

      if (particleSystem && blueprint) {
        const style = particleSystem.userData.style || {}
        const times = blueprint.keyframeTimes
        const duration = blueprint.duration && blueprint.duration > 0
          ? blueprint.duration
          : params.lifetime || 1
        const localElapsed = Math.max(0, elapsed - effectStartTimeRef.current)
        const playbackTime = duration > 0 ? localElapsed % duration : localElapsed

        particleSystem.children.forEach(particle => {
          const keyframes = particle.userData.keyframes
          if (!keyframes) return

          sampleVector3(times, keyframes.positions, playbackTime, particle.position)
          sampleQuaternion(times, keyframes.rotations, playbackTime, particle.quaternion)
          sampleVector3(times, keyframes.scales, playbackTime, particle.scale)

          if (keyframes.colors && particle.material) {
            const hasTexture = !!(particleSystem.userData && particleSystem.userData.texture)
            const colorShareNow = params.textureMode === 'none' ? 1 : (Number.isFinite(params.textureBlend) ? params.textureBlend : 1)
            const textureShareNow = 1 - colorShareNow
            sampleVector3(times, keyframes.colors, playbackTime, tempColorVec)
            if (hasTexture && textureShareNow >= 0.999) {
              // Pure texture: no tint
              particle.material.color.setRGB(1, 1, 1)
              particle.material.emissive.setRGB(0, 0, 0)
            } else if (hasTexture && textureShareNow > 0.001) {
              const r = tempColorVec.x + (1 - tempColorVec.x) * textureShareNow
              const g = tempColorVec.y + (1 - tempColorVec.y) * textureShareNow
              const b = tempColorVec.z + (1 - tempColorVec.z) * textureShareNow
              particle.material.color.setRGB(r, g, b)
              particle.material.emissive.setRGB(r * colorShareNow, g * colorShareNow, b * colorShareNow)
            } else {
              particle.material.color.setRGB(tempColorVec.x, tempColorVec.y, tempColorVec.z)
              particle.material.emissive.setRGB(tempColorVec.x, tempColorVec.y, tempColorVec.z)
            }
          }

          if (particle.userData.emissiveIntensity !== undefined && particle.material) {
            particle.material.emissiveIntensity = particle.userData.emissiveIntensity
          }
        })

        
      }

      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (previewGroupRef.current) {
        previewGroupRef.current.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            disposeMaterial(child.material)
            child.geometry?.dispose()
          }
        })
        previewGroupRef.current.clear()
        sceneRef.current?.remove(previewGroupRef.current)
        previewGroupRef.current = null
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousedown', handleMouseDown)
        canvasRef.current.removeEventListener('mousemove', handleMouseMove)
        canvasRef.current.removeEventListener('mouseup', handleMouseUp)
        canvasRef.current.removeEventListener('mouseleave', handleMouseUp)
        canvasRef.current.removeEventListener('wheel', handleWheel)
        canvasRef.current.removeEventListener('touchstart', handleTouchStart)
        canvasRef.current.removeEventListener('touchmove', handleTouchMove)
        canvasRef.current.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return

    const blueprint = buildParticleSystemBlueprint(params)
    const { particles, style } = blueprint
    blueprintRef.current = blueprint
    effectStartTimeRef.current = clockRef.current.getElapsedTime()

    const previewGroup = previewGroupRef.current
    if (!previewGroup) return

    if (particleSystemRef.current) {
      const existing = particleSystemRef.current
      previewGroup.remove(existing)
      existing.children.forEach(child => disposeMaterial(child.material))
      existing.clear()
    }

    const particleSystem = new THREE.Group()
    particleSystem.userData.style = style
    particleSystemRef.current = particleSystem
    previewGroup.add(particleSystem)

    const geometry = getGeometryFromConfig(style.geometry)

    let activeTexture = null
    let disposed = false
    const colorShare = params.textureMode === 'none' ? 1 : (Number.isFinite(params.textureBlend) ? params.textureBlend : 1)
    const textureShare = 1 - colorShare
    const useTexture = params.textureMode !== 'none' && textureShare > 0.001

    if (params.textureMode === 'auto' && useTexture) {
      activeTexture = generateBlockyTexture(
        params.primaryColor,
        params.secondaryColor,
        params.textureResolution || 16
      )
      try {
        const c = generateBlockyCanvas(params.primaryColor, params.secondaryColor, params.textureResolution || 16)
        setTexturePreviewUrl(c.toDataURL('image/png'))
      } catch {
        setTexturePreviewUrl(null)
      }
    }

    particles.forEach(state => {
      const material = createMaterialForParticle(style, state, activeTexture, Number.isFinite(params.opacity) ? params.opacity : 1, colorShare)
      const particle = new THREE.Mesh(geometry, material)
      particle.name = `Particle_${state.index}`

      const pos = state.keyframes.positions
      const rot = state.keyframes.rotations
      const scl = state.keyframes.scales

      particle.position.set(pos[0], pos[1], pos[2])
      particle.quaternion.set(rot[0], rot[1], rot[2], rot[3])
      particle.scale.set(scl[0], scl[1], scl[2])

      particle.userData = {
        index: state.index,
        keyframes: state.keyframes,
        emissiveIntensity: state.emissiveIntensity
      }

      particle.material.emissiveIntensity = state.emissiveIntensity

      particleSystem.add(particle)
    })

    setParticleCount(particles.length)

    // If custom texture is selected, load and apply asynchronously
    if (params.textureMode === 'custom' && params.customTexture && useTexture) {
      ;(async () => {
        try {
          const tex = await createTextureFromDataURL(params.customTexture)
          if (!tex) return
          setTexturePreviewUrl(params.customTexture || null)
          if (disposed || !particleSystemRef.current) {
            disposeTexture(tex)
            return
          }
          particleSystemRef.current.children.forEach(child => {
            if (child.material) {
              child.material.map = tex
              if (textureShare >= 0.999) {
                // Pure texture
                child.material.color.setRGB(1, 1, 1)
                child.material.emissive.setRGB(0, 0, 0)
              } else if (textureShare > 0.001) {
                const c = new THREE.Color(child.material.color)
                c.r = c.r + (1 - c.r) * textureShare
                c.g = c.g + (1 - c.g) * textureShare
                c.b = c.b + (1 - c.b) * textureShare
                child.material.color.copy(c)
                const e = new THREE.Color()
                e.r = c.r * colorShare
                e.g = c.g * colorShare
                e.b = c.b * colorShare
                child.material.emissive.copy(e)
              }
              child.material.needsUpdate = true
            }
          })
          // Store on group for cleanup
          particleSystemRef.current.userData.texture = tex
        } catch (_) {
          // ignore
        }
      })()
    } else if (activeTexture) {
      // Store on group for cleanup
      particleSystem.userData.texture = activeTexture
    }
    if (params.textureMode === 'none' || !useTexture) {
      setTexturePreviewUrl(null)
    }

    return () => {
      if (!particleSystemRef.current || !previewGroupRef.current) return
      disposed = true
      const tex = particleSystemRef.current.userData?.texture
      if (tex) {
        disposeTexture(tex)
      }
      previewGroupRef.current.remove(particleSystemRef.current)
      particleSystemRef.current.children.forEach(child =>
        disposeMaterial(child.material)
      )
      particleSystemRef.current.clear()
      particleSystemRef.current = null
    }
  }, [params])

  return (
    <div className="vfx-viewer">
      <canvas ref={canvasRef} className="vfx-canvas" />
      {texturePreviewUrl && (
        <div className="texture-preview-overlay">
          <img src={texturePreviewUrl} alt="Texture" />
          <button
            className="texture-download"
            onClick={async (e) => {
              e.stopPropagation()
              try {
                if (params.textureMode === 'auto') {
                  const c = generateBlockyCanvas(params.primaryColor, params.secondaryColor, params.textureResolution || 16)
                  const url = c.toDataURL('image/png')
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'vfx-texture.png'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                } else if (params.textureMode === 'custom' && params.customTexture) {
                  const img = new Image()
                  img.crossOrigin = 'anonymous'
                  const loaded = new Promise((resolve, reject) => {
                    img.onload = resolve
                    img.onerror = reject
                  })
                  img.src = params.customTexture
                  await loaded
                  const c = document.createElement('canvas')
                  c.width = img.width
                  c.height = img.height
                  const ctx = c.getContext('2d')
                  ctx.imageSmoothingEnabled = false
                  ctx.drawImage(img, 0, 0)
                  const url = c.toDataURL('image/png')
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'vfx-texture.png'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                }
              } catch {}
            }}
            title="Export Texture PNG"
          >
            PNG
          </button>
        </div>
      )}
    </div>
  )
}

export default VFXViewer
