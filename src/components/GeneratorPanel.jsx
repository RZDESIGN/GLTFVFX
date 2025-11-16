import './GeneratorPanel.css'
import { EFFECT_PRESETS, PARTICLE_SHAPE_OPTIONS } from '../utils/effectBlueprint'
import { ARC_FLOW_MODE_OPTIONS, EMISSION_SHAPE_OPTIONS } from '../constants/uiOptions'
import { generateBlockyCanvas } from '../utils/textureGenerator'
import { downloadCanvasAsPNG } from '../utils/downloadHelpers'
import { PARAM_FALLBACKS } from '../utils/vfxParameters'
import { PANEL_SECTIONS } from '../constants/panelSchema'

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

  const getFieldValue = (path) => {
    return path.split('.').reduce((acc, segment) => {
      if (acc === undefined || acc === null) return undefined
      return acc[segment]
    }, params)
  }

  const handleFieldChange = (path, value) => {
    if (!path.includes('.')) {
      onParamChange(path, value)
      return
    }
    const segments = path.split('.')
    const rootKey = segments[0]
    const rest = segments.slice(1)
    const rootValue = params[rootKey] || {}
    const updatedRoot = { ...rootValue }
    let cursor = updatedRoot
    for (let i = 0; i < rest.length - 1; i++) {
      const key = rest[i]
      const nextValue = cursor[key]
      cursor[key] = nextValue && typeof nextValue === 'object' ? { ...nextValue } : {}
      cursor = cursor[key]
    }
    cursor[rest[rest.length - 1]] = value
    onParamChange(rootKey, updatedRoot)
  }

  const renderRangeGroup = (field, value, onChange) => {
    return (
      <div className="control-group" key={field.key}>
        <label className="control-label">
          <span>{field.label}</span>
          {typeof value === 'number' && (
            <span className="control-value">
              {value.toFixed(field.decimals ?? 0)}
            </span>
          )}
        </label>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step || 1}
          value={typeof value === 'number' ? value : field.min || 0}
          onChange={onChange}
          className="range-input"
        />
      </div>
    )
  }

  const renderColorField = (field, value) => {
    return (
      <div className="control-group" key={field.key}>
        <label className="control-label">
          <span>{field.label}</span>
        </label>
        <div className="color-input-wrapper">
          <input
            type="color"
            value={value || '#ffffff'}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="color-input"
          />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="color-hex"
          />
        </div>
      </div>
    )
  }

  const renderVectorField = (field, value) => {
    const vectorValue = value || ensureVector()
    return (
      <div className="control-group" key={field.key}>
        <label className="control-label">
          <span>{field.label}</span>
        </label>
        <div className="vector-input">
          {field.axes.map(axis => (
            <div key={axis} className="vector-field">
              <span>{axis.toUpperCase()}</span>
              <input
                type="number"
                step={field.step || 0.05}
                value={vectorValue[axis]}
                onChange={(e) => handleFieldChange(field.key, {
                  ...vectorValue,
                  [axis]: parseNumber(e.target.value, vectorValue[axis])
                })}
                className="control-input"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderField = (field) => {
    if (field.visibleWhen && !field.visibleWhen(params)) {
      return null
    }
    const value = getFieldValue(field.key)
    switch (field.type) {
      case 'text':
        return (
          <div className="control-group" key={field.key}>
            <label className="control-label">
              <span>{field.label}</span>
            </label>
            <input
              type="text"
              value={value || ''}
              placeholder={field.placeholder}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="control-input"
            />
          </div>
        )
      case 'textarea':
        return (
          <div className="control-group" key={field.key}>
            <label className="control-label">
              <span>{field.label}</span>
            </label>
            <textarea
              value={value || ''}
              placeholder={field.placeholder}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="panel-textarea"
            />
          </div>
        )
      case 'number':
        return (
          <div className="control-group" key={field.key}>
            <label className="control-label">
              <span>{field.label}</span>
            </label>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step || 'any'}
              value={typeof value === 'number' ? value : ''}
              onChange={(e) => handleFieldChange(field.key, parseNumber(e.target.value, value || 0))}
              className="control-input"
            />
          </div>
        )
      case 'range':
        return renderRangeGroup(field, typeof value === 'number' ? value : (field.min || 0), (e) => {
          handleFieldChange(field.key, parseFloat(e.target.value))
        })
      case 'select':
        return (
          <div className="control-group" key={field.key}>
            <label className="control-label">
              <span>{field.label}</span>
            </label>
            <select
              value={value ?? field.options[0]?.value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="control-input"
            >
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )
      case 'toggle':
        return (
          <div className="control-group" key={field.key}>
            <label className="control-label">
              <span>{field.label}</span>
            </label>
            <label className="toggle-input">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              />
              <span className="toggle-display" />
            </label>
          </div>
        )
      case 'color':
        return renderColorField(field, value)
      case 'vector':
        return renderVectorField(field, value)
      default:
        return null
    }
  }

  const renderTextureExtras = () => {
    const textureFlipbook = params.textureFlipbook || { ...PARAM_FALLBACKS.textureFlipbook }
    const uvOffset = params.uvOffset || { ...PARAM_FALLBACKS.uvOffset }
    const uvSize = params.uvSize || { ...PARAM_FALLBACKS.uvSize }
    return (
      <>
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
                onClick={async () => {
                  try {
                    const c = generateBlockyCanvas(params.primaryColor, params.secondaryColor, params.textureResolution || 16)
                    await downloadCanvasAsPNG(c, 'vfx-texture.png')
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
                        await downloadCanvasAsPNG(c, 'vfx-texture.png')
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

        {params.textureMode !== 'none' && (
          <>
            <div className="control-group">
              <label className="control-label">
                <span>UV Offset</span>
              </label>
              <div className="vector-input">
                {['u', 'v'].map(axis => (
                  <div key={axis} className="vector-field">
                    <span>{axis.toUpperCase()}</span>
                    <input
                      type="number"
                      value={uvOffset[axis]}
                      onChange={(e) => handleFieldChange('uvOffset', {
                        ...uvOffset,
                        [axis]: parseNumber(e.target.value, uvOffset[axis])
                      })}
                      className="control-input"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label className="control-label">
                <span>UV Size</span>
              </label>
              <div className="vector-input">
                {['u', 'v'].map(axis => (
                  <div key={axis} className="vector-field">
                    <span>{axis.toUpperCase()}</span>
                    <input
                      type="number"
                      value={uvSize[axis]}
                      onChange={(e) => handleFieldChange('uvSize', {
                        ...uvSize,
                        [axis]: parseNumber(e.target.value, uvSize[axis])
                      })}
                      className="control-input"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label className="control-label">
                <span>Enable Flipbook</span>
                <span className="control-value">{textureFlipbook.enabled ? 'On' : 'Off'}</span>
              </label>
              <label className="toggle-input">
                <input
                  type="checkbox"
                  checked={!!textureFlipbook.enabled}
                  onChange={(e) => handleFieldChange('textureFlipbook', { ...textureFlipbook, enabled: e.target.checked })}
                />
                <span className="toggle-display" />
              </label>
            </div>
            {textureFlipbook.enabled && (
              <>
                <div className="control-group">
                  <label className="control-label">
                    <span>Texture Size</span>
                  </label>
                  <div className="vector-input">
                    <div className="vector-field">
                      <span>Width</span>
                      <input
                        type="number"
                        min="1"
                        value={textureFlipbook.textureWidth}
                        onChange={(e) => handleFieldChange('textureFlipbook', { ...textureFlipbook, textureWidth: Math.max(1, parseInt(e.target.value) || textureFlipbook.textureWidth) })}
                        className="control-input"
                      />
                    </div>
                    <div className="vector-field">
                      <span>Height</span>
                      <input
                        type="number"
                        min="1"
                        value={textureFlipbook.textureHeight}
                        onChange={(e) => handleFieldChange('textureFlipbook', { ...textureFlipbook, textureHeight: Math.max(1, parseInt(e.target.value) || textureFlipbook.textureHeight) })}
                        className="control-input"
                      />
                    </div>
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label">
                    <span>Frame Size (UV)</span>
                  </label>
                  <div className="vector-input">
                    {['u', 'v'].map(axis => (
                      <div key={axis} className="vector-field">
                        <span>{axis.toUpperCase()}</span>
                        <input
                          type="number"
                          value={textureFlipbook.sizeUV[axis]}
                          onChange={(e) => handleFieldChange('textureFlipbook', {
                            ...textureFlipbook,
                            sizeUV: {
                              ...textureFlipbook.sizeUV,
                              [axis]: parseNumber(e.target.value, textureFlipbook.sizeUV[axis])
                            }
                          })}
                          className="control-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label">
                    <span>Step (UV)</span>
                  </label>
                  <div className="vector-input">
                    {['u', 'v'].map(axis => (
                      <div key={axis} className="vector-field">
                        <span>{axis.toUpperCase()}</span>
                        <input
                          type="number"
                          value={textureFlipbook.stepUV[axis]}
                          onChange={(e) => handleFieldChange('textureFlipbook', {
                            ...textureFlipbook,
                            stepUV: {
                              ...textureFlipbook.stepUV,
                              [axis]: parseNumber(e.target.value, textureFlipbook.stepUV[axis])
                            }
                          })}
                          className="control-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label">
                    <span>FPS</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={textureFlipbook.fps}
                    onChange={(e) => handleFieldChange('textureFlipbook', { ...textureFlipbook, fps: Math.max(0, parseNumber(e.target.value, textureFlipbook.fps)) })}
                    className="control-input"
                  />
                </div>
                <div className="control-group">
                  <label className="control-label">
                    <span>Max Frame</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={textureFlipbook.maxFrame}
                    onChange={(e) => handleFieldChange('textureFlipbook', { ...textureFlipbook, maxFrame: Math.max(1, parseInt(e.target.value) || textureFlipbook.maxFrame) })}
                    className="control-input"
                  />
                </div>
                <div className="control-group">
                  <label className="control-label">
                    <span>Stretch to Lifetime</span>
                    <span className="control-value">{textureFlipbook.stretchToLifetime ? 'Yes' : 'No'}</span>
                  </label>
                  <label className="toggle-input">
                    <input
                      type="checkbox"
                      checked={!!textureFlipbook.stretchToLifetime}
                      onChange={(e) => handleFieldChange('textureFlipbook', { ...textureFlipbook, stretchToLifetime: e.target.checked })}
                    />
                    <span className="toggle-display" />
                  </label>
                </div>
                <div className="control-group">
                  <label className="control-label">
                    <span>Loop</span>
                    <span className="control-value">{textureFlipbook.loop ? 'Yes' : 'No'}</span>
                  </label>
                  <label className="toggle-input">
                    <input
                      type="checkbox"
                      checked={!!textureFlipbook.loop}
                      onChange={(e) => handleFieldChange('textureFlipbook', { ...textureFlipbook, loop: e.target.checked })}
                    />
                    <span className="toggle-display" />
                  </label>
                </div>
              </>
            )}
          </>
        )}
      </>
    )
  }

  const renderGradientPreview = () => {
    if (!Array.isArray(params.colorGradient) || params.colorGradient.length < 2) {
      return null
    }
    const stops = [...params.colorGradient]
      .map(stop => ({
        stop: typeof stop.stop === 'number' ? stop.stop : typeof stop.t === 'number' ? stop.t : 0,
        color: stop.color || stop.value || '#ffffff'
      }))
      .sort((a, b) => a.stop - b.stop)
    if (stops.length < 2) {
      return null
    }
    const gradientStyle = {
      background: `linear-gradient(90deg, ${stops
        .map(stop => `${stop.color} ${(stop.stop * 100).toFixed(0)}%`)
        .join(', ')})`
    }
    return (
      <div className="control-group">
        <label className="control-label">
          <span>Gradient Palette</span>
        </label>
        <div
          style={{
            width: '100%',
            height: 32,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            ...gradientStyle
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {stops.map((stop, index) => (
            <div
              key={`${stop.color}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                fontSize: 12
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: stop.color,
                  border: '1px solid rgba(255,255,255,0.25)'
                }}
              />
              <span>{stop.color.toUpperCase()}</span>
              <span style={{ opacity: 0.7 }}>@ {(stop.stop * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
          Gradient-driven colors are locked for this effect. Import a Snowstorm file or edit the preset to change the stops.
        </p>
      </div>
    )
  }

  const renderSection = (section) => (
    <div className="panel-section" key={section.id}>
      <h3 className="section-title">
        <span>{section.icon}</span>
        {section.title}
      </h3>
      {section.fields.map(field => renderField(field))}
      {section.customContent === 'texture' && renderTextureExtras()}
      {section.customContent === 'colorGradient' && renderGradientPreview()}
    </div>
  )

  return (
    <div className="generator-panel">
      {/* Quick Setup */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>⚡</span>
          Quick Setup
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
      <button className="randomize-button" onClick={onRandomize}>
        <span role="img" aria-hidden="true">🎲</span>
        Randomize Effect
      </button>
    </div>

      {PANEL_SECTIONS.map(renderSection)}

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

/* Arc / Ribbon */}
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

      {/* Time */}
      <div className="panel-section">
        <h3 className="section-title">
          <span>⏱️</span>
          Time
        </h3>
        <div className="control-group">
          <label className="control-label">
            <span>Lifetime (seconds)</span>
            <span className="control-value">{params.lifetime.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.2"
            max="10"
            step="0.1"
            value={params.lifetime}
            onChange={(e) => onParamChange('lifetime', parseFloat(e.target.value))}
            className="range-input"
          />
        </div>
      </div>

    </div>
  )
}

export default GeneratorPanel
