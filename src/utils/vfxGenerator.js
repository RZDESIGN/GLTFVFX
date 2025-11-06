/**
 * Generate GLTF VFX based on parameters
 * Creates a voxel-styled particle effect that's compatible with HYTOPIA
 */

// Helper to convert hex color to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 1, g: 1, b: 1 }
}

// Generate cube vertices for voxel-style particles
const generateCubeVertices = (size) => {
  const s = size / 2
  return [
    // Front face
    -s, -s, s,  s, -s, s,  s, s, s,  -s, s, s,
    // Back face
    -s, -s, -s, -s, s, -s, s, s, -s, s, -s, -s,
    // Top face
    -s, s, -s,  -s, s, s,  s, s, s,  s, s, -s,
    // Bottom face
    -s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s,
    // Right face
    s, -s, -s,  s, s, -s,  s, s, s,  s, -s, s,
    // Left face
    -s, -s, -s, -s, -s, s, -s, s, s, -s, s, -s
  ]
}

// Generate normals for cube
const generateCubeNormals = () => {
  const normals = []
  const faces = [
    [0, 0, 1],   // front
    [0, 0, -1],  // back
    [0, 1, 0],   // top
    [0, -1, 0],  // bottom
    [1, 0, 0],   // right
    [-1, 0, 0]   // left
  ]
  faces.forEach(normal => {
    for (let i = 0; i < 4; i++) {
      normals.push(...normal)
    }
  })
  return normals
}

// Generate UV coordinates
const generateCubeUVs = () => {
  const uvs = []
  for (let i = 0; i < 6; i++) {
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
  }
  return uvs
}

// Generate indices for cube
const generateCubeIndices = (offset = 0) => {
  const indices = []
  for (let i = 0; i < 6; i++) {
    const faceOffset = offset + i * 4
    indices.push(
      faceOffset, faceOffset + 1, faceOffset + 2,
      faceOffset, faceOffset + 2, faceOffset + 3
    )
  }
  return indices
}

// Generate animation keyframes
const generateAnimationKeyframes = (params, particleIndex, totalParticles) => {
  const { lifetime, particleSpeed, spread, animationType } = params
  const timeSteps = [0, lifetime / 4, lifetime / 2, (3 * lifetime) / 4, lifetime]
  
  let positions = []
  let rotations = []
  let scales = []

  const angle = (particleIndex / totalParticles) * Math.PI * 2
  const radius = spread * (0.5 + Math.random() * 0.5)

  timeSteps.forEach((time, idx) => {
    const progress = time / lifetime

    switch (animationType) {
      case 'explode':
        const scale = 1 + progress * 2
        positions.push(
          Math.cos(angle) * radius * scale,
          Math.sin(angle) * radius * scale * 0.5,
          Math.sin(angle) * radius * scale
        )
        scales.push(
          Math.max(0.1, 1 - progress),
          Math.max(0.1, 1 - progress),
          Math.max(0.1, 1 - progress)
        )
        break

      case 'orbit':
        const orbitAngle = angle + progress * Math.PI * 2 * particleSpeed
        positions.push(
          Math.cos(orbitAngle) * radius,
          Math.sin(progress * Math.PI * 2) * 0.3,
          Math.sin(orbitAngle) * radius
        )
        scales.push(1, 1, 1)
        break

      case 'rise':
        positions.push(
          Math.cos(angle) * radius,
          progress * spread * 2,
          Math.sin(angle) * radius
        )
        scales.push(1, 1, 1)
        break

      case 'spiral':
        const spiralAngle = angle + progress * Math.PI * 4 * particleSpeed
        positions.push(
          Math.cos(spiralAngle) * radius * (1 - progress * 0.5),
          progress * spread * 2,
          Math.sin(spiralAngle) * radius * (1 - progress * 0.5)
        )
        scales.push(1, 1, 1)
        break

      case 'pulse':
        const pulse = Math.sin(progress * Math.PI * 4) * 0.3 + 0.7
        positions.push(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.5,
          Math.sin(angle) * radius
        )
        scales.push(pulse, pulse, pulse)
        break

      default:
        positions.push(0, 0, 0)
        scales.push(1, 1, 1)
    }

    // Rotation animation
    const rotSpeed = particleSpeed * 2
    rotations.push(
      0,
      Math.sin(progress * Math.PI * rotSpeed),
      0,
      Math.cos(progress * Math.PI * rotSpeed)
    )
  })

  return { positions, rotations, scales, times: timeSteps }
}

