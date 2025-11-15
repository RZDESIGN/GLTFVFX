import { useState } from 'react'
import './GeneratorPanel.css'

function CharacterGeneratorPanel({ onGenerate, onRefine, isGenerating, hasCharacter }) {
  const [prompt, setPrompt] = useState('')
  const [refinementPrompt, setRefinementPrompt] = useState('')

  const handleGenerate = () => {
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim())
    }
  }

  const handleRefine = () => {
    if (refinementPrompt.trim() && !isGenerating && hasCharacter) {
      onRefine(refinementPrompt.trim())
      setRefinementPrompt('')
    }
  }

  const handleKeyPress = (e, callback) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      callback()
    }
  }

  const examplePrompts = [
    'A friendly bee with yellow and black stripes',
    'A fierce dragon with red scales and wings',
    'A cute rabbit with fluffy white fur',
    'A magical wizard with a purple robe and hat',
    'A robot with metallic blue armor',
    'A spooky ghost that glows green',
    'A brave knight in shining silver armor',
    'A playful dolphin with smooth blue skin'
  ]

  const setExamplePrompt = (example) => {
    setPrompt(example)
  }

  return (
    <div className="generator-panel">
      <div className="control-group">
        <label className="control-label">
          <span>🎨 Character Prompt</span>
          <span className="control-hint">Describe the character you want to create</span>
        </label>
        <textarea
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, handleGenerate)}
          placeholder="E.g., 'A friendly bee with yellow stripes and translucent wings'"
          rows={3}
          disabled={isGenerating}
        />
        <button 
          className="generate-button primary"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? '⏳ Generating...' : '✨ Generate Character'}
        </button>
      </div>

      <div className="control-group">
        <label className="control-label">
          <span>💡 Example Prompts</span>
        </label>
        <div className="example-prompts">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              className="example-prompt-button"
              onClick={() => setExamplePrompt(example)}
              disabled={isGenerating}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {hasCharacter && (
        <div className="control-group refinement-section">
          <label className="control-label">
            <span>🔧 Refine Character</span>
            <span className="control-hint">Suggest changes to the current character</span>
          </label>
          <textarea
            className="prompt-textarea"
            value={refinementPrompt}
            onChange={(e) => setRefinementPrompt(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleRefine)}
            placeholder="E.g., 'Make the wings bigger' or 'Change colors to blue'"
            rows={2}
            disabled={isGenerating}
          />
          <button 
            className="generate-button secondary"
            onClick={handleRefine}
            disabled={!refinementPrompt.trim() || isGenerating}
          >
            🔄 Refine
          </button>
        </div>
      )}

      <div className="info-section">
        <h3>ℹ️ How it works</h3>
        <ul>
          <li>AI generates a voxel-style character based on your prompt</li>
          <li>Characters are blocky/Minecraft-style, perfect for HYTOPIA</li>
          <li>Includes animations (idle, walk, attack)</li>
          <li>Export as GLTF for use in your game</li>
          <li>Use refinement to tweak the design</li>
        </ul>
      </div>
    </div>
  )
}

export default CharacterGeneratorPanel
