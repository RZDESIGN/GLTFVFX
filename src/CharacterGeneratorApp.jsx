import { useState, useCallback } from 'react'
import './App.css'
import CharacterViewer from './components/CharacterViewer'
import CharacterGeneratorPanel from './components/CharacterGeneratorPanel'
import { runCharacterGeneration } from './utils/openRouterStreamingClient'
import { generateCharacterGLTF } from './utils/characterModelGenerator'
import { triggerDownloadFromBlob } from './utils/downloadHelpers'

const uiLog = (...args) => {
  try {
    if (window.__AI_DEBUG__ === false) return
  } catch (_) {}
  console.log('[AI-CHAR-UI]', ...args)
}

// Default character for initial display
const DEFAULT_CHARACTER = {
  name: 'example_bee',
  description: 'A friendly bee character',
  bodyParts: [
    {
      name: 'head',
      position: [0, 0.5625, 0.0078125],
      size: [0.375, 0.3125, 0.234375],
      color: '#FFC83D',
      pivot: [0, 0, 0]
    },
    {
      name: 'body',
      position: [0, 0.1875, 0.0078125],
      size: [0.28125, 0.375, 0.375],
      color: '#FFC83D',
      pivot: [0, 0, 0]
    },
    {
      name: 'left_wing',
      position: [-0.190275, 0.525596, -0.05585],
      size: [0.1875, 0.0625, 0.28125],
      color: '#ADD8E6',
      pivot: [-0.09375, 0, 0]
    },
    {
      name: 'right_wing',
      position: [0.190275, 0.525596, -0.05585],
      size: [0.1875, 0.0625, 0.28125],
      color: '#ADD8E6',
      pivot: [0.09375, 0, 0]
    }
  ],
  animations: [
    {
      name: 'fly',
      duration: 0.5,
      keyframes: [
        { time: 0, bodyPart: 'left_wing', rotation: [0, 0, -0.5] },
        { time: 0.25, bodyPart: 'left_wing', rotation: [0, 0, 0.5] },
        { time: 0.5, bodyPart: 'left_wing', rotation: [0, 0, -0.5] },
        { time: 0, bodyPart: 'right_wing', rotation: [0, 0, 0.5] },
        { time: 0.25, bodyPart: 'right_wing', rotation: [0, 0, -0.5] },
        { time: 0.5, bodyPart: 'right_wing', rotation: [0, 0, 0.5] }
      ]
    },
    {
      name: 'idle',
      duration: 2.0,
      keyframes: [
        { time: 0, bodyPart: 'body', position: [0, 0.1875, 0] },
        { time: 1.0, bodyPart: 'body', position: [0, 0.2375, 0] },
        { time: 2.0, bodyPart: 'body', position: [0, 0.1875, 0] }
      ]
    }
  ],
  baseColor: '#FFC83D',
  accentColor: '#000000'
}

