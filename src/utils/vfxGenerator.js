/**
 * GLTF VFX Generator - Template Exporter
 * 
 * Creates GLTF JSON templates with placeholder binary data for VFX preview and design.
 * 
 * ⚠️ IMPORTANT: Exported files are NOT production-ready!
 * - Contains placeholder zero-filled binary data
 * - Will not pass full GLTF validation with geometry/animation checks
 * - Designed for visual preview in this web app only
 * 
 * For production use:
 * 1. Use pre-made examples in /public/examples/ (fully validated)
 * 2. Recreate your design in Blockbench or Blender with proper binary export
 */

// Helper to convert hex color to RGB (0-1 range)
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 1, g: 1, b: 1 }
}

// Simple cube vertices
const getCubePositions = (size) => {
  const s = size / 2
  return [
    -s, -s, s, s, -s, s, s, s, s, -s, s, s,     // front
    -s, -s, -s, -s, s, -s, s, s, -s, s, -s, -s,  // back
    -s, s, -s, -s, s, s, s, s, s, s, s, -s,      // top
    -s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s,  // bottom
    s, -s, -s, s, s, -s, s, s, s, s, -s, s,      // right
    -s, -s, -s, -s, -s, s, -s, s, s, -s, s, -s   // left
  ]
}

// Simple cube normals
const getCubeNormals = () => {
  const normals = []
  const faceNormals = [
    [0, 0, 1], [0, 0, -1], [0, 1, 0],
    [0, -1, 0], [1, 0, 0], [-1, 0, 0]
  ]
  faceNormals.forEach(n => {
    for (let i = 0; i < 4; i++) normals.push(...n)
  })
  return normals
}

// Simple cube UVs
const getCubeUVs = () => {
  const uvs = []
  for (let i = 0; i < 6; i++) {
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
  }
  return uvs
}

// Simple cube indices
const getCubeIndices = () => {
  const indices = []
  for (let i = 0; i < 6; i++) {
    const offset = i * 4
    indices.push(
      offset, offset + 1, offset + 2,
      offset, offset + 2, offset + 3
    )
  }
  return indices
}

// Generate a base64-encoded buffer of specified byte length (filled with zeros)
const generatePlaceholderBuffer = (byteLength) => {
  const buffer = new Uint8Array(byteLength)
  let binary = ''
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
}

