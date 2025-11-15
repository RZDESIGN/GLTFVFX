import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { createCharacterPreview } from '../utils/characterModelGenerator'
import './VFXViewer.css'

function CharacterViewer({ characterSpec, isGenerating, buildingStatus, aiThinking }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const mixerRef = useRef(null)
  const controlsRef = useRef(null)
  const animationIdRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())

  useEffect(() => {
    if (!containerRef.current) return

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x1a1a2e, 1)
    
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    // Setup camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(2, 1.5, 3)

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 0.5, 0)
    controls.update()

    rendererRef.current = renderer
    cameraRef.current = camera
    controlsRef.current = controls

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      
      const delta = clockRef.current.getDelta()
      
      if (mixerRef.current) {
        mixerRef.current.update(delta)
      }
      
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      
      if (container && rendererRef.current?.domElement) {
        container.removeChild(rendererRef.current.domElement)
      }
    }
  }, [])

  // Update character when spec changes
  useEffect(() => {
    if (!characterSpec || !rendererRef.current || !cameraRef.current) return

    try {
      // Dispose old scene
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
      }

      // Create new scene with character
      const preview = createCharacterPreview(characterSpec)
      sceneRef.current = preview.scene
      mixerRef.current = preview.mixer
      
      // Update camera to fit character (with normalization for extreme scales)
      if (cameraRef.current && controlsRef.current && preview.characterGroup) {
        // Ensure matrices are current before measuring
        preview.scene.updateMatrixWorld(true)
        const box1 = new THREE.Box3().setFromObject(preview.characterGroup)
        const size1 = new THREE.Vector3()
        const center1 = new THREE.Vector3()
        box1.getSize(size1)
        box1.getCenter(center1)
        let maxDim = Math.max(size1.x, size1.y, size1.z)
        if (!Number.isFinite(maxDim) || maxDim <= 0) maxDim = 1
        // Normalize to a target display size (preview only)
        const target = 2.0
        const scaleFactor = Math.max(0.02, Math.min(50, target / maxDim))
        if (Math.abs(scaleFactor - 1) > 1e-3) {
          preview.characterGroup.scale.setScalar(preview.characterGroup.scale.x * scaleFactor)
          preview.scene.updateMatrixWorld(true)
        }
        // Recompute after normalization
        const box = new THREE.Box3().setFromObject(preview.characterGroup)
        const center = new THREE.Vector3()
        const size = new THREE.Vector3()
        box.getCenter(center)
        box.getSize(size)
        const newMax = Math.max(size.x, size.y, size.z) || 1
        const dist = newMax * 1.8 + 1
        cameraRef.current.near = Math.max(0.01, dist * 0.01)
        cameraRef.current.far = Math.max(50, dist * 10)
        cameraRef.current.updateProjectionMatrix()
        cameraRef.current.position.set(center.x + dist, center.y + dist * 0.6, center.z + dist)
        controlsRef.current.target.copy(center)
        controlsRef.current.update()
      }

    } catch (error) {
      console.error('Error creating character preview:', error)
    }
  }, [characterSpec])

  return (
    <div className="vfx-viewer">
      <div ref={containerRef} className="vfx-canvas-container">
        {isGenerating && buildingStatus && (
          <div className="building-overlay">
            <div className="building-content">
              <div className="loading-spinner"></div>
              <div className="building-status-large">{buildingStatus}</div>
              {characterSpec?.bodyParts && characterSpec.bodyParts.length > 0 && (
                <div className="parts-count">
                  {characterSpec.bodyParts.length} body part{characterSpec.bodyParts.length !== 1 ? 's' : ''} •{' '}
                  {characterSpec.animations?.length || 0} animation{characterSpec.animations?.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CharacterViewer