function CharacterGeneratorApp() {
  const [characterSpec, setCharacterSpec] = useState(DEFAULT_CHARACTER)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [aiThinking, setAiThinking] = useState('')
  const [buildingStatus, setBuildingStatus] = useState('')

  const handleGenerate = useCallback((prompt) => {
    uiLog('handleGenerate', { promptPreview: typeof prompt === 'string' ? `${prompt.slice(0, 160)}${prompt.length > 160 ? '…' : ''}` : '' })
    setIsGenerating(true)
    setError(null)
    setAiThinking('')
    setBuildingStatus('Initializing AI designer...')

    // Start with empty spec that will be built incrementally
    const workingSpec = {
      name: 'character',
      description: 'Generating...',
      bodyParts: [],
      animations: [],
      baseColor: '#888888',
      accentColor: '#444444'
    }
    setCharacterSpec(workingSpec)

    const getSceneSummary = () => {
      try {
        const parts = Array.isArray(workingSpec.bodyParts) ? workingSpec.bodyParts : []
        const names = parts.map(p => p.name)
        let minX = Infinity, minY = Infinity, minZ = Infinity
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
        parts.forEach(p => {
          const [w, h, d] = p.size || [0, 0, 0]
          const [x, y, z] = p.position || [0, 0, 0]
          const hx = (w || 0) / 2
          const hy = (h || 0) / 2
          const hz = (d || 0) / 2
          minX = Math.min(minX, x - hx); maxX = Math.max(maxX, x + hx)
          minY = Math.min(minY, y - hy); maxY = Math.max(maxY, y + hy)
          minZ = Math.min(minZ, z - hz); maxZ = Math.max(maxZ, z + hz)
        })
        const bbox = {
          min: [isFinite(minX) ? minX : 0, isFinite(minY) ? minY : 0, isFinite(minZ) ? minZ : 0],
          max: [isFinite(maxX) ? maxX : 0, isFinite(maxY) ? maxY : 0, isFinite(maxZ) ? maxZ : 0],
          size: [isFinite(maxX - minX) ? (maxX - minX) : 0, isFinite(maxY - minY) ? (maxY - minY) : 0, isFinite(maxZ - minZ) ? (maxZ - minZ) : 0]
        }
        return {
          name: workingSpec.name,
          description: workingSpec.description,
          baseColor: workingSpec.baseColor,
          accentColor: workingSpec.accentColor,
          bodyPartsCount: parts.length,
          bodyPartNames: names.slice(-24),
          animationsCount: Array.isArray(workingSpec.animations) ? workingSpec.animations.length : 0,
          bbox
        }
      } catch {
        return undefined
      }
    }

    runCharacterGeneration(prompt, {
      onToolCall: (toolCall) => {
        const { name, arguments: args } = toolCall
        uiLog('onToolCall', { name, args })
        
        setBuildingStatus(`AI using tool: ${name}`)

        switch (name) {
          case 'set_character_name':
            workingSpec.name = args.name || 'character'
            workingSpec.description = args.description || ''
            setBuildingStatus(`Named: ${workingSpec.name}`)
            uiLog('updated name/description', { name: workingSpec.name })
            return { ok: true, name: workingSpec.name }

          case 'add_body_part':
            const bodyPart = {
              name: args.name,
              position: args.position || [0, 0, 0],
              size: args.size || [0.5, 0.5, 0.5],
              color: args.color || '#888888',
              pivot: args.pivot || [0, 0, 0],
              shape: args.shape || 'box',
              detail: args.detail || undefined,
              texture: args.texture || undefined
            }
            workingSpec.bodyParts.push(bodyPart)
            setBuildingStatus(`Added ${args.name}`)
            uiLog('added body part', { name: args.name, count: workingSpec.bodyParts.length })
            return { ok: true, bodyPartsCount: workingSpec.bodyParts.length }

          case 'set_body_part': {
            const idx = workingSpec.bodyParts.findIndex(p => p.name === args.name)
            if (idx >= 0) {
              const updated = { ...workingSpec.bodyParts[idx], ...args.fieldsToUpdate }
              // Merge nested arrays only if provided
              if (args.fieldsToUpdate?.position) updated.position = args.fieldsToUpdate.position
              if (args.fieldsToUpdate?.size) updated.size = args.fieldsToUpdate.size
              if (args.fieldsToUpdate?.pivot) updated.pivot = args.fieldsToUpdate.pivot
              workingSpec.bodyParts[idx] = updated
              setBuildingStatus(`Updated ${args.name}`)
              return { ok: true, updated: updated.name || args.name }
            }
            setBuildingStatus(`Part not found: ${args.name}`)
            return { ok: false, error: 'part_not_found' }
          }

          case 'remove_body_part': {
            const before = workingSpec.bodyParts.length
            workingSpec.bodyParts = workingSpec.bodyParts.filter(p => p.name !== args.name)
            const removed = before - workingSpec.bodyParts.length
            setBuildingStatus(removed ? `Removed ${args.name}` : `Part not found: ${args.name}`)
            return { ok: true, removed }
          }

          case 'replace_body_part': {
            const idx = workingSpec.bodyParts.findIndex(p => p.name === args.oldName)
            if (idx >= 0) {
              workingSpec.bodyParts[idx] = {
                name: args.newPart.name,
                position: args.newPart.position,
                size: args.newPart.size,
                color: args.newPart.color,
                pivot: args.newPart.pivot || [0, 0, 0]
              }
              setBuildingStatus(`Replaced ${args.oldName} with ${args.newPart.name}`)
              return { ok: true, name: args.newPart.name }
            }
            setBuildingStatus(`Part not found: ${args.oldName}`)
            return { ok: false, error: 'part_not_found' }
          }

          case 'add_animation':
            const animation = {
              name: args.name,
              duration: args.duration || 2.0,
              keyframes: args.keyframes || []
            }
            workingSpec.animations.push(animation)
            setBuildingStatus(`Added ${args.name} animation`)
            uiLog('added animation', { name: args.name, count: workingSpec.animations.length })
            return { ok: true, animationsCount: workingSpec.animations.length }

          case 'add_keyframe': {
            const animName = args.animationName
            let anim = workingSpec.animations.find(a => a.name === animName)
            if (!anim) {
              anim = { name: animName, duration: 2.0, keyframes: [] }
              workingSpec.animations.push(anim)
            }
            const kf = { time: args.time, bodyPart: args.bodyPart }
            if (args.transforms?.position) kf.position = args.transforms.position
            if (args.transforms?.rotation) kf.rotation = args.transforms.rotation
            if (args.transforms?.scale) kf.scale = args.transforms.scale
            anim.keyframes.push(kf)
            setBuildingStatus(`Added keyframe ${animName}@${args.time.toFixed?.(2) ?? args.time}`)
            return { ok: true, keyframes: anim.keyframes.length }
          }

          case 'remove_keyframe': {
            const animName = args.animationName
            let anim = workingSpec.animations.find(a => a.name === animName)
            if (!anim) return { ok: false, error: 'animation_not_found' }
            const before = anim.keyframes.length
            const eps = 1e-3
            anim.keyframes = anim.keyframes.filter(k => !(k.bodyPart === args.bodyPart && Math.abs(k.time - args.time) < eps))
            const removed = before - anim.keyframes.length
            setBuildingStatus(removed ? `Removed keyframe ${animName}@${args.time}` : `Keyframe not found`)
            return { ok: true, removed }
          }

          case 'set_colors':
            workingSpec.baseColor = args.baseColor || workingSpec.baseColor
            workingSpec.accentColor = args.accentColor || workingSpec.accentColor
            if (typeof args.textureResolution === 'number') {
              workingSpec.textureResolution = args.textureResolution
            }
            if (typeof args.textureCellsPerSide === 'number') {
              workingSpec.textureCellsPerSide = args.textureCellsPerSide
            }
            if (typeof args.textureNoiseAmount === 'number') {
              workingSpec.textureNoiseAmount = args.textureNoiseAmount
            }
            if (typeof args.voxelSize === 'number') {
              workingSpec.voxelSize = args.voxelSize
            }
            setBuildingStatus('Set color theme')
            uiLog('set colors', { baseColor: workingSpec.baseColor, accentColor: workingSpec.accentColor })
            return { ok: true }

          case 'get_scene_state': {
            return {
              ok: true,
              state: {
                name: workingSpec.name,
                description: workingSpec.description,
                baseColor: workingSpec.baseColor,
                accentColor: workingSpec.accentColor,
                bodyParts: workingSpec.bodyParts,
                animations: workingSpec.animations
              }
            }
          }

          case 'validate_scene': {
            const issues = []
            // duplicate names
            const names = new Map()
            for (const part of workingSpec.bodyParts) {
              if (names.has(part.name)) issues.push({ type: 'duplicate_name', part: part.name })
              names.set(part.name, true)
              // size sanity
              const [w,h,d] = part.size || [0,0,0]
              if (w <= 0 || h <= 0 || d <= 0) issues.push({ type: 'invalid_size', part: part.name })
            }
            // bbox width constraint
            let minX = Infinity, maxX = -Infinity
            for (const part of workingSpec.bodyParts) {
              const [w,h,d] = part.size || [0,0,0]
              const [x] = part.position || [0,0,0]
              const hx = w/2
              minX = Math.min(minX, x - hx)
              maxX = Math.max(maxX, x + hx)
            }
            const width = (isFinite(maxX - minX) ? maxX - minX : 0)
            if (width > 1.5) issues.push({ type: 'too_wide', width })
            return { ok: true, issues }
          }

          case 'measure_bounds': {
            let minX = Infinity, minY = Infinity, minZ = Infinity
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
            for (const p of workingSpec.bodyParts) {
              const [w,h,d] = p.size || [0,0,0]
              const [x,y,z] = p.position || [0,0,0]
              const hx = w/2, hy = h/2, hz = d/2
              minX = Math.min(minX, x - hx); maxX = Math.max(maxX, x + hx)
              minY = Math.min(minY, y - hy); maxY = Math.max(maxY, y + hy)
              minZ = Math.min(minZ, z - hz); maxZ = Math.max(maxZ, z + hz)
            }
            const size = [
              isFinite(maxX - minX) ? maxX - minX : 0,
              isFinite(maxY - minY) ? maxY - minY : 0,
              isFinite(maxZ - minZ) ? maxZ - minZ : 0
            ]
            const maxDim = Math.max(size[0], size[1], size[2]) || 1
            const distance = maxDim * 2.5 + 1
            return {
              ok: true,
              bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], size },
              camera: { position: [distance, distance * 0.75, distance], target: [0, size[1] * 0.5, 0] }
            }
          }

          case 'snapshot_preview': {
            try {
              const canvas = document.querySelector('.vfx-canvas-container canvas')
              if (!canvas) return { ok: false, error: 'canvas_not_found' }
              const s = 128
              const off = document.createElement('canvas')
              off.width = s; off.height = s
              const ctx = off.getContext('2d')
              ctx.imageSmoothingEnabled = false
              ctx.drawImage(canvas, 0, 0, s, s)
              const dataURL = off.toDataURL('image/png')
              return { ok: true, dataURL }
            } catch (e) {
              return { ok: false, error: String(e?.message || e) }
            }
          }
        }

        // Update the character in real-time
        uiLog('state update', { parts: workingSpec.bodyParts.length, animations: workingSpec.animations.length })
        setCharacterSpec({ ...workingSpec })
      },

      onThinking: (text) => {
        uiLog('thinking chunk', { preview: typeof text === 'string' ? `${text.slice(0, 200)}${text.length > 200 ? '…' : ''}` : '' })
        setAiThinking(prev => prev + text)
      },

      onComplete: () => {
        uiLog('stream complete')
        // Ensure at least an idle animation exists
        try {
          if (workingSpec.bodyParts.length > 0 && (!Array.isArray(workingSpec.animations) || workingSpec.animations.length === 0)) {
            const bodyName = workingSpec.bodyParts.find(p => /body|torso|pelvis/i.test(p.name))?.name || workingSpec.bodyParts[0].name
            const idle = {
              name: 'idle',
              duration: 2.0,
              keyframes: [
                { time: 0.0, bodyPart: bodyName, position: [0, (workingSpec.bodyParts.find(p => p.name === bodyName)?.position?.[1] || 0), 0] },
                { time: 1.0, bodyPart: bodyName, position: [0, (workingSpec.bodyParts.find(p => p.name === bodyName)?.position?.[1] || 0) + 0.05, 0] },
                { time: 2.0, bodyPart: bodyName, position: [0, (workingSpec.bodyParts.find(p => p.name === bodyName)?.position?.[1] || 0), 0] }
              ]
            }
            workingSpec.animations = [idle]
            uiLog('added default idle animation', { bodyPart: bodyName })
            setCharacterSpec({ ...workingSpec })
          }
        } catch {}
        setIsGenerating(false)
        setBuildingStatus('Character complete!')
        setTimeout(() => setBuildingStatus(''), 3000)
      },

      onError: (err) => {
        uiLog('generation error', err?.message || err)
        setError(err.message || 'Failed to generate character')
        setIsGenerating(false)
        setBuildingStatus('')
        alert(`❌ Error: ${err.message || 'Failed to generate character'}\n\nPlease try again with a different prompt.`)
      },
      getSceneSummary
    })
  }, [])

  const handleRefine = useCallback((feedback) => {
    uiLog('handleRefine', { feedbackPreview: typeof feedback === 'string' ? `${feedback.slice(0, 160)}${feedback.length > 160 ? '…' : ''}` : '' })
    // For refinement, use the same streaming approach
    const prompt = `Refine this character based on feedback. Current character: ${JSON.stringify(characterSpec, null, 2)}. User feedback: ${feedback}`
    handleGenerate(prompt)
  }, [characterSpec, handleGenerate])

  const handleExportGLTF = async () => {
    try {
      const gltfData = await generateCharacterGLTF(characterSpec)
      const serialized = JSON.stringify(gltfData, null, 2)
      const blob = new Blob([serialized], { type: 'application/json' })
      const filename = `${characterSpec.name || 'character'}.gltf`
      triggerDownloadFromBlob(blob, filename)

      setTimeout(() => {
        alert(`✨ Character exported!\n\nFile: ${filename}\n\nThe GLTF includes:\n- Voxel geometry\n- Materials and colors\n- Animations (if any)\n\nReady for HYTOPIA!`)
      }, 80)
      uiLog('export glTF success', { filename })
    } catch (error) {
      uiLog('[character-export] error', error?.message || error)
      alert('Export failed. Please check the console for details.')
    }
  }

  const handleBackToVFX = () => {
    window.location.href = '/'
  }

  return (
    <div className="app">
      <button className="export-button" onClick={handleExportGLTF} disabled={isGenerating}>
        <span>💾</span>
        Export GLTF
      </button>
      <button className="randomize-fab" onClick={handleBackToVFX} style={{ bottom: '90px' }}>
        <span>🎨</span>
        VFX Mode
      </button>
      <main className="app-main">
        <CharacterViewer 
          characterSpec={characterSpec} 
          isGenerating={isGenerating}
          buildingStatus={buildingStatus}
          aiThinking={aiThinking}
        />
        <aside className="settings-card">
          <div className="settings-card-header">
            <span>🤖</span>
            <span className="settings-card-title">AI Character Generator</span>
          </div>
          <CharacterGeneratorPanel
            onGenerate={handleGenerate}
            onRefine={handleRefine}
            isGenerating={isGenerating}
            hasCharacter={!!characterSpec && characterSpec.bodyParts.length > 0}
          />
          {buildingStatus && isGenerating && (
            <div className="building-status">
              <div className="building-status-indicator"></div>
              {buildingStatus}
            </div>
          )}
          {aiThinking && isGenerating && (
            <div className="ai-thinking">
              <strong>AI Designer:</strong>
              <div className="ai-thinking-text">{aiThinking}</div>
            </div>
          )}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          <div className="settings-card-footer">
            <span>made by Hammy / Ricardo — Powered by AI</span>
            <a href="https://hytopia.com/" target="_blank" rel="noopener noreferrer">hytopia.com</a>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default CharacterGeneratorApp

