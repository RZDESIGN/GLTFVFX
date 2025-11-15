/**
 * OpenRouter API Client for AI-driven model generation
 */

const OPENROUTER_API_KEY = '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'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Call OpenRouter API to generate character description and voxel structure
 */
export async function generateCharacterSpec(prompt) {
  const systemPrompt = 'You are an expert 3D voxel character designer for the HYTOPIA game engine. Your task is to design Minecraft-style characters and animals with enough detail to avoid a toy-block look. Output ONLY valid JSON in this format: { "name": "character_name", "description": "Brief description", "bodyParts": [{ "name": "head", "position": [0, 0.5, 0], "size": [0.5, 0.5, 0.5], "color": "#hexcolor", "pivot": [0, 0, 0], "shape": "box", "detail": { "voxelSize": 0.08 }, "texture": { "resolution": 32, "cellsPerSide": 6, "noiseAmount": 0.06, "uvScale": [2,2] } }], "animations": [{ "name": "idle", "duration": 2.0, "keyframes": [{ "time": 0, "bodyPart": "head", "rotation": [0, 0, 0] }] }], "baseColor": "#hexcolor", "accentColor": "#hexcolor", "textureResolution": 32, "textureCellsPerSide": 6, "textureNoiseAmount": 0.06, "voxelSize": 0.08 }. Design rules: Build using box primitives; compose many smaller parts to sculpt curvature and details; Position values are in world space [x, y, z]; Size is [width, height, depth]; Rotation is in radians [x, y, z]; Include at least head, body, limbs; Use minecraft-style proportions; Colors should be vibrant and themed; Include 2–3 simple animations (idle, walk, attack); Prefer texture resolution 32–48 with 6–8 cells per side and noise 0.05–0.1; Keep animations subtle and looping.'

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'HYTOPIA Character Generator'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Design a character: ${prompt}` }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content in API response')
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim()
    const jsonCodeBlock = '```json'
    const codeBlock = '```'
    
    if (jsonStr.startsWith(jsonCodeBlock)) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
    } else if (jsonStr.startsWith(codeBlock)) {
      jsonStr = jsonStr.replace(/```\n?/g, '').replace(/```\n?$/g, '')
    }

    const characterSpec = JSON.parse(jsonStr)
    
    if (!characterSpec.bodyParts || !Array.isArray(characterSpec.bodyParts)) {
      throw new Error('Invalid character spec: missing bodyParts array')
    }

    return characterSpec

  } catch (error) {
    console.error('OpenRouter API error:', error)
    throw error
  }
}

/**
 * Refine existing character based on feedback
 */
export async function refineCharacterSpec(currentSpec, feedback) {
  const systemPrompt = 'You are refining a 3D voxel character design. The user will provide the current design and feedback. Modify the design according to the feedback while keeping the same JSON structure. Output ONLY valid JSON.'

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'HYTOPIA Character Generator'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current design:\n${JSON.stringify(currentSpec, null, 2)}\n\nUser feedback: ${feedback}` }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    let jsonStr = data.choices[0]?.message?.content.trim()
    
    // Extract JSON
    const jsonCodeBlock = '```json'
    const codeBlock = '```'
    
    if (jsonStr.startsWith(jsonCodeBlock)) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
    } else if (jsonStr.startsWith(codeBlock)) {
      jsonStr = jsonStr.replace(/```\n?/g, '').replace(/```\n?$/g, '')
    }

    return JSON.parse(jsonStr)

  } catch (error) {
    console.error('OpenRouter refine error:', error)
    throw error
  }
}