export const generateVFXGLTF = (params) => {
  const {
    effectType,
    particleCount,
    particleSize,
    primaryColor,
    secondaryColor,
    glowIntensity
  } = params

  // Base GLTF structure
  const gltf = {
    asset: {
      version: "2.0",
      generator: "GLTF VFX Generator"
    },
    scene: 0,
    scenes: [
      {
        name: `${effectType}-effect`,
        nodes: [0]
      }
    ],
    nodes: [],
    meshes: [],
    materials: [],
    textures: [],
    images: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
    animations: []
  }

  // Create particle group node
  const particleGroupNode = {
    name: `${effectType}_vfx`,
    children: []
  }

  // Generate particles
  const vertices = generateCubeVertices(particleSize)
  const normals = generateCubeNormals()
  const uvs = generateCubeUVs()
  const indices = generateCubeIndices()

  // Create material
  const primaryRgb = hexToRgb(primaryColor)
  const secondaryRgb = hexToRgb(secondaryColor)
  
  gltf.materials.push({
    name: `${effectType}_material`,
    pbrMetallicRoughness: {
      baseColorFactor: [primaryRgb.r, primaryRgb.g, primaryRgb.b, 1],
      metallicFactor: 0.3,
      roughnessFactor: 0.4
    },
    emissiveFactor: [
      primaryRgb.r * glowIntensity,
      primaryRgb.g * glowIntensity,
      primaryRgb.b * glowIntensity
    ]
  })

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    const useSecondaryColor = Math.random() > 0.5
    const color = useSecondaryColor ? secondaryRgb : primaryRgb

    // Create mesh for this particle
    const meshIndex = gltf.meshes.length
    gltf.meshes.push({
      name: `particle_${i}`,
      primitives: [{
        attributes: {
          POSITION: gltf.accessors.length,
          NORMAL: gltf.accessors.length + 1,
          TEXCOORD_0: gltf.accessors.length + 2
        },
        indices: gltf.accessors.length + 3,
        material: 0
      }]
    })

    // Add accessors for this mesh
    gltf.accessors.push(
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
        type: "SCALAR"
      }
    )

    // Create node for this particle
    const particleNode = {
      name: `particle_${i}`,
      mesh: meshIndex,
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1]
    }

    const nodeIndex = gltf.nodes.length
    gltf.nodes.push(particleNode)
    particleGroupNode.children.push(nodeIndex)

    // Generate animation for this particle
    const animation = generateAnimationKeyframes(params, i, particleCount)
    
    // Add animation samplers and channels
    if (!gltf.animations[0]) {
      gltf.animations.push({
        name: "effect_animation",
        samplers: [],
        channels: []
      })
    }

    const animIndex = gltf.animations[0].samplers.length

    // Add samplers for position, rotation, scale
    gltf.animations[0].samplers.push(
      {
        input: gltf.accessors.length,
        output: gltf.accessors.length + 1,
        interpolation: "LINEAR"
      },
      {
        input: gltf.accessors.length,
        output: gltf.accessors.length + 2,
        interpolation: "LINEAR"
      },
      {
        input: gltf.accessors.length,
        output: gltf.accessors.length + 3,
        interpolation: "LINEAR"
      }
    )

    // Add channels
    gltf.animations[0].channels.push(
      {
        sampler: animIndex,
        target: { node: nodeIndex, path: "translation" }
      },
      {
        sampler: animIndex + 1,
        target: { node: nodeIndex, path: "rotation" }
      },
      {
        sampler: animIndex + 2,
        target: { node: nodeIndex, path: "scale" }
      }
    )

    // Add animation accessors (placeholder - would need actual buffer data)
    gltf.accessors.push(
      {
        componentType: 5126,
        count: animation.times.length,
        type: "SCALAR"
      },
      {
        componentType: 5126,
        count: animation.positions.length / 3,
        type: "VEC3"
      },
      {
        componentType: 5126,
        count: animation.rotations.length / 4,
        type: "VEC4"
      },
      {
        componentType: 5126,
        count: animation.scales.length / 3,
        type: "VEC3"
      }
    )
  }

  // Add particle group as root node
  gltf.nodes.unshift(particleGroupNode)

  // Note: In a production version, you would need to generate actual binary buffer data
  // For this demo, we're creating a valid GLTF structure that can be used as a template
  gltf.buffers.push({
    byteLength: 0,
    uri: `data:application/octet-stream;base64,`
  })

  return gltf
}
