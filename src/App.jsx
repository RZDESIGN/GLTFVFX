import { useState } from 'react'
import './App.css'
import VFXViewer from './components/VFXViewer'
import GeneratorPanel from './components/GeneratorPanel'
import { generateVFXGLTF } from './utils/vfxGenerator'
import { EFFECT_PRESETS, getEffectPreset, PARTICLE_SHAPE_OPTIONS } from './utils/effectBlueprint'
import { ARC_FLOW_MODE_OPTIONS, EMISSION_SHAPE_OPTIONS, MOTION_DIRECTION_OPTIONS } from './constants/uiOptions'

const PARAM_FALLBACKS = {
  emissionSurfaceOnly: false,
  emissionOffset: { x: 0, y: 0, z: 0 },
  motionDirectionMode: 'outwards',
  motionDirection: { x: 0, y: 1, z: 0 },
  motionAcceleration: { x: 0, y: 0, z: 0 },
  useArcEmitter: false,
  arcRadius: 3,
  arcStartAngle: Math.PI * 0.1,
  arcEndAngle: Math.PI * 0.9,
  arcThickness: 0.12,
  arcHeightOffset: 0,
  arcFlowSpeed: 1,
  arcFlowMode: 'continuous'
}

const defaultPreset = (() => {
  const fallback = {
    particleCount: 60,
    particleSize: 0.22,
    particleSpeed: 1.6,
    spread: 1.1,
    primaryColor: '#ff4500',
    secondaryColor: '#ffa500',
    emissionShape: 'sphere',
    animationType: 'explode',
    glowIntensity: 1,
    lifetime: 1.8,
    particleShape: 'style'
  }

  const preset = getEffectPreset('fireball')

  return {
    ...PARAM_FALLBACKS,
    ...fallback,
    ...(preset || {}),
    glowIntensity: 1,
    particleShape: (preset && preset.particleShape) || fallback.particleShape
  }
})()

const initialParams = {
  effectType: 'fireball',
  ...defaultPreset
}

const getRandomItem = (items, fallback) => {
  if (!Array.isArray(items) || items.length === 0) return fallback
  return items[Math.floor(Math.random() * items.length)]
}

const getRandomInt = (min, max) => {
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  return Math.floor(Math.random() * (upper - lower + 1)) + lower
}

const getRandomFloat = (min, max, precision = 2) => {
  const value = min + Math.random() * (max - min)
  return Number(value.toFixed(precision))
}

