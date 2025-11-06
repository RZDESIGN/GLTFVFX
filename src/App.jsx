import { useState } from 'react'
import './App.css'
import VFXViewer from './components/VFXViewer'
import GeneratorPanel from './components/GeneratorPanel'
import { generateVFXGLTF } from './utils/vfxGenerator'

const initialParams = {
  effectType: 'fireball',
  particleCount: 50,
  particleSize: 0.2,
  particleSpeed: 1.0,
  spread: 1.0,
  primaryColor: '#ff4500',
  secondaryColor: '#ffa500',
  emissionShape: 'sphere',
  animationType: 'explode',
  glowIntensity: 2.0,
  lifetime: 2.0,
}

function App() {
  const [vfxParams, setVfxParams] = useState(initialParams)

  const handleParamChange = (param, value) => {
    setVfxParams(prev => ({
      ...prev,
      [param]: value
    }))
  }

  const handleExportGLTF = () => {
    const gltfData = generateVFXGLTF(vfxParams)
    const blob = new Blob([JSON.stringify(gltfData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${vfxParams.effectType}-effect.gltf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleRandomize = () => {
    const effectTypes = ['aura', 'fireball', 'ice', 'ground-smash', 'tornado', 'sparkles', 'smoke', 'energy-beam']
    const shapes = ['sphere', 'cone', 'ring', 'box']
    const animations = ['orbit', 'rise', 'explode', 'spiral', 'pulse']
    
    const randomColor = () => {
      const colors = ['#ff4500', '#ffa500', '#00bfff', '#9370db', '#32cd32', '#ff69b4', '#ffd700', '#ff1493']
      return colors[Math.floor(Math.random() * colors.length)]
    }

    setVfxParams({
      effectType: effectTypes[Math.floor(Math.random() * effectTypes.length)],
      particleCount: Math.floor(Math.random() * 150) + 20,
      particleSize: Math.random() * 0.4 + 0.1,
      particleSpeed: Math.random() * 2 + 0.5,
      spread: Math.random() * 2 + 0.5,
      primaryColor: randomColor(),
      secondaryColor: randomColor(),
      emissionShape: shapes[Math.floor(Math.random() * shapes.length)],
      animationType: animations[Math.floor(Math.random() * animations.length)],
      glowIntensity: Math.random() * 3 + 1,
      lifetime: Math.random() * 3 + 1,
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span>✨</span>
          GLTF VFX Generator
        </h1>
        <button className="export-button" onClick={handleExportGLTF}>
          <span>💾</span>
          Export GLTF
        </button>
      </header>
      <main className="app-main">
        <VFXViewer params={vfxParams} />
        <GeneratorPanel 
          params={vfxParams} 
          onParamChange={handleParamChange}
          onRandomize={handleRandomize}
        />
      </main>
    </div>
  )
}

export default App

