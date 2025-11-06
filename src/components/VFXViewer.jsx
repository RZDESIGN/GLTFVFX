import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './VFXViewer.css'
import { buildParticleSystemBlueprint } from '../utils/effectBlueprint'

const geometryCache = new Map()

const tempQuatA = new THREE.Quaternion()
const tempQuatB = new THREE.Quaternion()

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

    const gridHelper = new THREE.GridHelper(6, 12, 0x555555, 0x333333)
    gridHelper.material.opacity = 0.25
    gridHelper.material.transparent = true
    previewGroup.add(gridHelper)

    const axesHelper = new THREE.AxesHelper(2.5)
    previewGroup.add(axesHelper)

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
      cameraRef.current.position.set(0, 0, zoomDistance.current)
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

    particles.forEach(state => {
      const material = createMaterialForParticle(style, state)
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
        keyframes: state.keyframes
      }

      particleSystem.add(particle)
    })

    setParticleCount(particles.length)

    return () => {
      if (!particleSystemRef.current || !previewGroupRef.current) return
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
