/**
 * Character Model Generator - Converts AI specs into GLTF models
 */

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { generateBlockyTexture } from './textureGenerator'

/**
 * Create a voxel-style character mesh from specification
 * @param {Object} spec - Character specification from AI
 * @returns {THREE.Group} Character group with all body parts
 */
export function createCharacterMesh(spec) {
  const characterGroup = new THREE.Group()
  characterGroup.name = spec.name || 'character'

  const bodyPartMeshes = {}
  // Shared blocky texture based on theme colors
  let sharedTexture = null
  try {
    const primary = spec.baseColor || '#8e8e8e'
    const secondary = spec.accentColor || '#555555'
    const baseResolution = Number.isFinite(spec.textureResolution) ? spec.textureResolution : 32
    const baseCells = Number.isFinite(spec.textureCellsPerSide) ? spec.textureCellsPerSide : 6
    const baseNoise = typeof spec.textureNoiseAmount === 'number' ? spec.textureNoiseAmount : 0.06
    sharedTexture = generateBlockyTexture(primary, secondary, baseResolution, {
      cellsPerSide: baseCells,
      noiseAmount: baseNoise
    })
  } catch (_) {}

  // Create each body part
  spec.bodyParts.forEach((part) => {
    const [width, height, depth] = part.size
    const geometry = new THREE.BoxGeometry(width, height, depth)
    
    // Parse color
    const color = new THREE.Color(part.color || spec.baseColor || '#888888')
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.1,
      roughness: 0.9,
      flatShading: true
    })
    if (sharedTexture) {
      // Allow per-part texture overrides
      const primary = spec.baseColor || '#8e8e8e'
      const secondary = spec.accentColor || '#555555'
      let tex = sharedTexture
      if (part.texture && (part.texture.resolution || part.texture.cellsPerSide || typeof part.texture.noiseAmount === 'number')) {
        const res = part.texture.resolution || (spec.textureResolution || 32)
        const cells = part.texture.cellsPerSide ?? (spec.textureCellsPerSide ?? 6)
        const noise = typeof part.texture.noiseAmount === 'number' ? part.texture.noiseAmount : (typeof spec.textureNoiseAmount === 'number' ? spec.textureNoiseAmount : 0.06)
        tex = generateBlockyTexture(primary, secondary, res, {
          cellsPerSide: cells,
          noiseAmount: noise
        })
      }
      material.map = tex
      // UV tiling: tile based on part size and desired voxel size or uvScale override
      const uvScale = Array.isArray(part.texture?.uvScale) ? part.texture.uvScale : null
      const targetVoxel = Number.isFinite(part.detail?.voxelSize) ? part.detail.voxelSize :
        (Number.isFinite(spec.voxelSize) ? spec.voxelSize : 0.08)
      const repeatU = uvScale ? uvScale[0] : Math.max(1, Math.round((width) / Math.max(0.02, targetVoxel)))
      const repeatV = uvScale ? uvScale[1] : Math.max(1, Math.round((height) / Math.max(0.02, targetVoxel)))
      if (material.map) {
        material.map.repeat.set(repeatU, repeatV)
      }
      material.needsUpdate = true
    }
    material.side = THREE.DoubleSide

    // Create a pivot group to support proper rotations
    const group = new THREE.Group()
    group.name = part.name
    const pivot = Array.isArray(part.pivot) ? part.pivot : [0, 0, 0]
    group.position.set(pivot[0] || 0, pivot[1] || 0, pivot[2] || 0)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `${part.name}_mesh`

    // Position mesh relative to the pivot so world position remains at part.position
    const [x, y, z] = part.position
    mesh.position.set((x || 0) - (pivot[0] || 0), (y || 0) - (pivot[1] || 0), (z || 0) - (pivot[2] || 0))

    group.add(mesh)

    characterGroup.add(group)
    bodyPartMeshes[part.name] = group
  })

  characterGroup.userData.bodyParts = bodyPartMeshes

  return characterGroup
}

/**
 * Create animation tracks for the character
 * @param {Object} spec - Character specification
 * @param {Object} bodyPartMeshes - Map of body part names to meshes
 * @returns {Array<THREE.AnimationClip>} Animation clips
 */
