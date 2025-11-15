/**
 * OpenRouter Streaming Client with Tool Calling
 * Allows AI to design characters in real-time using tools
 */

const OPENROUTER_API_KEY = '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'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Lightweight debug logger
const streamLog = (...args) => {
  try {
    if (window.__AI_DEBUG__ === false) return
  } catch (_) {}
  // Avoid dumping secrets
  console.log('[AI-STREAM]', ...args)
}

// Tool definitions for the AI to use
const CHARACTER_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'set_character_name',
      description: 'Set the name and description of the character being designed',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Character name (e.g. "friendly_bee")' },
          description: { type: 'string', description: 'Brief description of the character' }
        },
        required: ['name', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_body_part',
      description: 'Add a body part to the character (head, body, limbs, etc.)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Body part name (e.g. "head", "left_wing")' },
          position: {
            type: 'array',
            items: { type: 'number' },
            description: 'Position [x, y, z] in world space',
            minItems: 3,
            maxItems: 3
          },
          size: {
            type: 'array',
            items: { type: 'number' },
            description: 'Size [width, height, depth]',
            minItems: 3,
            maxItems: 3
          },
          color: { type: 'string', description: 'Hex color (e.g. "#FF5500")' },
          pivot: {
            type: 'array',
            items: { type: 'number' },
            description: 'Pivot point [x, y, z] for rotation',
            minItems: 3,
            maxItems: 3
          },
          shape: {
            type: 'string',
            description: 'Optional primitive hint (currently box; use multiple parts for curvature)',
            enum: ['box']
          },
          detail: {
            type: 'object',
            description: 'Optional detail hints for this part (used for UV tiling and sizing granularity)',
            properties: {
              voxelSize: { type: 'number', description: 'Target voxel unit size for this part (e.g., 0.05–0.1)' }
            }
          },
          texture: {
            type: 'object',
            description: 'Optional texture detail overrides for this part',
            properties: {
              resolution: { type: 'number', description: 'Texture resolution in pixels (e.g., 32 or 48)' },
              cellsPerSide: { type: 'number', description: 'How many blocky cells per side (e.g., 6–8)' },
              noiseAmount: { type: 'number', description: 'Noise variation amount, 0–0.2' },
              uvScale: {
                type: 'array',
                items: { type: 'number' },
                description: 'UV tiling [u, v] for this part',
                minItems: 2,
                maxItems: 2
              }
            }
          }
        },
        required: ['name', 'position', 'size', 'color']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_body_part',
      description: 'Update properties of an existing body part',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Existing body part name' },
          fieldsToUpdate: {
            type: 'object',
            description: 'Fields to update for the part',
            properties: {
              position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              size: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              color: { type: 'string' },
              pivot: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              name: { type: 'string' },
              shape: { type: 'string', enum: ['box'] },
              detail: {
                type: 'object',
                properties: {
                  voxelSize: { type: 'number' }
                }
              },
              texture: {
                type: 'object',
                properties: {
                  resolution: { type: 'number' },
                  cellsPerSide: { type: 'number' },
                  noiseAmount: { type: 'number' },
                  uvScale: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }
                }
              }
            }
          }
        },
        required: ['name', 'fieldsToUpdate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_body_part',
      description: 'Remove a body part by name',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Body part name to remove' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'replace_body_part',
      description: 'Replace a body part with a new definition',
      parameters: {
        type: 'object',
        properties: {
          oldName: { type: 'string', description: 'Existing body part name' },
          newPart: {
            type: 'object',
            description: 'New body part definition',
            properties: {
              name: { type: 'string' },
              position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              size: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              color: { type: 'string' },
              pivot: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              shape: { type: 'string', enum: ['box'] },
              detail: {
                type: 'object',
                properties: {
                  voxelSize: { type: 'number' }
                }
              },
              texture: {
                type: 'object',
                properties: {
                  resolution: { type: 'number' },
                  cellsPerSide: { type: 'number' },
                  noiseAmount: { type: 'number' },
                  uvScale: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }
                }
              }
            },
            required: ['name', 'position', 'size', 'color']
          }
        },
        required: ['oldName', 'newPart']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_animation',
      description: 'Add an animation to the character',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Animation name (e.g. "idle", "walk", "fly")' },
          duration: { type: 'number', description: 'Duration in seconds' },
          keyframes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'number', description: 'Time in seconds' },
                bodyPart: { type: 'string', description: 'Body part to animate' },
                rotation: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Rotation [x, y, z] in radians',
                  minItems: 3,
                  maxItems: 3
                },
                position: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Position [x, y, z]',
                  minItems: 3,
                  maxItems: 3
                }
              },
              required: ['time', 'bodyPart']
            }
          }
        },
        required: ['name', 'duration', 'keyframes']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_keyframe',
      description: 'Add a keyframe to an animation',
      parameters: {
        type: 'object',
        properties: {
          animationName: { type: 'string' },
          bodyPart: { type: 'string' },
          time: { type: 'number' },
          transforms: {
            type: 'object',
            properties: {
              position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              rotation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              scale: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 }
            }
          }
        },
        required: ['animationName', 'bodyPart', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_keyframe',
      description: 'Remove a keyframe from an animation',
      parameters: {
        type: 'object',
        properties: {
          animationName: { type: 'string' },
          bodyPart: { type: 'string' },
          time: { type: 'number' }
        },
        required: ['animationName', 'bodyPart', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_colors',
      description: 'Set the base and accent colors for the character theme',
      parameters: {
        type: 'object',
        properties: {
          baseColor: { type: 'string', description: 'Base hex color' },
          accentColor: { type: 'string', description: 'Accent hex color' },
          textureResolution: { type: 'number', description: 'Texture resolution in pixels (e.g., 32 or 48)' },
          textureCellsPerSide: { type: 'number', description: 'Blocky cells per side (e.g., 6–8)' },
          textureNoiseAmount: { type: 'number', description: 'Noise variation amount 0–0.2' },
          voxelSize: { type: 'number', description: 'Global target voxel unit size (e.g., 0.05–0.1)' }
        },
        required: ['baseColor', 'accentColor']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_scene_state',
      description: 'Get a JSON summary of the current scene (parts, animations, bounding box). The tool returns a structured JSON snapshot.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'validate_scene',
      description: 'Validate the scene and return any issues found (overlaps, disconnected limbs, off-center pivot, bounding width > 1.5).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'measure_bounds',
      description: 'Compute the bounding box and suggest camera framing (position and target).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'snapshot_preview',
      description: 'Capture a small 128x128 PNG data URL of the current viewport for visual feedback. Returns { dataURL }.',
      parameters: { type: 'object', properties: {} }
    }
  }
]

/**
 * Stream character generation with real-time tool calls
 * @param {string} prompt - User prompt
 * @param {Function} onToolCall - Called when AI invokes a tool
 * @param {Function} onThinking - Called with AI's thinking/reasoning
 * @param {Function} onComplete - Called when generation is complete
 * @param {Function} onError - Called on error
 */
export async function streamCharacterGeneration(prompt, { onToolCall, onThinking, onComplete, onError }) {
  const systemPrompt = `You are an expert 3D voxel character designer for HYTOPIA.

Design characters step-by-step using the provided tools:
1. First, set the character name and description
2. Then add body parts one by one (head, body, limbs, etc.)
3. Finally, add animations

Guidelines:
- Use minecraft-style blocky proportions
- Build using box primitives, but sculpt curvature and details by composing MANY smaller parts (avoid huge single cuboids)
- Position values are in world space [x, y, z]
- Size is [width, height, depth] 
- Colors should be vibrant hex codes like "#FF5500"
- Create 2-3 simple looping animations
- Think step-by-step and explain your design choices
 - Use "left_" and "right_" prefixes for symmetric parts
 - Aim for 35–60 parts if needed to avoid a toy-block look (child-stacked blocks). Use smaller pieces to round heads, taper limbs, add wings/antennae details, etc.
 - Keep overall width (bbox.max.x - bbox.min.x) < 1.5
 - Use pivots for rotating limbs (e.g., hinge at shoulder/wing root)
 - Texture detail: prefer resolution 32–48, cellsPerSide 6–8, noise 0.05–0.1 for a slightly more detailed blocky texture. You can set these via set_colors or per-part texture overrides.
 - For small features (eyes, claws, tips), use fine sizing increments (≈0.05–0.1 units) and precise positions.
 - After adding a batch of body parts, call validate_scene() and measure_bounds(), fix issues (using set_body_part/remove_body_part/replace_body_part) before adding animations
 - Before finalizing, ensure idle animation exists and camera framing is reasonable
 - Optionally call snapshot_preview() after significant changes to visually confirm layout

Available tools:
 - set_character_name, add_body_part, set_body_part, remove_body_part, replace_body_part
 - set_colors
 - add_animation, add_keyframe, remove_keyframe
 - get_scene_state, validate_scene, measure_bounds, snapshot_preview

Design a complete, functional character!

Notes on add_body_part:
- Optional fields: shape (currently "box"), detail.voxelSize, texture.{resolution,cellsPerSide,noiseAmount,uvScale}.
- Using many smaller box parts is encouraged to achieve rounded/angled silhouettes.`

  try {
    streamLog('Starting streaming generation', {
      model: 'anthropic/claude-sonnet-4.5',
      tools: CHARACTER_TOOLS.length,
      promptPreview: typeof prompt === 'string' ? `${prompt.slice(0, 160)}${prompt.length > 160 ? '…' : ''}` : ''
    })

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'HYTOPIA Character Generator'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Design a character: ${prompt}` }
        ],
        tools: CHARACTER_TOOLS,
        temperature: 0.7,
        max_tokens: 4000,
        stream: true
      })
    })

    streamLog('HTTP response', { ok: response.ok, status: response.status, statusText: response.statusText })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentToolCall = null
    let toolCallsBuffer = []
    let totalChunks = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') continue
        if (!line.startsWith('data: ')) continue

        try {
          const data = JSON.parse(line.slice(6))
          const delta = data.choices?.[0]?.delta

          if (!delta) continue

          // Handle text content (thinking/reasoning)
          if (delta.content) {
            totalChunks++
            streamLog('delta.content', delta.content)
            onThinking?.(delta.content)
          }

          // Handle tool calls
          if (delta.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index || 0

              // Initialize tool call if needed
              if (!toolCallsBuffer[index]) {
                toolCallsBuffer[index] = {
                  id: toolCallDelta.id || `tool_${index}`,
                  type: 'function',
                  function: {
                    name: '',
                    arguments: ''
                  }
                }
                streamLog('init tool_call buffer', { index, id: toolCallsBuffer[index].id })
              }

              const toolCall = toolCallsBuffer[index]

              // Accumulate function name
              if (toolCallDelta.function?.name) {
                toolCall.function.name += toolCallDelta.function.name
                streamLog('tool_call name chunk', { index, name: toolCall.function.name })
              }

              // Accumulate function arguments
              if (toolCallDelta.function?.arguments) {
                toolCall.function.arguments += toolCallDelta.function.arguments
                streamLog('tool_call args chunk', {
                  index,
                  argsPreview: `${toolCall.function.arguments.slice(0, 200)}${toolCall.function.arguments.length > 200 ? '…' : ''}`
                })
              }

              // When we have a complete function name, we can start processing
              if (toolCall.function.name && toolCall.function.arguments) {
                currentToolCall = toolCall
              }
            }
          }

          // Check if we have a complete tool call to process
          if (currentToolCall?.function?.name && currentToolCall?.function?.arguments) {
            try {
              // Try to parse the arguments (they might still be incomplete)
              const args = JSON.parse(currentToolCall.function.arguments)
              streamLog('parsed tool_call', {
                name: currentToolCall.function.name,
                args
              })
              
              // Successfully parsed - invoke the tool
              onToolCall?.({
                name: currentToolCall.function.name,
                arguments: args
              })

              // Clear this tool call
              currentToolCall = null
            } catch (e) {
              // Arguments not complete yet, continue accumulating
              streamLog('tool_call args not parseable yet (continuing)', e?.message || e)
            }
          }

        } catch (e) {
          streamLog('Failed to parse SSE line', { linePreview: `${line.slice(0, 200)}${line.length > 200 ? '…' : ''}`, error: e?.message || e })
        }
      }
    }

    // Process any remaining complete tool calls
    for (const toolCall of toolCallsBuffer) {
      if (toolCall?.function?.name && toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          streamLog('flushing remaining tool_call', { name: toolCall.function.name, args })
          onToolCall?.({
            name: toolCall.function.name,
            arguments: args
          })
        } catch (e) {
          // Ignore incomplete tool calls
          streamLog('skipping incomplete remaining tool_call', e?.message || e)
        }
      }
    }

    streamLog('stream complete', { totalThinkingChunks: totalChunks })
    onComplete?.()

  } catch (error) {
    streamLog('Streaming error', error?.message || error)
    onError?.(error)
  }
}

/**
 * Robust non-stream loop that returns tool results back to the model.
 * This enables multi-step tool use (name → body parts → animations).
 */
export async function runCharacterGeneration(prompt, { onToolCall, onThinking, onComplete, onError, getSceneSummary }) {
  const systemPrompt = `You are an expert 3D voxel character designer for HYTOPIA.

Design characters step-by-step using the provided tools:
1. First, set the character name and description
2. Then add body parts one by one (head, body, limbs, etc.)
3. Finally, add animations

Guidelines:
- Use minecraft-style blocky proportions
- Build using box primitives, but sculpt curvature and details by composing MANY smaller parts (avoid huge single cuboids)
- Position values are in world space [x, y, z]
- Size is [width, height, depth] 
- Colors should be vibrant hex codes like "#FF5500"
- Create 2-3 simple looping animations
- Think step-by-step and explain your design choices
 - Use "left_" and "right_" prefixes for symmetric parts
 - Aim for 35–60 parts if needed to avoid a toy-block look (child-stacked blocks). Use smaller pieces to round heads, taper limbs, add wings/antennae details, etc.
 - Keep overall width (bbox.max.x - bbox.min.x) < 1.5
 - Use pivots for rotating limbs (e.g., hinge at shoulder/wing root)
 - Texture detail: prefer resolution 32–48, cellsPerSide 6–8, noise 0.05–0.1 for a slightly more detailed blocky texture. You can set these via set_colors or per-part texture overrides.
 - For small features (eyes, claws, tips), use fine sizing increments (≈0.05–0.1 units) and precise positions.
 - After adding a batch of body parts, call validate_scene() and measure_bounds(), fix issues (using set_body_part/remove_body_part/replace_body_part) before adding animations
 - Before finalizing, ensure idle animation exists and camera framing is reasonable
 - Optionally call snapshot_preview() after significant changes to visually confirm layout

Available tools:
 - set_character_name, add_body_part, set_body_part, remove_body_part, replace_body_part
 - set_colors
 - add_animation, add_keyframe, remove_keyframe
 - get_scene_state, validate_scene, measure_bounds, snapshot_preview

Design a complete, functional character!

Notes on add_body_part:
- Optional fields: shape (currently "box"), detail.voxelSize, texture.{resolution,cellsPerSide,noiseAmount,uvScale}.
- Using many smaller box parts is encouraged to achieve rounded/angled silhouettes.`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Design a character: ${prompt}` }
  ]

  const model = 'anthropic/claude-sonnet-4.5'
  const maxSteps = 16

  try {
    for (let step = 0; step < maxSteps; step++) {
      streamLog('request step', { step, model, messagesCount: messages.length })
      // Add a timeout so requests don't hang indefinitely
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'HYTOPIA Character Generator'
        },
        body: JSON.stringify({
          model,
          messages,
          tools: CHARACTER_TOOLS,
          tool_choice: 'auto',
          parallel_tool_calls: false,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const msg = data.choices?.[0]?.message
      if (!msg) {
        throw new Error('No assistant message in response')
      }

      const assistantText = msg.content
      if (assistantText && typeof assistantText === 'string') {
        onThinking?.(assistantText)
        streamLog('assistant content', assistantText.slice(0, 200))
      }

      const toolCalls = msg.tool_calls || []
      if (!toolCalls.length) {
        streamLog('no more tool calls; complete')
        break
      }

      // Execute tool calls locally
      const toolResults = []
      for (const call of toolCalls) {
        const name = call.function?.name || ''
        let args = {}
        try {
          args = call.function?.arguments ? JSON.parse(call.function.arguments) : {}
        } catch (e) {
          // Try to salvage partial JSON by trimming trailing text
          streamLog('tool args JSON parse failed', e?.message || e)
          try {
            const trimmed = (call.function?.arguments || '').trim()
            const lastBrace = trimmed.lastIndexOf('}')
            if (lastBrace > 0) {
              args = JSON.parse(trimmed.slice(0, lastBrace + 1))
            }
          } catch (_) {}
        }

        streamLog('invoke tool', { name, args })
        let toolData = undefined
        try {
          toolData = onToolCall?.({ name, arguments: args })
        } catch (_) {}

        // Send a minimal tool ack back so the model can proceed
        const summary = typeof getSceneSummary === 'function' ? getSceneSummary() : undefined
        const result = {
          ok: true,
          received: args,
          note: 'Tool executed on client',
          sceneSummary: summary,
          data: toolData
        }

        toolResults.push({ id: call.id, result })
      }

      // Append assistant tool_calls message ONCE, then tool messages for each id
      messages.push({
        role: 'assistant',
        content: assistantText || '',
        tool_calls: toolCalls
      })
      for (const { id, result } of toolResults) {
        messages.push({
          role: 'tool',
          tool_call_id: id,
          name: (toolCalls.find(tc => tc.id === id)?.function?.name) || undefined,
          content: JSON.stringify(result)
        })
      }
    }

    onComplete?.()
  } catch (error) {
    streamLog('runCharacterGeneration error', error?.message || error)
    onError?.(error)
  }
}

