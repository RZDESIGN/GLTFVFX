import { useState } from 'react'
import './GeneratorPanel.css'
import { VFX_TEMPLATE_TYPES, TEMPLATE_TYPE_IDS } from '../utils/vfxTemplates'

const CUSTOM_TYPES = [
  { id: 'aura', name: '✨ Aura', desc: 'Dragon Ball Z style power aura' },
]

const VFX_TYPES = [...CUSTOM_TYPES, ...VFX_TEMPLATE_TYPES]

const SHAPES = [
  { id: 'sphere', name: 'Sphere' },
  { id: 'cone', name: 'Cone' },
  { id: 'ring', name: 'Ring' },
  { id: 'box', name: 'Box' },
]

const ANIMATIONS = [
  { id: 'orbit', name: 'Orbit' },
  { id: 'rise', name: 'Rise' },
  { id: 'explode', name: 'Explode' },
  { id: 'spiral', name: 'Spiral' },
  { id: 'pulse', name: 'Pulse' },
]

function GeneratorPanel({ config, onChange, onGenerate, isGenerating }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isTemplateType = TEMPLATE_TYPE_IDS.has(config.type)

  const handleChange = (key, value) => {
    onChange({ ...config, [key]: value })
  }

  const handleRandomize = () => {
    const randomType = VFX_TYPES[Math.floor(Math.random() * VFX_TYPES.length)].id
    const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)].id
    const randomAnimation = ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)].id
    const isTemplate = TEMPLATE_TYPE_IDS.has(randomType)

    const nextConfig = {
      ...config,
      type: randomType,
      speed: isTemplate ? Math.random() * 1.2 + 0.8 : Math.random() * 2 + 0.6,
      shape: randomShape,
      animation: randomAnimation,
    }

    if (!isTemplate) {
      nextConfig.particleCount = Math.floor(Math.random() * 180) + 60
      nextConfig.color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
      nextConfig.secondaryColor = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
      nextConfig.size = Math.random() * 0.3 + 0.05
      nextConfig.spread = Math.random() * 3 + 0.5
      nextConfig.glowIntensity = Math.random() * 3 + 1
      nextConfig.lifetime = Math.random() * 4 + 2
    }

    onChange(nextConfig)
    onGenerate()
  }

  return (
    <div className={`generator-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="collapse-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? '›' : '‹'}
      </button>

      <div className="panel-content">
        <div className="panel-header">
          <h2 className="panel-title">Generator</h2>
          <button className="randomize-button" onClick={handleRandomize} title="Randomize">
            🎲
          </button>
        </div>

        <div className="panel-sections">
          {/* VFX Type */}
          <div className="panel-section">
            <h3 className="section-title">Effect Type</h3>
            <div className="vfx-type-grid">
              {VFX_TYPES.map(type => (
                <button
                  key={type.id}
                  className={`vfx-type-button ${config.type === type.id ? 'active' : ''}`}
                  onClick={() => handleChange('type', type.id)}
                  title={type.desc}
                >
                  {type.name}
                </button>
              ))}
            </div>
            {isTemplateType && (
              <div className="section-note">
                Using Blockbench template – tweak the speed slider for timing. Other sliders apply when you switch back to custom auras.
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="panel-section">
            <h3 className="section-title">Colors</h3>
            <div className="control-group">
              <label className="control-label">
                Primary
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="color-input"
                  disabled={isTemplateType}
                />
              </label>
              <label className="control-label">
                Secondary
                <input
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="color-input"
                  disabled={isTemplateType}
                />
              </label>
            </div>
          </div>

          {/* Voxel Settings */}
          <div className="panel-section">
            <h3 className="section-title">Voxels</h3>
            <div className="control-group vertical">
              <label className="control-label">
                Voxel Count: {config.particleCount}
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={config.particleCount}
                  onChange={(e) => handleChange('particleCount', parseInt(e.target.value))}
                  className="slider"
                  disabled={isTemplateType}
                />
              </label>
              <label className="control-label">
                Size: {config.size.toFixed(2)}
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={config.size}
                  onChange={(e) => handleChange('size', parseFloat(e.target.value))}
                  className="slider"
                  disabled={isTemplateType}
                />
              </label>
              <label className="control-label">
                Speed: {config.speed.toFixed(1)}
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={config.speed}
                  onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
                  className="slider"
                />
              </label>
              <label className="control-label">
                Spread: {config.spread.toFixed(1)}
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={config.spread}
                  onChange={(e) => handleChange('spread', parseFloat(e.target.value))}
                  className="slider"
                  disabled={isTemplateType}
                />
              </label>
            </div>
          </div>

          {/* Shape */}
          <div className="panel-section">
            <h3 className="section-title">Emission Shape</h3>
            <div className="button-group">
              {SHAPES.map(shape => (
                <button
                  key={shape.id}
                  className={`shape-button ${config.shape === shape.id ? 'active' : ''}`}
                  onClick={() => handleChange('shape', shape.id)}
                  disabled={isTemplateType}
                >
                  {shape.name}
                </button>
              ))}
            </div>
          </div>

          {/* Animation */}
          <div className="panel-section">
            <h3 className="section-title">Animation</h3>
            <div className="button-group">
              {ANIMATIONS.map(anim => (
                <button
                  key={anim.id}
                  className={`shape-button ${config.animation === anim.id ? 'active' : ''}`}
                  onClick={() => handleChange('animation', anim.id)}
                  disabled={isTemplateType}
                >
                  {anim.name}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div className="panel-section">
            <h3 className="section-title">Advanced</h3>
            <div className="control-group vertical">
              <label className="control-label">
                Glow: {config.glowIntensity.toFixed(1)}
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={config.glowIntensity}
                  onChange={(e) => handleChange('glowIntensity', parseFloat(e.target.value))}
                  className="slider"
                  disabled={isTemplateType}
                />
              </label>
              <label className="control-label">
                Lifetime: {config.lifetime.toFixed(1)}s
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.1"
                  value={config.lifetime}
                  onChange={(e) => handleChange('lifetime', parseFloat(e.target.value))}
                  className="slider"
                  disabled={isTemplateType}
                />
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <button 
            className={`generate-button ${isGenerating ? 'generating' : ''}`}
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '✨ Generating...' : '🚀 Regenerate'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GeneratorPanel