export function createCharacterAnimations(spec, bodyPartMeshes) {
  const clips = []

  if (!spec.animations || !Array.isArray(spec.animations)) {
    return clips
  }

  spec.animations.forEach((animSpec) => {
    const tracks = []

    // Group keyframes by body part
    const keyframesByPart = {}
    animSpec.keyframes.forEach((kf) => {
      if (!keyframesByPart[kf.bodyPart]) {
        keyframesByPart[kf.bodyPart] = []
      }
      keyframesByPart[kf.bodyPart].push(kf)
    })

    // Create tracks for each body part
    Object.entries(keyframesByPart).forEach(([partName, keyframes]) => {
      const mesh = bodyPartMeshes[partName]
      if (!mesh) return

      // Sort keyframes by time
      keyframes.sort((a, b) => a.time - b.time)

      const times = keyframes.map(kf => kf.time)
      
      // Position track (if specified)
      if (keyframes.some(kf => kf.position)) {
        const positions = []
        keyframes.forEach(kf => {
          if (kf.position) {
            positions.push(...kf.position)
          } else {
            // Use current position
            positions.push(mesh.position.x, mesh.position.y, mesh.position.z)
          }
        })
        
        const positionTrack = new THREE.VectorKeyframeTrack(
          `${mesh.name}.position`,
          times,
          positions
        )
        tracks.push(positionTrack)
      }

      // Rotation track (if specified)
      if (keyframes.some(kf => kf.rotation)) {
        const rotations = []
        keyframes.forEach(kf => {
          if (kf.rotation) {
            const [x, y, z] = kf.rotation
            const quat = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(x, y, z, 'XYZ')
            )
            rotations.push(quat.x, quat.y, quat.z, quat.w)
          } else {
            // Use identity rotation
            rotations.push(0, 0, 0, 1)
          }
        })
        
        const rotationTrack = new THREE.QuaternionKeyframeTrack(
          `${mesh.name}.quaternion`,
          times,
          rotations
        )
        tracks.push(rotationTrack)
      }

      // Scale track (if specified)
      if (keyframes.some(kf => kf.scale)) {
        const scales = []
        keyframes.forEach(kf => {
          if (kf.scale) {
            scales.push(...kf.scale)
          } else {
            scales.push(1, 1, 1)
          }
        })
        
        const scaleTrack = new THREE.VectorKeyframeTrack(
          `${mesh.name}.scale`,
          times,
          scales
        )
        tracks.push(scaleTrack)
      }
    })

    if (tracks.length > 0) {
      const clip = new THREE.AnimationClip(animSpec.name, animSpec.duration || -1, tracks)
      clips.push(clip)
    }
  })

  return clips
}

/**
 * Generate complete GLTF from character specification
 * @param {Object} spec - Character specification from AI
 * @returns {Promise<Object>} GLTF JSON data
 */
export async function generateCharacterGLTF(spec) {
  return new Promise((resolve, reject) => {
    try {
      const scene = new THREE.Scene()
      
      // Create character mesh
      const characterGroup = createCharacterMesh(spec)
      scene.add(characterGroup)

      // Create animations
      const animations = createCharacterAnimations(spec, characterGroup.userData.bodyParts)

      // Add lighting for preview (won't be exported)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(5, 10, 5)
      scene.add(ambientLight)
      scene.add(directionalLight)

      // Export to GLTF
      const exporter = new GLTFExporter()
      
      exporter.parse(
        scene,
        (gltf) => {
          // Add animations to GLTF
          if (animations.length > 0) {
            gltf.animations = gltf.animations || []
            animations.forEach(clip => {
              // Convert THREE.AnimationClip to GLTF animation format
              const gltfAnimation = {
                name: clip.name,
                channels: [],
                samplers: []
              }
              
              clip.tracks.forEach((track, trackIndex) => {
                // Add sampler
                gltfAnimation.samplers.push({
                  input: trackIndex * 2,
                  output: trackIndex * 2 + 1,
                  interpolation: 'LINEAR'
                })
                
                // Add channel
                const targetPath = track.name.split('.').pop()
                gltfAnimation.channels.push({
                  sampler: trackIndex,
                  target: {
                    node: 0, // Will be updated properly by exporter
                    path: targetPath
                  }
                })
              })
              
              gltf.animations.push(gltfAnimation)
            })
          }

          resolve(gltf)
        },
        (error) => {
          reject(error)
        },
        {
          binary: false,
          trs: true,
          animations: animations
        }
      )

    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Preview helper - creates a Three.js scene for the character
 * @param {Object} spec - Character specification
 * @returns {Object} { scene, camera, mixer }
 */
export function createCharacterPreview(spec) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  // Create character
  const characterGroup = createCharacterMesh(spec)
  scene.add(characterGroup)

  // Create animations
  const animations = createCharacterAnimations(spec, characterGroup.userData.bodyParts)
  
  // Setup animation mixer
  let mixer = null
  if (animations.length > 0) {
    mixer = new THREE.AnimationMixer(characterGroup)
    // Play first animation by default
    const action = mixer.clipAction(animations[0])
    action.play()
  }

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7)
  directionalLight.castShadow = true
  
  const backLight = new THREE.DirectionalLight(0x6666ff, 0.3)
  backLight.position.set(-5, 5, -5)

  scene.add(ambientLight)
  scene.add(directionalLight)
  scene.add(backLight)

  // Helpers to match VFX viewer's spatial context
  const gridHelper = new THREE.GridHelper(6, 12, 0xdddddd, 0xaaaaaa)
  gridHelper.material.opacity = 0.35
  gridHelper.material.transparent = true
  scene.add(gridHelper)

  const axesHelper = new THREE.AxesHelper(2.5)
  scene.add(axesHelper)

  // Setup camera
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(2, 1.5, 3)
  camera.lookAt(0, 0.5, 0)

  return {
    scene,
    camera,
    mixer,
    characterGroup,
    animations
  }
}

