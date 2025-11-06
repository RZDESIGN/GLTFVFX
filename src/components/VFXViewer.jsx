import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './VFXViewer.css'

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

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      canvasRef.current.parentElement.clientWidth / canvasRef.current.parentElement.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 5)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    })
    renderer.setSize(
      canvasRef.current.parentElement.clientWidth,
      canvasRef.current.parentElement.clientHeight
    )
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current) return
      const width = canvasRef.current.parentElement.clientWidth
      const height = canvasRef.current.parentElement.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    // Mouse interaction handlers
    const handleMouseDown = (e) => {
      isDragging.current = true
      lastMouseX.current = e.clientX
      autoRotate.current = false
    }

    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      const deltaX = e.clientX - lastMouseX.current
      if (particleSystemRef.current) {
        particleSystemRef.current.rotation.y += deltaX * 0.01
      }
      lastMouseX.current = e.clientX
    }

    const handleMouseUp = () => {
      isDragging.current = false
      autoRotate.current = true
    }

    canvasRef.current.addEventListener('mousedown', handleMouseDown)
    canvasRef.current.addEventListener('mousemove', handleMouseMove)
    canvasRef.current.addEventListener('mouseup', handleMouseUp)
    canvasRef.current.addEventListener('mouseleave', handleMouseUp)

    // Touch support
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging.current = true
        lastMouseX.current = e.touches[0].clientX
        autoRotate.current = false
      }
    }

    const handleTouchMove = (e) => {
      if (!isDragging.current || e.touches.length !== 1) return
      const deltaX = e.touches[0].clientX - lastMouseX.current
      if (particleSystemRef.current) {
        particleSystemRef.current.rotation.y += deltaX * 0.01
      }
      lastMouseX.current = e.touches[0].clientX
    }

    const handleTouchEnd = () => {
      isDragging.current = false
      autoRotate.current = true
    }

    canvasRef.current.addEventListener('touchstart', handleTouchStart)
    canvasRef.current.addEventListener('touchmove', handleTouchMove)
    canvasRef.current.addEventListener('touchend', handleTouchEnd)

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      const elapsed = clockRef.current.getElapsedTime()

      if (particleSystemRef.current) {
        const particles = particleSystemRef.current.children

        particles.forEach((particle, i) => {
          const userData = particle.userData

          // Apply animation based on type
          switch (params.animationType) {
            case 'orbit':
              particle.position.x = Math.cos(elapsed * params.particleSpeed + i) * userData.radius
              particle.position.z = Math.sin(elapsed * params.particleSpeed + i) * userData.radius
              particle.position.y = userData.initialY + Math.sin(elapsed * 2 + i) * 0.2
              break
            case 'rise':
              particle.position.y = userData.initialY + elapsed * params.particleSpeed * 0.5
              if (particle.position.y > userData.initialY + 3) {
                particle.position.y = userData.initialY
              }
              break
            case 'explode':
              const progress = (elapsed * params.particleSpeed) % params.lifetime
              const scale = 1 + progress / params.lifetime
              particle.position.x = userData.initialX * scale
              particle.position.y = userData.initialY * scale
              particle.position.z = userData.initialZ * scale
              particle.scale.setScalar(Math.max(0.1, 1 - progress / params.lifetime))
              break
            case 'spiral':
              const angle = elapsed * params.particleSpeed + i
              particle.position.x = Math.cos(angle) * userData.radius
              particle.position.z = Math.sin(angle) * userData.radius
              particle.position.y = userData.initialY + (angle % (Math.PI * 2)) * 0.3
              break
            case 'pulse':
              const pulse = Math.sin(elapsed * params.particleSpeed * 2 + i) * 0.5 + 0.5
              particle.scale.setScalar(params.particleSize * (0.5 + pulse))
              break
          }

          // Auto-rotate
          particle.rotation.x += delta * 2
          particle.rotation.y += delta * 2
        })

        // Auto-rotate entire system
        if (autoRotate.current) {
          particleSystemRef.current.rotation.y += delta * 0.3
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
    }
  }, [])

  // Update particles when params change
  useEffect(() => {
    if (!sceneRef.current) return

    // Remove old particle system
    if (particleSystemRef.current) {
      sceneRef.current.remove(particleSystemRef.current)
      particleSystemRef.current.children.forEach(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
    }

    // Create new particle system
    const particleSystem = new THREE.Group()
    particleSystemRef.current = particleSystem
    sceneRef.current.add(particleSystem)

    // Create particles based on emission shape
    const particles = []
    for (let i = 0; i < params.particleCount; i++) {
      let x, y, z

      switch (params.emissionShape) {
        case 'sphere':
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const radius = Math.random() * params.spread
          x = radius * Math.sin(phi) * Math.cos(theta)
          y = radius * Math.sin(phi) * Math.sin(theta)
          z = radius * Math.cos(phi)
          break
        case 'cone':
          const coneAngle = Math.random() * Math.PI * 2
          const coneRadius = Math.random() * params.spread
          const coneHeight = Math.random() * params.spread * 2
          x = coneRadius * Math.cos(coneAngle)
          y = coneHeight
          z = coneRadius * Math.sin(coneAngle)
          break
        case 'ring':
          const ringAngle = Math.random() * Math.PI * 2
          const ringRadius = params.spread * (0.5 + Math.random() * 0.5)
          x = ringRadius * Math.cos(ringAngle)
          y = (Math.random() - 0.5) * 0.2
          z = ringRadius * Math.sin(ringAngle)
          break
        case 'box':
          x = (Math.random() - 0.5) * params.spread * 2
          y = (Math.random() - 0.5) * params.spread * 2
          z = (Math.random() - 0.5) * params.spread * 2
          break
        default:
          x = y = z = 0
      }

      // Create particle geometry (voxel-style cube)
      const geometry = new THREE.BoxGeometry(
        params.particleSize,
        params.particleSize,
        params.particleSize
      )

      // Create glowing material
      const color = new THREE.Color(
        Math.random() > 0.5 ? params.primaryColor : params.secondaryColor
      )
      
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: params.glowIntensity,
        metalness: 0.3,
        roughness: 0.4
      })

      const particle = new THREE.Mesh(geometry, material)
      particle.position.set(x, y, z)
      
      // Store initial values for animation
      particle.userData = {
        initialX: x,
        initialY: y,
        initialZ: z,
        radius: Math.sqrt(x * x + z * z),
        angle: Math.atan2(z, x)
      }

      particleSystem.add(particle)
      particles.push(particle)
    }

    setParticleCount(particles.length)

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

