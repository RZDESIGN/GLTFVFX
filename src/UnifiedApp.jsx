import { useState } from 'react'
import './App.css'
import App from './App'
import CharacterGeneratorApp from './CharacterGeneratorApp'

function UnifiedApp() {
  const [mode, setMode] = useState('vfx') // 'vfx' or 'character'

  const toggleMode = () => {
    setMode(prev => prev === 'vfx' ? 'character' : 'vfx')
  }

  return (
    <div className="unified-app">
      <button 
        className="mode-toggle-button" 
        onClick={toggleMode}
        title={mode === 'vfx' ? 'Switch to AI Character Generator' : 'Switch to VFX Generator'}
      >
        <span>{mode === 'vfx' ? '🤖' : '✨'}</span>
        <span className="mode-toggle-text">
          {mode === 'vfx' ? 'AI Characters' : 'VFX Effects'}
        </span>
      </button>
      
      {mode === 'vfx' ? <App /> : <CharacterGeneratorApp />}
    </div>
  )
}

export default UnifiedApp


