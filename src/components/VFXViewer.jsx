import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
import { generateVFX } from '../utils/vfxGenerator'
import { TEMPLATE_TYPE_IDS } from '../utils/vfxTemplates'
import './VFXViewer.css'

function VFXViewer({ config, regenerate }) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const vfxGroupRef = useRef(null)
  const animationIdRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())
  const controlsRef = useRef(null)
  const mixerRef = useRef(null)
  const isTemplateType = TEMPLATE_TYPE_IDS.has(config.type)

  const collectAnimations = (group) => {
    if (!group) return []
    const clips = new Set()
    if (Array.isArray(group.animations)) {
      group.animations.forEach((clip) => {
        if (clip instanceof THREE.AnimationClip) {
          clips.add(clip)
        }
      })
    }

    group.traverse((child) => {
      if (Array.isArray(child.animations)) {
        child.animations.forEach((clip) => {
          if (clip instanceof THREE.AnimationClip) {
            clips.add(clip)
          }
        })
      }
    })

    return Array.from(clips).map((clip) => clip.clone())
  }

  useEffect(() => {
    if (!canvasRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 2, 5)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 7)
    scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-5, 5, -7)
    scene.add(fillLight)

    // Add orbit controls for camera interaction
    const controls = new OrbitControls(camera, canvasRef.current)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 20
    controls.target.set(0, 0, 0)
    controls.update()
    controlsRef.current = controls
    

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      
      const delta = clockRef.current.getDelta()
      
      // Update orbit controls
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      
      if (mixerRef.current) {
        mixerRef.current.update(delta)
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current) return
      const width = canvasRef.current.clientWidth
      const height = canvasRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        mixerRef.current = null
      }
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return

    let cancelled = false

    const disposeMixer = () => {
      if (mixerRef.current) {
        if (vfxGroupRef.current) {
          mixerRef.current.stopAllAction()
          mixerRef.current.uncacheRoot(vfxGroupRef.current)
        } else {
          mixerRef.current.stopAllAction()
        }
        mixerRef.current = null
      }
    }

    const disposeGroup = (group) => {
      if (!group) return
      if (sceneRef.current && group.parent === sceneRef.current) {
        sceneRef.current.remove(group)
      }
      const shouldDisposeResources = !group.userData || !group.userData.isTemplate
      if (shouldDisposeResources) {
        group.traverse((child) => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
    }

    const cleanupCurrentGroup = () => {
      disposeMixer()
      if (vfxGroupRef.current) {
        disposeGroup(vfxGroupRef.current)
        vfxGroupRef.current = null
      }
    }

    const loadEffect = async () => {
      cleanupCurrentGroup()
      try {
        const nextGroup = await generateVFX(config)
        if (cancelled) {
          disposeGroup(nextGroup)
          return
        }

        vfxGroupRef.current = nextGroup
        sceneRef.current.add(nextGroup)

        clockRef.current = new THREE.Clock()

        if (nextGroup.animations && nextGroup.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(nextGroup)
          mixer.timeScale = config.speed
          nextGroup.animations.forEach((clip) => {
            const action = mixer.clipAction(clip)
            action.setLoop(THREE.LoopRepeat, Infinity)
            action.clampWhenFinished = false
            action.play()
          })
          mixerRef.current = mixer
        } else {
          mixerRef.current = null
        }
      } catch (error) {
        console.error('❌ Failed to generate VFX:', error)
      }
    }

    loadEffect()

    return () => {
      cancelled = true
      cleanupCurrentGroup()
    }
  }, [config, regenerate])

  const handleExport = () => {
    if (!vfxGroupRef.current) {
      alert('No VFX to export!')
      return
    }

    const exporter = new GLTFExporter()
    const animations = collectAnimations(vfxGroupRef.current)
    vfxGroupRef.current.updateMatrixWorld(true)

    exporter.parse(
      vfxGroupRef.current,
      (gltf) => {
        const output = JSON.stringify(gltf, null, 2)
        const blob = new Blob([output], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const filename = `vfx-${config.type}-${timestamp}.gltf`
        
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        
        URL.revokeObjectURL(url)
        
        console.log('✅ Exported:', filename)
      },
      (error) => {
        console.error('❌ Export failed:', error)
        alert('Export failed! Check console for details.')
      },
      {
        binary: false,
        animations,
        trs: true,
      }
    )
  }

  return (
    <div className="vfx-viewer">
      <div className="viewer-container">
        <canvas ref={canvasRef} className="viewer-canvas" />
      </div>
      
      <button className="export-button" onClick={handleExport} title="Export GLTF">
        <span className="export-icon">💾</span>
        <span className="export-text">Export GLTF</span>
      </button>
      
      <div className="viewer-info">
        <div className="info-item">
          <span className="info-label">Effect:</span>
          <span className="info-value">{config.type}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Voxels:</span>
          <span className="info-value">{isTemplateType ? 'Template' : config.particleCount}</span>
        </div>
        <div className="info-hint">
          🖱️ Drag to rotate • Scroll to zoom
        </div>
      </div>
    </div>
  )
}

export default VFXViewer