const getRandomColor = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`

const getRandomVector = (min, max, precision = 2) => ({
  x: getRandomFloat(min, max, precision),
  y: getRandomFloat(min, max, precision),
  z: getRandomFloat(min, max, precision)
})

const randomBoolean = (chance = 0.5) => Math.random() < chance

const degToRad = (deg) => (deg * Math.PI) / 180

const getMotionDirectionForMode = (mode) => {
  const option = MOTION_DIRECTION_OPTIONS.find(opt => opt.id === mode)
  if (mode === 'custom') {
    const vector = getRandomVector(-1, 1, 2)
    const nearZero = Math.abs(vector.x) < 0.1 && Math.abs(vector.y) < 0.1 && Math.abs(vector.z) < 0.1
    return nearZero ? { x: 0, y: 1, z: 0 } : vector
  }
  if (option?.vector) {
    return { ...option.vector }
  }
  return { ...PARAM_FALLBACKS.motionDirection }
}

function App() {
  const [vfxParams, setVfxParams] = useState(initialParams)

  const handleParamChange = (param, value) => {
    setVfxParams(prev => {
      if (param === 'effectType') {
        const preset = getEffectPreset(value)
        return {
          ...prev,
          ...PARAM_FALLBACKS,
          ...(preset || {}),
          glowIntensity: 1,
          particleShape: (preset && preset.particleShape) || 'style',
          effectType: value
        }
      }

      return {
        ...prev,
        [param]: value
      }
    })
  }

  const handleExportGLTF = async () => {
    try {
      const gltfData = await generateVFXGLTF(vfxParams)
      const blob = new Blob([JSON.stringify(gltfData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${vfxParams.effectType}-effect.gltf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setTimeout(() => {
        alert('✨ GLTF exported!\n\nThe file includes geometry, materials, and looping animation data matching the on-screen effect.\n\nTip: Import into your engine or run through glTF validation if you need extra assurance.')
      }, 80)
    } catch (error) {
      console.error('[gltf-export]', error)
      alert('Export failed. Please check the console for details.')
    }
  }

  const handleRandomize = () => {
    const effectTypes = Object.keys(EFFECT_PRESETS)
    const particleShapeIds = PARTICLE_SHAPE_OPTIONS.map(shape => shape.id)
    const effectType = getRandomItem(effectTypes, 'fireball')
    const preset = getEffectPreset(effectType) || defaultPreset
    const particleShape = getRandomItem(particleShapeIds, 'style')
    const emissionShape = getRandomItem(EMISSION_SHAPE_OPTIONS)?.id || 'sphere'
    const motionDirectionMode = getRandomItem(MOTION_DIRECTION_OPTIONS)?.id || 'outwards'
    const motionDirection = getMotionDirectionForMode(motionDirectionMode)
    const useArcEmitter = randomBoolean()
    const arcFlowMode = getRandomItem(ARC_FLOW_MODE_OPTIONS)?.id || 'continuous'
    const arcStartDeg = getRandomInt(0, 170)
    const arcEndDeg = getRandomInt(arcStartDeg + 1, 180)
    const arcAngles = {
      arcStartAngle: degToRad(arcStartDeg),
      arcEndAngle: degToRad(arcEndDeg)
    }
    const arcSettings = useArcEmitter
      ? {
          arcRadius: getRandomFloat(0.5, 4, 1),
          arcThickness: getRandomFloat(0.05, 0.4, 2),
          arcHeightOffset: 0,
          arcFlowSpeed: getRandomFloat(0.1, 2.5, 2),
          arcFlowMode,
          ...arcAngles
        }
      : {
          arcRadius: PARAM_FALLBACKS.arcRadius,
          arcThickness: PARAM_FALLBACKS.arcThickness,
          arcHeightOffset: PARAM_FALLBACKS.arcHeightOffset,
          arcFlowSpeed: PARAM_FALLBACKS.arcFlowSpeed,
          arcFlowMode: PARAM_FALLBACKS.arcFlowMode,
          arcStartAngle: PARAM_FALLBACKS.arcStartAngle,
          arcEndAngle: PARAM_FALLBACKS.arcEndAngle
        }

    setVfxParams({
      ...PARAM_FALLBACKS,
      ...preset,
      effectType,
      particleShape,
      particleCount: getRandomInt(10, 200),
      particleSize: getRandomFloat(0.05, 0.5, 2),
      particleSpeed: getRandomFloat(0.1, 3, 1),
      spread: getRandomFloat(0.5, 3, 1),
      glowIntensity: getRandomFloat(0.5, 5, 1),
      lifetime: getRandomFloat(0.5, 5, 1),
      primaryColor: getRandomColor(),
      secondaryColor: getRandomColor(),
      emissionShape,
      emissionSurfaceOnly: randomBoolean(),
      emissionOffset: { ...PARAM_FALLBACKS.emissionOffset },
      motionDirectionMode,
      motionDirection,
      motionAcceleration: getRandomVector(-0.5, 0.5, 2),
      useArcEmitter,
      ...arcSettings
    })
  }

  return (
    <div className="app">
      <button className="export-button" onClick={handleExportGLTF}>
        <span>💾</span>
        Export GLTF
      </button>
      <button className="randomize-fab" onClick={handleRandomize}>
        <span>🎲</span>
        Randomize
      </button>
      <main className="app-main">
        <VFXViewer params={vfxParams} />
        <aside className="settings-card">
          <div className="settings-card-header">
            <span>✨</span>
            <span className="settings-card-title">GLTF VFX Generator</span>
          </div>
          <GeneratorPanel 
            params={vfxParams} 
            onParamChange={handleParamChange}
            onRandomize={handleRandomize}
          />
          <div className="settings-card-footer">
            <span>made by Hammy / Ricardo — Optimized for HYTOPIA</span>
            <a href="https://hytopia.com/" target="_blank" rel="noopener noreferrer">hytopia.com</a>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
