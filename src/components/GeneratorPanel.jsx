import './GeneratorPanel.css'
import { EFFECT_PRESETS, PARTICLE_SHAPE_OPTIONS } from '../utils/effectBlueprint'
import { ARC_FLOW_MODE_OPTIONS, EMISSION_SHAPE_OPTIONS, MOTION_DIRECTION_OPTIONS, TEXTURE_MODE_OPTIONS } from '../constants/uiOptions'
import { generateBlockyCanvas } from '../utils/textureGenerator'

const animationTypeLabels = {
  orbit: 'Orbit',
  rise: 'Rise',
  explode: 'Explode',
  spiral: 'Spiral',
  pulse: 'Pulse'
}

const effectTypes = [
  { id: 'aura', name: 'Aura', icon: '✨' },
  { id: 'fireball', name: 'Fireball', icon: '🔥' },
  { id: 'ice', name: 'Ice', icon: '❄️' },
  { id: 'ground-smash', name: 'Ground Smash', icon: '💥' },
  { id: 'tornado', name: 'Tornado', icon: '🌪️' },
  { id: 'sparkles', name: 'Sparkles', icon: '⭐' },
  { id: 'smoke', name: 'Smoke', icon: '💨' },
  { id: 'energy-beam', name: 'Energy Beam', icon: '⚡' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', animationLabel: 'Rainbow Arc' },
].map(type => {
  const animationType = EFFECT_PRESETS[type.id]?.animationType || null
  return {
    ...type,
    animationType,
    animationLabel: type.animationLabel || animationTypeLabels[animationType] || 'Custom'
  }
})

const particleShapes = PARTICLE_SHAPE_OPTIONS

const GeneratorPanel = ({ params, onParamChange, onRandomize }) => {
  const activeParticleShape = params.particleShape || 'style'
  const ensureVector = (target) => target || { x: 0, y: 0, z: 0 }
  const directionMode = params.motionDirectionMode || 'outwards'
  const arcEnabled = !!params.useArcEmitter

  const parseNumber = (value, fallback = 0) => {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const radToDeg = (rad, fallback) => {
    const source = Number.isFinite(rad) ? rad : fallback
    return Number(((source * 180) / Math.PI).toFixed(1))
  }
  const degToRad = (deg) => (deg * Math.PI) / 180

  const fallbackArcStart = Math.PI * 0.1
  const fallbackArcEnd = Math.PI * 0.9

  const arcStartDeg = radToDeg(params.arcStartAngle, fallbackArcStart)
  const arcEndDeg = radToDeg(params.arcEndAngle, fallbackArcEnd)
  const currentArcRadius = Number.isFinite(params.arcRadius) ? params.arcRadius : 3
  const currentArcThickness = Number.isFinite(params.arcThickness) ? params.arcThickness : 0.12
  const currentArcHeight = Number.isFinite(params.arcHeightOffset) ? params.arcHeightOffset : 0
  const currentArcSpeed = Number.isFinite(params.arcFlowSpeed) ? params.arcFlowSpeed : 1
  const arcFlowMode = params.arcFlowMode || 'continuous'

  const handleArcStartChange = (degValue) => {
    const clamped = Math.min(Math.max(degValue, 0), 179)
    onParamChange('arcStartAngle', degToRad(clamped))
    if (clamped >= arcEndDeg) {
      const nextEnd = Math.min(clamped + 1, 180)
      onParamChange('arcEndAngle', degToRad(nextEnd))
    }
  }

  const handleArcEndChange = (degValue) => {
    const clamped = Math.min(Math.max(degValue, 1), 180)
    onParamChange('arcEndAngle', degToRad(clamped))
    if (clamped <= arcStartDeg) {
      const nextStart = Math.max(clamped - 1, 0)
      onParamChange('arcStartAngle', degToRad(nextStart))
    }
  }

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
              <div className="effect-type-text">
                <span className="effect-name">{type.name}</span>
                <span className="effect-animation-label">
                  {type.animationLabel} style
                </span>
              </div>
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
            <span>Opacity</span>
            <span className="control-value">{(Number.isFinite(params.opacity) ? params.opacity : 1).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.01"
            value={Number.isFinite(params.opacity) ? params.opacity : 1}
            onChange={(e) => onParamChange('opacity', parseFloat(e.target.value))}
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

      {/* Texture */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>🧩</span>
          Texture
        </h3>
        <div className="control-group">
          <label className="control-label">
            <span>Mode</span>
          </label>
          <select
            value={params.textureMode || 'auto'}
            onChange={(e) => onParamChange('textureMode', e.target.value)}
            className="control-input"
          >
            {TEXTURE_MODE_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {params.textureMode === 'auto' && (
          <div className="control-group">
            <label className="control-label">
              <span>Resolution</span>
              <span className="control-value">{(params.textureResolution || 16)}×{(params.textureResolution || 16)}</span>
            </label>
            <input
              type="range"
              min="8"
              max="64"
              step="1"
              value={params.textureResolution || 16}
              onChange={(e) => onParamChange('textureResolution', parseInt(e.target.value))}
              className="range-input"
            />
          </div>
        )}

        {params.textureMode !== 'none' && (
          <div className="control-group">
            <label className="control-label">
              <span>Texture Blend</span>
              <span className="control-value">{(Number.isFinite(params.textureBlend) ? params.textureBlend : 1).toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={Number.isFinite(params.textureBlend) ? params.textureBlend : 1}
              onChange={(e) => onParamChange('textureBlend', parseFloat(e.target.value))}
              className="range-input"
            />
          </div>
        )}

        {/* Preview + Export */}
        {params.textureMode === 'auto' && (
          <div className="control-group">
            <label className="control-label">
              <span>Preview</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(() => {
                try {
                  const c = generateBlockyCanvas(params.primaryColor, params.secondaryColor, params.textureResolution || 16)
                  const url = c.toDataURL('image/png')
                  return (
                    <img
                      src={url}
                      alt="Texture preview"
                      style={{ width: 48, height: 48, imageRendering: 'pixelated', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)' }}
                    />
                  )
                } catch {
                  return null
                }
              })()}
              <button
                className="button-option"
                onClick={() => {
                  try {
                    const c = generateBlockyCanvas(params.primaryColor, params.secondaryColor, params.textureResolution || 16)
                    const url = c.toDataURL('image/png')
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'vfx-texture.png'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  } catch {}
                }}
              >
                Export PNG
              </button>
            </div>
          </div>
        )}

        {params.textureMode === 'custom' && (
          <>
            <div className="control-group">
              <label className="control-label">
                <span>Upload Texture</span>
              </label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    onParamChange('customTexture', reader.result)
                  }
                  reader.readAsDataURL(file)
                }}
                className="control-input"
              />
            </div>
            {params.customTexture && (
              <div className="control-group">
                <label className="control-label">
                  <span>Preview</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src={params.customTexture}
                    alt="Texture preview"
                    style={{ width: 48, height: 48, imageRendering: 'pixelated', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                  <button
                    className="button-option"
                    onClick={() => onParamChange('customTexture', null)}
                  >
                    Clear
                  </button>
                  <button
                    className="button-option"
                    onClick={async () => {
                      try {
                        const img = new Image()
                        img.crossOrigin = 'anonymous'
                        const loaded = new Promise((resolve, reject) => {
                          img.onload = resolve
                          img.onerror = reject
                        })
                        img.src = params.customTexture
                        await loaded
                        const c = document.createElement('canvas')
                        c.width = img.width
                        c.height = img.height
                        const ctx = c.getContext('2d')
                        ctx.imageSmoothingEnabled = false
                        ctx.drawImage(img, 0, 0)
                        const url = c.toDataURL('image/png')
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'vfx-texture.png'
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      } catch {}
                    }}
                  >
                    Export PNG
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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
          {EMISSION_SHAPE_OPTIONS.map(shape => (
            <button
              key={shape.id}
              className={`button-option ${params.emissionShape === shape.id ? 'active' : ''}`}
              onClick={() => onParamChange('emissionShape', shape.id)}
            >
              {shape.name}
            </button>
          ))}
        </div>
        <div className="control-group">
          <label className="control-label">
            <span>Surface Only</span>
            <span className="control-value">{params.emissionSurfaceOnly ? 'Enabled' : 'Disabled'}</span>
          </label>
          <label className="toggle-input">
            <input
              type="checkbox"
              checked={params.emissionSurfaceOnly}
              onChange={(e) => onParamChange('emissionSurfaceOnly', e.target.checked)}
            />
            <span className="toggle-display" />
          </label>
        </div>
        <div className="control-group">
          <label className="control-label">
            <span>Emitter Offset</span>
          </label>
          <div className="vector-input">
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="vector-field">
                <span>{axis.toUpperCase()}</span>
                <input
                  type="number"
                  step="0.05"
                  value={ensureVector(params.emissionOffset)[axis]}
                  onChange={(e) => {
                    const base = ensureVector(params.emissionOffset)
                    const next = parseFloat(e.target.value)
                    onParamChange('emissionOffset', {
                      ...base,
                      [axis]: Number.isFinite(next) ? next : 0
                    })
                  }}
                  className="control-input"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motion */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>💨</span>
          Motion
        </h3>
        <div className="control-group">
          <label className="control-label">
            <span>Direction Mode</span>
          </label>
          <select
            value={directionMode}
            onChange={(e) => onParamChange('motionDirectionMode', e.target.value)}
            className="control-input"
          >
            {MOTION_DIRECTION_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {directionMode === 'custom' && (
          <div className="control-group">
            <label className="control-label">
              <span>Custom Direction</span>
            </label>
            <div className="vector-input">
              {['x', 'y', 'z'].map(axis => (
                <div key={axis} className="vector-field">
                  <span>{axis.toUpperCase()}</span>
                  <input
                    type="number"
                    step="0.05"
                    value={ensureVector(params.motionDirection)[axis]}
                    onChange={(e) => {
                      const base = ensureVector(params.motionDirection)
                      const next = parseFloat(e.target.value)
                      onParamChange('motionDirection', {
                        ...base,
                        [axis]: Number.isFinite(next) ? next : 0
                      })
                    }}
                    className="control-input"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="control-group">
          <label className="control-label">
            <span>Acceleration</span>
          </label>
          <div className="vector-input">
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="vector-field">
                <span>{axis.toUpperCase()}</span>
                <input
                  type="number"
                  step="0.05"
                  value={ensureVector(params.motionAcceleration)[axis]}
                  onChange={(e) => {
                    const base = ensureVector(params.motionAcceleration)
                    const next = parseFloat(e.target.value)
                    onParamChange('motionAcceleration', {
                      ...base,
                      [axis]: Number.isFinite(next) ? next : 0
                    })
                  }}
                  className="control-input"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Arc / Ribbon */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>🌈</span>
          Arc / Ribbon
        </h3>
        <div className="control-group">
          <label className="control-label">
            <span>Enable Arc Emitter</span>
            <span className="control-value">{arcEnabled ? 'On' : 'Off'}</span>
          </label>
          <label className="toggle-input">
            <input
              type="checkbox"
              checked={arcEnabled}
              onChange={(e) => onParamChange('useArcEmitter', e.target.checked)}
            />
            <span className="toggle-display" />
          </label>
        </div>
        {arcEnabled && (
          <>
            <div className="control-group">
              <label className="control-label">
                <span>Arc Radius</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={currentArcRadius}
                onChange={(e) => onParamChange('arcRadius', Math.max(0.1, parseNumber(e.target.value, currentArcRadius)))}
                className="control-input inline-input"
              />
            </div>
            <div className="control-group">
              <label className="control-label">
                <span>Thickness</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={currentArcThickness}
                onChange={(e) => onParamChange('arcThickness', Math.max(0.01, parseNumber(e.target.value, currentArcThickness)))}
                className="control-input inline-input"
              />
            </div>
            <div className="control-group">
              <label className="control-label">
                <span>Height Offset</span>
              </label>
              <input
                type="number"
                step="0.05"
                value={currentArcHeight}
                onChange={(e) => onParamChange('arcHeightOffset', parseNumber(e.target.value, currentArcHeight))}
                className="control-input inline-input"
              />
            </div>
            <div className="control-group">
              <label className="control-label">
                <span>Angles (°)</span>
              </label>
              <div className="vector-input">
                <div className="vector-field">
                  <span>Start</span>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    step="1"
                    value={arcStartDeg}
                    onChange={(e) => handleArcStartChange(parseNumber(e.target.value, arcStartDeg))}
                    className="control-input inline-input"
                  />
                </div>
                <div className="vector-field">
                  <span>End</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    step="1"
                    value={arcEndDeg}
                    onChange={(e) => handleArcEndChange(parseNumber(e.target.value, arcEndDeg))}
                    className="control-input inline-input"
                  />
                </div>
              </div>
            </div>
            <div className="control-group">
              <label className="control-label">
                <span>Flow Mode</span>
              </label>
              <select
                value={arcFlowMode}
                onChange={(e) => onParamChange('arcFlowMode', e.target.value)}
                className="control-input"
              >
                {ARC_FLOW_MODE_OPTIONS.map(mode => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">
                <span>Flow Speed</span>
              </label>
              <input
                type="number"
                min="0.05"
                step="0.05"
                value={currentArcSpeed}
                onChange={(e) => onParamChange('arcFlowSpeed', Math.max(0.05, parseNumber(e.target.value, currentArcSpeed)))}
                className="control-input inline-input"
              />
            </div>
          </>
        )}
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
