import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './VFXViewer.css'
import { buildParticleSystemBlueprint } from '../utils/effectBlueprint'

const geometryCache = new Map()

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

const createMaterialForParticle = (style, state) => {
  const color = new THREE.Color(state.color)

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color.clone(),
    emissiveIntensity: state.emissiveIntensity,
    metalness: style.metalness ?? 0.2,
    roughness: style.roughness ?? 0.5,
    transparent: style.alphaMode === 'BLEND',
    opacity: state.opacity,
    depthWrite: style.depthWrite ?? true
  })

  material.side = THREE.DoubleSide

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

const VFXViewer = ({ params }) => {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const particleSystemRef = useRef(null)
  const animationIdRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())
  const [particleCount, setParticleCount] = useState(0)

  // Mouse interaction state
  const isDragging = useRef(false)
  const lastMouseX = useRef(0)
  const autoRotate = useRef(true)

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
    camera.position.set(0, 0, 5)
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

    const handleResize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return
      const width = parent.clientWidth
      const height = parent.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    const handleMouseDown = (event) => {
      isDragging.current = true
      lastMouseX.current = event.clientX
      autoRotate.current = false
    }

    const handleMouseMove = (event) => {
      if (!isDragging.current || !particleSystemRef.current) return
      const deltaX = event.clientX - lastMouseX.current
      particleSystemRef.current.rotation.y += deltaX * 0.01
      lastMouseX.current = event.clientX
    }

    const handleMouseUp = () => {
      isDragging.current = false
      autoRotate.current = true
    }

    canvasRef.current.addEventListener('mousedown', handleMouseDown)
    canvasRef.current.addEventListener('mousemove', handleMouseMove)
    canvasRef.current.addEventListener('mouseup', handleMouseUp)
    canvasRef.current.addEventListener('mouseleave', handleMouseUp)

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) return
      isDragging.current = true
      lastMouseX.current = event.touches[0].clientX
      autoRotate.current = false
    }

    const handleTouchMove = (event) => {
      if (!isDragging.current || event.touches.length !== 1 || !particleSystemRef.current) return
      const deltaX = event.touches[0].clientX - lastMouseX.current
      particleSystemRef.current.rotation.y += deltaX * 0.01
      lastMouseX.current = event.touches[0].clientX
    }

    const handleTouchEnd = () => {
      isDragging.current = false
      autoRotate.current = true
    }

    canvasRef.current.addEventListener('touchstart', handleTouchStart)
    canvasRef.current.addEventListener('touchmove', handleTouchMove)
    canvasRef.current.addEventListener('touchend', handleTouchEnd)

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      const elapsed = clockRef.current.getElapsedTime()

      if (particleSystemRef.current) {
        const style = particleSystemRef.current.userData.style || {}
        const riseSpeed = style.riseSpeed ?? 0.5
        const riseHeight = style.riseHeight ?? 3
        const spiralHeight = style.spiralHeight ?? 1.2
        const spiralTaper = style.spiralTaper ?? 0.3
        const explosionSpread = style.explosionSpread ?? 2
        const explosionShrink = style.explosionShrink ?? 0.85
        const pulseBase = style.pulseScaleBase ?? 0.55
        const pulseRange = style.pulseScaleRange ?? 0.75

        particleSystemRef.current.children.forEach(particle => {
          const data = particle.userData
          const baseScale = data.baseScale
          const effectiveSpeed = params.particleSpeed * (1 + (data.speedOffset || 0))

          switch (params.animationType) {
            case 'rise': {
              const riseProgress = (elapsed * effectiveSpeed * riseSpeed) % riseHeight
              particle.position.x =
                data.initialX +
                Math.sin(elapsed * 0.45 + (data.driftPhase || 0)) *
                  (data.driftAmplitude || 0)
              particle.position.z =
                data.initialZ +
                Math.cos(elapsed * 0.35 + (data.driftPhase || 0)) *
                  (data.driftAmplitude || 0)
              particle.position.y = data.initialY + riseProgress
              particle.scale.set(baseScale.x, baseScale.y, baseScale.z)
              break
            }
            case 'explode': {
              const progress = (elapsed * effectiveSpeed) % params.lifetime
              const normalized = Math.min(1, progress / params.lifetime)
              const expansion = 1 + normalized * explosionSpread
              particle.position.x = data.initialX * expansion
              particle.position.y = data.initialY * expansion
              particle.position.z = data.initialZ * expansion
              const shrink = Math.max(0.12, 1 - normalized * explosionShrink)
              particle.scale.set(
                baseScale.x * shrink,
                baseScale.y * shrink,
                baseScale.z * shrink
              )
              break
            }
            case 'spiral': {
              const angle =
                elapsed * effectiveSpeed + data.orbitOffset + (data.swirlPhase || 0)
              const taper = 1 - Math.min(1, elapsed / params.lifetime) * spiralTaper
              const radius = data.radius * taper
              particle.position.x = Math.cos(angle) * radius
              particle.position.z = Math.sin(angle) * radius
              particle.position.y =
                data.initialY +
                ((angle % (Math.PI * 2)) / (Math.PI * 2)) * spiralHeight
              particle.scale.set(baseScale.x, baseScale.y, baseScale.z)
              break
            }
            case 'pulse': {
              const pulse =
                Math.sin(elapsed * effectiveSpeed * 2 + data.orbitOffset) * 0.5 + 0.5
              const scaleFactor = pulseBase + pulse * pulseRange
              particle.scale.set(
                baseScale.x * scaleFactor,
                baseScale.y * scaleFactor,
                baseScale.z * scaleFactor
              )
              particle.position.x =
                data.initialX +
                Math.sin(elapsed * 0.3 + (data.driftPhase || 0)) *
                  (data.driftAmplitude || 0)
              particle.position.z =
                data.initialZ +
                Math.cos(elapsed * 0.3 + (data.driftPhase || 0)) *
                  (data.driftAmplitude || 0)
              particle.position.y = data.initialY
              break
            }
            case 'orbit':
            default: {
              const orbitAngle = elapsed * effectiveSpeed + data.orbitOffset
              particle.position.x = Math.cos(orbitAngle) * data.radius
              particle.position.z = Math.sin(orbitAngle) * data.radius
              particle.position.y =
                data.initialY +
                Math.sin(
                  elapsed * (data.floatFrequency || 2) + data.orbitOffset
                ) *
                  (data.floatStrength || 0)
              particle.position.x +=
                Math.sin(elapsed * 0.25 + (data.driftPhase || 0)) *
                (data.driftAmplitude || 0)
              particle.position.z +=
                Math.cos(elapsed * 0.25 + (data.driftPhase || 0)) *
                (data.driftAmplitude || 0)
              particle.scale.set(baseScale.x, baseScale.y, baseScale.z)
              break
            }
          }

          particle.rotation.x += delta * (data.spinRates?.x || 0)
          particle.rotation.y += delta * (data.spinRates?.y || 0)
          particle.rotation.z += delta * (data.spinRates?.z || 0)
        })

        if (autoRotate.current) {
          particleSystemRef.current.rotation.y +=
            delta * (style.systemRotationSpeed ?? 0.35)
        }
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
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousedown', handleMouseDown)
        canvasRef.current.removeEventListener('mousemove', handleMouseMove)
        canvasRef.current.removeEventListener('mouseup', handleMouseUp)
        canvasRef.current.removeEventListener('mouseleave', handleMouseUp)
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

    if (particleSystemRef.current) {
      const existing = particleSystemRef.current
      sceneRef.current.remove(existing)
      existing.children.forEach(child => disposeMaterial(child.material))
      existing.clear()
    }

    const particleSystem = new THREE.Group()
    particleSystem.userData.style = style
    particleSystemRef.current = particleSystem
    sceneRef.current.add(particleSystem)

    const geometry = getGeometryFromConfig(style.geometry)

    particles.forEach(state => {
      const material = createMaterialForParticle(style, state)
      const particle = new THREE.Mesh(geometry, material)
      particle.name = `Particle_${state.index}`
      particle.position.set(
        state.initialPosition.x,
        state.initialPosition.y,
        state.initialPosition.z
      )
      particle.scale.set(state.scale.x, state.scale.y, state.scale.z)
      particle.userData = {
        index: state.index,
        radius: state.radius,
        orbitOffset: state.orbitOffset,
        floatStrength: state.floatStrength,
        floatFrequency: state.floatFrequency,
        initialX: state.initialPosition.x,
        initialY: state.initialPosition.y,
        initialZ: state.initialPosition.z,
        baseScale: state.scale,
        spinRates: state.spinRates,
        speedOffset: state.speedOffset,
        driftAmplitude: state.driftAmplitude,
        driftPhase: state.driftPhase,
        swirlPhase: state.swirlPhase
      }
      particleSystem.add(particle)
    })

    setParticleCount(particles.length)

    return () => {
      if (!particleSystemRef.current) return
      sceneRef.current.remove(particleSystemRef.current)
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
      <div className="vfx-info">
        <div className="vfx-info-item">
          <span>🎨</span>
          <span>{params.effectType.toUpperCase()}</span>
        </div>
        <div className="vfx-info-item">
          <span>✨</span>
          <span>{particleCount} particles</span>
        </div>
      </div>
    </div>
  )
}

export default VFXViewer
