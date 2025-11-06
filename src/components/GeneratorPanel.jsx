import './GeneratorPanel.css'
import { PARTICLE_SHAPE_OPTIONS } from '../utils/effectBlueprint'

const effectTypes = [
  { id: 'aura', name: 'Aura', icon: '✨' },
  { id: 'fireball', name: 'Fireball', icon: '🔥' },
  { id: 'ice', name: 'Ice', icon: '❄️' },
  { id: 'ground-smash', name: 'Ground Smash', icon: '💥' },
  { id: 'tornado', name: 'Tornado', icon: '🌪️' },
  { id: 'sparkles', name: 'Sparkles', icon: '⭐' },
  { id: 'smoke', name: 'Smoke', icon: '💨' },
  { id: 'energy-beam', name: 'Energy Beam', icon: '⚡' },
]

const emissionShapes = [
  { id: 'sphere', name: 'Sphere' },
  { id: 'cone', name: 'Cone' },
  { id: 'ring', name: 'Ring' },
  { id: 'box', name: 'Box' },
]

const animationTypes = [
  { id: 'orbit', name: 'Orbit' },
  { id: 'rise', name: 'Rise' },
  { id: 'explode', name: 'Explode' },
  { id: 'spiral', name: 'Spiral' },
  { id: 'pulse', name: 'Pulse' },
]

const particleShapes = PARTICLE_SHAPE_OPTIONS

const GeneratorPanel = ({ params, onParamChange, onRandomize }) => {
  const activeParticleShape = params.particleShape || 'style'

  return (
    <div className="generator-panel">
      {/* Effect Type */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>🎨</span>
          Effect Type
        </h3>
        <div className="effect-type-grid">
          {effectTypes.map(type => (
            <button
              key={type.id}
              className={`effect-type-button ${params.effectType === type.id ? 'active' : ''}`}
              onClick={() => onParamChange('effectType', type.id)}
            >
              <span className="effect-icon">{type.icon}</span>
              <span>{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Particle Settings */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>⚙️</span>
          Particle Settings
        </h3>
        
        <div className="control-group">
          <label className="control-label">
            <span>Particle Count</span>
            <span className="control-value">{params.particleCount}</span>
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={params.particleCount}
            onChange={(e) => onParamChange('particleCount', parseInt(e.target.value))}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Particle Size</span>
            <span className="control-value">{params.particleSize.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.01"
            value={params.particleSize}
            onChange={(e) => onParamChange('particleSize', parseFloat(e.target.value))}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Particle Speed</span>
            <span className="control-value">{params.particleSpeed.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={params.particleSpeed}
            onChange={(e) => onParamChange('particleSpeed', parseFloat(e.target.value))}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Spread</span>
            <span className="control-value">{params.spread.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={params.spread}
            onChange={(e) => onParamChange('spread', parseFloat(e.target.value))}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Glow Intensity</span>
            <span className="control-value">{params.glowIntensity.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={params.glowIntensity}
            onChange={(e) => onParamChange('glowIntensity', parseFloat(e.target.value))}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Lifetime (seconds)</span>
            <span className="control-value">{params.lifetime.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={params.lifetime}
            onChange={(e) => onParamChange('lifetime', parseFloat(e.target.value))}
            className="range-input"
          />
        </div>
      </div>

      {/* Colors */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>🎨</span>
          Colors
        </h3>
        
        <div className="control-group">
          <label className="control-label">
            <span>Primary Color</span>
          </label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={params.primaryColor}
              onChange={(e) => onParamChange('primaryColor', e.target.value)}
              className="color-input"
            />
            <input
              type="text"
              value={params.primaryColor}
              onChange={(e) => onParamChange('primaryColor', e.target.value)}
              className="color-hex"
            />
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Secondary Color</span>
          </label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={params.secondaryColor}
              onChange={(e) => onParamChange('secondaryColor', e.target.value)}
              className="color-input"
            />
            <input
              type="text"
              value={params.secondaryColor}
              onChange={(e) => onParamChange('secondaryColor', e.target.value)}
              className="color-hex"
            />
          </div>
        </div>
      </div>

      {/* Particle Shape */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>🧱</span>
          Particle Shape
        </h3>
        <div className="button-group">
          {particleShapes.map(shape => (
            <button
              key={shape.id}
              className={`button-option ${activeParticleShape === shape.id ? 'active' : ''}`}
              onClick={() => onParamChange('particleShape', shape.id)}
            >
              <span>{shape.icon ? `${shape.icon} ` : ''}{shape.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emission Shape */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>📐</span>
          Emission Shape
        </h3>
        <div className="button-group">
          {emissionShapes.map(shape => (
            <button
              key={shape.id}
              className={`button-option ${params.emissionShape === shape.id ? 'active' : ''}`}
              onClick={() => onParamChange('emissionShape', shape.id)}
            >
              {shape.name}
            </button>
          ))}
        </div>
      </div>

      {/* Animation Type */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>🎬</span>
          Animation
        </h3>
        <div className="button-group">
          {animationTypes.map(anim => (
            <button
              key={anim.id}
              className={`button-option ${params.animationType === anim.id ? 'active' : ''}`}
              onClick={() => onParamChange('animationType', anim.id)}
            >
              {anim.name}
            </button>
          ))}
        </div>
      </div>

      {/* Randomize Button */}
      <button className="randomize-button" onClick={onRandomize}>
        <span>🎲</span>
        Randomize
      </button>
    </div>
  )
}

export default GeneratorPanel
