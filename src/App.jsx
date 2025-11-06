import { useState } from 'react'
import VFXViewer from './components/VFXViewer'
import GeneratorPanel from './components/GeneratorPanel'
import './App.css'

const DEFAULT_VFX_CONFIG = {
  type: 'aura',
  particleCount: 180,
  color: '#ffe066',
  secondaryColor: '#ff9f1c',
  size: 0.12,
  speed: 1.1,
  spread: 2.4,
  lifetime: 4.0,
  emissionRate: 50,
  shape: 'sphere',
  animation: 'orbit',
  glowIntensity: 3.2,
  fadeIn: 0.2,
  fadeOut: 0.5,
}

function App() {
  const [vfxConfig, setVfxConfig] = useState(DEFAULT_VFX_CONFIG)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleConfigChange = (newConfig) => {
    setVfxConfig(newConfig)
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => setIsGenerating(false), 300)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="icon">✨</span>
          GLTF VFX Generator
        </h1>
        <div className="app-subtitle">Create stunning voxel-style effects</div>
      </header>

      <div className="app-content">
        <GeneratorPanel 
          config={vfxConfig}
          onChange={handleConfigChange}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        
        <VFXViewer 
          config={vfxConfig}
          regenerate={isGenerating}
        />
      </div>
    </div>
  )
}

export default App