export const generateVFXGLTF = (params) => {
  const {
    effectType,
    particleCount,
    particleSize,
    primaryColor,
    secondaryColor,
    glowIntensity,
    lifetime,
    spread,
    animationType,
    emissionShape
  } = params

  // Limit particle count for a valid, manageable file
  const numParticles = Math.min(Math.max(particleCount, 5), 30)

  const primaryRgb = hexToRgb(primaryColor)
  const secondaryRgb = hexToRgb(secondaryColor)

  // Clamp emissive factor to valid GLTF range [0, 1]
  const emissiveFactor = Math.min(glowIntensity * 0.3, 1.0)

  // Get base cube geometry
  const positions = getCubePositions(particleSize)
  const normals = getCubeNormals()
  const uvs = getCubeUVs()
  const indices = getCubeIndices()

  const gltf = {
    asset: {
      version: "2.0",
      generator: "GLTF VFX Generator - gltfvfx.fun"
    },
    scene: 0,
    scenes: [{
      name: `${effectType}_effect`,
      nodes: [0]
    }],
    nodes: [],
    meshes: [],
    materials: [{
      name: `${effectType}_material`,
      pbrMetallicRoughness: {
        baseColorFactor: [primaryRgb.r, primaryRgb.g, primaryRgb.b, 1.0],
        metallicFactor: 0.2,
        roughnessFactor: 0.5
      },
      emissiveFactor: [
        Math.min(primaryRgb.r * emissiveFactor, 1.0),
        Math.min(primaryRgb.g * emissiveFactor, 1.0),
        Math.min(primaryRgb.b * emissiveFactor, 1.0)
      ],
      doubleSided: true
    }],
    accessors: [],
    bufferViews: [],
    buffers: [],
    animations: [{
      name: `${effectType}_animation`,
      samplers: [],
      channels: []
    }]
  }

  // Create VFX root container node
  const vfxContainer = {
    name: `${effectType}_vfx`,
    children: []
  }

  // Generate particles
  for (let i = 0; i < numParticles; i++) {
    // Calculate initial position based on emission shape
    const angle = (i / numParticles) * Math.PI * 2
    const rand = () => Math.random()
    
    let x = 0, y = 0, z = 0

    switch (emissionShape) {
      case 'sphere':
        const theta = rand() * Math.PI * 2
        const phi = Math.acos(2 * rand() - 1)
        const r = rand() * spread
        x = r * Math.sin(phi) * Math.cos(theta)
        y = r * Math.sin(phi) * Math.sin(theta)
        z = r * Math.cos(phi)
        break
      
      case 'cone':
        const coneR = rand() * spread
        x = coneR * Math.cos(angle)
        y = rand() * spread
        z = coneR * Math.sin(angle)
        break
      
      case 'ring':
        const ringR = spread * (0.7 + rand() * 0.3)
        x = ringR * Math.cos(angle)
        y = (rand() - 0.5) * 0.2
        z = ringR * Math.sin(angle)
        break
      
      case 'box':
        x = (rand() - 0.5) * spread * 2
        y = (rand() - 0.5) * spread * 2
        z = (rand() - 0.5) * spread * 2
        break
    }

    // Create particle mesh (referencing shared geometry via accessors)
    const meshIndex = gltf.meshes.length
    gltf.meshes.push({
      name: `particle_${i}`,
      primitives: [{
        mode: 4,
        attributes: {
          POSITION: 0, // Would reference actual buffer in production
          NORMAL: 1,
          TEXCOORD_0: 2
        },
        indices: 3,
        material: 0
      }]
    })

    // Create particle node
    const nodeIndex = gltf.nodes.length + 1 // +1 because root node will be inserted at index 0
    const particleNode = {
      name: `particle_${i}`,
      mesh: meshIndex,
      translation: [x, y, z],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1]
    }
    
    gltf.nodes.push(particleNode)
    vfxContainer.children.push(nodeIndex)

    // Generate animation keyframes
    const times = [0, lifetime * 0.33, lifetime * 0.67, lifetime]
    const translations = []
    const rotations = []
    const scales = []

    times.forEach((t) => {
      const progress = t / lifetime

      // Calculate animated transform
      let animX = x, animY = y, animZ = z
      let animScale = 1

      switch (animationType) {
        case 'explode':
          const exp = 1 + progress * 2
          animX = x * exp
          animY = y * exp
          animZ = z * exp
          animScale = Math.max(0.1, 1 - progress * 0.8)
          break
        
        case 'rise':
          animY = y + progress * spread * 2.5
          break
        
        case 'spiral':
          const spiralAngle = angle + progress * Math.PI * 4
          const spiralR = Math.sqrt(x * x + z * z) * (1 - progress * 0.3)
          animX = spiralR * Math.cos(spiralAngle)
          animY = y + progress * spread * 2
          animZ = spiralR * Math.sin(spiralAngle)
          break
        
        case 'pulse':
          animScale = 0.7 + Math.sin(progress * Math.PI * 4) * 0.3
          break
        
        default: // orbit
          const orbitAngle = angle + progress * Math.PI * 2
          const orbitR = Math.sqrt(x * x + z * z)
          animX = orbitR * Math.cos(orbitAngle)
          animY = y + Math.sin(progress * Math.PI * 2) * 0.4
          animZ = orbitR * Math.sin(orbitAngle)
      }

      translations.push(animX, animY, animZ)
      
      // Simple Y-axis rotation
      const rotAngle = progress * Math.PI * 2
      rotations.push(0, Math.sin(rotAngle / 2), 0, Math.cos(rotAngle / 2))
      
      scales.push(animScale, animScale, animScale)
    })

    // Add animation samplers and channels
    const samplerBase = gltf.animations[0].samplers.length
    
    gltf.animations[0].samplers.push(
      {
        input: 4, // Would reference time accessor
        output: 5, // Would reference translation accessor
        interpolation: "LINEAR"
      },
      {
        input: 4,
        output: 6, // Would reference rotation accessor
        interpolation: "LINEAR"
      },
      {
        input: 4,
        output: 7, // Would reference scale accessor
        interpolation: "LINEAR"
      }
    )

    gltf.animations[0].channels.push(
      {
        sampler: samplerBase,
        target: { node: nodeIndex, path: "translation" }
      },
      {
        sampler: samplerBase + 1,
        target: { node: nodeIndex, path: "rotation" }
      },
      {
        sampler: samplerBase + 2,
        target: { node: nodeIndex, path: "scale" }
      }
    )
  }

  // Insert container node at beginning
  gltf.nodes.unshift(vfxContainer)

  // Create placeholder bufferViews (minimal valid structure)
  gltf.bufferViews = [
    { buffer: 0, byteOffset: 0, byteLength: 288, target: 34962 },  // positions
    { buffer: 0, byteOffset: 288, byteLength: 288, target: 34962 }, // normals
    { buffer: 0, byteOffset: 576, byteLength: 192, target: 34962 }, // uvs
    { buffer: 0, byteOffset: 768, byteLength: 72, target: 34963 },  // indices
    { buffer: 0, byteOffset: 840, byteLength: 16 },                 // times
    { buffer: 0, byteOffset: 856, byteLength: 48 },                 // translations
    { buffer: 0, byteOffset: 904, byteLength: 64 },                 // rotations
    { buffer: 0, byteOffset: 968, byteLength: 48 }                  // scales
  ]

  // Create buffer with proper byte length and placeholder data
  const bufferByteLength = 1016
  gltf.buffers = [{
    byteLength: bufferByteLength,
    uri: "data:application/octet-stream;base64," + generatePlaceholderBuffer(bufferByteLength)
  }]

  // Create placeholder accessors (in production, these would reference actual binary data)
  gltf.accessors = [
    {
      bufferView: 0,
      componentType: 5126,
      count: 24,
      type: "VEC3",
      max: [particleSize/2, particleSize/2, particleSize/2],
      min: [-particleSize/2, -particleSize/2, -particleSize/2]
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: 24,
      type: "VEC3"
    },
    {
      bufferView: 2,
      componentType: 5126,
      count: 24,
      type: "VEC2"
    },
    {
      bufferView: 3,
      componentType: 5123,
      count: 36,
      type: "SCALAR",
      max: [23],
      min: [0]
    },
    {
      bufferView: 4,
      componentType: 5126,
      count: 4,
      type: "SCALAR",
      min: [0],
      max: [lifetime]
    },
    {
      bufferView: 5,
      componentType: 5126,
      count: 4,
      type: "VEC3"
    },
    {
      bufferView: 6,
      componentType: 5126,
      count: 4,
      type: "VEC4"
    },
    {
      bufferView: 7,
      componentType: 5126,
      count: 4,
      type: "VEC3"
    }
  ]

  return gltf
}
