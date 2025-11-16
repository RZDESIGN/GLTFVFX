import { useEffect, useRef, useState } from 'react'
import './App.css'
import VFXViewer from './components/VFXViewer'
import GeneratorPanel from './components/GeneratorPanel'
import { generateVFXGLTF } from './utils/vfxGenerator'
import { triggerDownloadFromBlob } from './utils/downloadHelpers'
import { createInitialParams, createRandomParams, updateParamsForEffectType } from './utils/vfxParameters'
import { convertSnowstormToVfxParams } from './utils/snowstormImporter'

const TAB_OPTIONS = [
  { id: 'config', label: 'Config' },
  { id: 'preview', label: 'Preview' },
  { id: 'code', label: 'Code' },
  { id: 'help', label: 'Help' }
]

function App() {
  const [vfxParams, setVfxParams] = useState(() => createInitialParams())
  const [activeTab, setActiveTab] = useState('preview')
  const [isPortrait, setIsPortrait] = useState(() => window.innerWidth < 960)
  const importInputRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerWidth < 960)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleParamChange = (param, value) => {
    setVfxParams(prev => {
      if (param === 'effectType') {
        return updateParamsForEffectType(prev, value)
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
      const serialized = typeof gltfData === 'string' ? gltfData : JSON.stringify(gltfData, null, 2)
      const blob = new Blob([serialized], { type: 'application/json' })
      triggerDownloadFromBlob(blob, `${vfxParams.effectType}-effect.gltf`)

      setTimeout(() => {
        alert('✨ GLTF exported!\n\nThe file includes geometry, materials, and looping animation data matching the on-screen effect.\n\nTip: Import into your engine or run through glTF validation if you need extra assurance.')
      }, 80)
    } catch (error) {
      console.error('[gltf-export]', error)
      alert('Export failed. Please check the console for details.')
    }
  }

  const handleRandomize = () => {
    setVfxParams(createRandomParams())
  }

  const handleSnowstormImportClick = () => {
    importInputRef.current?.click()
  }

  const handleSnowstormFileChange = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      const { params, warnings } = convertSnowstormToVfxParams(text)
      setVfxParams(params)
      const warningText = warnings.length
        ? `\n\nNotes:\n- ${warnings.join('\n- ')}`
        : ''
      setTimeout(() => {
        alert(`Imported ${file.name}${warningText}`)
      }, 80)
    } catch (error) {
      console.error('[snowstorm-import]', error)
      alert('Import failed. Please make sure the file is a valid Snowstorm .particle JSON.')
    } finally {
      event.target.value = ''
    }
  }

  const showSidebar = !isPortrait || activeTab === 'config'
  const showPreview = !isPortrait || activeTab === 'preview'
  const showPlaceholder = isPortrait && (activeTab === 'code' || activeTab === 'help')

  return (
    <div className="app-shell">
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.particle,.mcparticle"
        style={{ display: 'none' }}
        onChange={handleSnowstormFileChange}
      />
      <header className="app-header">
        <div className="brand-mark">
          <span role="img" aria-hidden="true">✨</span>
          HYTOPIA VFX Lab
        </div>
        <nav className="tab-nav">
          {TAB_OPTIONS.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button onClick={handleRandomize} className="ghost-button">
            <span role="img" aria-hidden="true">🎲</span>
            Randomize
          </button>
          <button onClick={handleSnowstormImportClick} className="solid-button">
            <span role="img" aria-hidden="true">❄️</span>
            Import
          </button>
          <button onClick={handleExportGLTF} className="solid-button primary">
            <span role="img" aria-hidden="true">💾</span>
            Export
          </button>
        </div>
      </header>

      <main className="app-body">
        {showSidebar && (
          <aside className="sidebar-panel">
            <div className="panel-header">Effect Controls</div>
            <div className="panel-content">
              <GeneratorPanel 
                params={vfxParams} 
                onParamChange={handleParamChange}
                onRandomize={handleRandomize}
              />
            </div>
            <div className="panel-footer">
              <span>Made by Hammy / Ricardo — Optimized for HYTOPIA</span>
              <a href="https://hytopia.com/" target="_blank" rel="noopener noreferrer">hytopia.com</a>
            </div>
          </aside>
        )}

        {showPreview && (
          <section className="preview-panel">
            <VFXViewer params={vfxParams} />
          </section>
        )}

        {showPlaceholder && (
          <section className="placeholder-panel">
            {activeTab === 'code' && (
              <div className="placeholder-card">
                <h3>Code View</h3>
                <p>GLTF export and preset serialization will appear here in a future update.</p>
              </div>
            )}
            {activeTab === 'help' && (
              <div className="placeholder-card">
                <h3>Help & Docs</h3>
                <p>Guides, keyboard shortcuts, and Snowstorm parity notes are coming soon.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
