import { useState } from 'react'
import './App.css'
import VFXViewer from './components/VFXViewer'
import GeneratorPanel from './components/GeneratorPanel'
import { generateVFXGLTF } from './utils/vfxGenerator'
import { EFFECT_PRESETS, getEffectPreset, PARTICLE_SHAPE_OPTIONS } from './utils/effectBlueprint'

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
    const shapeIds = PARTICLE_SHAPE_OPTIONS.map(shape => shape.id)
    const selectedEffect = effectTypes[Math.floor(Math.random() * effectTypes.length)] || 'fireball'
    const preset = getEffectPreset(selectedEffect) || defaultPreset

    const randomShape = shapeIds[Math.floor(Math.random() * shapeIds.length)] || 'style'

    const jitter = (value, minFactor, maxFactor) => {
      const factor = minFactor + Math.random() * (maxFactor - minFactor)
      return value * factor
    }

    setVfxParams({
      effectType: selectedEffect,
      ...PARAM_FALLBACKS,
      ...preset,
      particleShape: randomShape,
      particleCount: Math.max(8, Math.round(jitter(preset.particleCount, 0.75, 1.25))),
      particleSize: Number(jitter(preset.particleSize, 0.85, 1.2).toFixed(2)),
      particleSpeed: Number(jitter(preset.particleSpeed, 0.8, 1.25).toFixed(2)),
      spread: Number(jitter(preset.spread, 0.8, 1.3).toFixed(2)),
      glowIntensity: 1,
      lifetime: Number(jitter(preset.lifetime, 0.85, 1.2).toFixed(2)),
    })
  }

  return (
    <div className="app">
      <button className="export-button" onClick={handleExportGLTF}>
        <span>💾</span>
        Export GLTF
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
