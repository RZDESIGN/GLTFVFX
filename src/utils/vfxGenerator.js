import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { buildParticleSystemBlueprint } from './effectBlueprint'
import { generateBlockyTexture, createTextureFromDataURL, disposeTexture } from './textureGenerator'

const createGeometryFromConfig = (config = {}) => {
  switch (config.type) {
    case 'sphere':
      return new THREE.SphereGeometry(
        0.5,
        config.widthSegments ?? 16,
        config.heightSegments ?? 12
      )
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.5, config.detail ?? 0)
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.5, config.detail ?? 0)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(0.5, config.detail ?? 0)
    case 'plane':
      return new THREE.PlaneGeometry(1, 1)
    case 'cylinder': {
      const topRadius = config.topRadius ?? 0.2
      const bottomRadius = config.bottomRadius ?? topRadius
      const height = config.height ?? 1
      const radialSegments = config.radialSegments ?? 12
      const openEnded = config.openEnded ?? false
      return new THREE.CylinderGeometry(
        topRadius,
        bottomRadius,
        height,
        radialSegments,
        1,
        openEnded
      )
    }
    case 'box':
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

const createMaterialForParticle = (style, state, mapTexture) => {
  const color = new THREE.Color(state.color)

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color.clone(),
    emissiveIntensity: state.emissiveIntensity,
    metalness: style.metalness ?? 0.2,
    roughness: style.roughness ?? 0.5,
    transparent: style.alphaMode === 'BLEND',
    opacity: state.opacity,
    depthWrite: style.depthWrite ?? true
  })

  material.side = THREE.DoubleSide
  if (mapTexture) {
    material.map = mapTexture
    material.needsUpdate = true
  }
  return material
}

const buildExportScene = (params, mapTexture) => {
  const blueprint = buildParticleSystemBlueprint(params)
  const { style, particles, keyframeTimes } = blueprint

  const scene = new THREE.Scene()
  const root = new THREE.Group()
  root.name = `${params.effectType}_root`

  const geometry = createGeometryFromConfig(style.geometry)
  geometry.computeVertexNormals()

  const materials = []
  const tracks = []
  const times = Array.from(keyframeTimes)

  particles.forEach(state => {
    const material = createMaterialForParticle(style, state, mapTexture)
    materials.push(material)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `Particle_${state.index}`
    mesh.position.set(
      state.initialPosition.x,
      state.initialPosition.y,
      state.initialPosition.z
    )
    mesh.scale.set(state.scale.x, state.scale.y, state.scale.z)
    mesh.material.emissiveIntensity = state.emissiveIntensity
    root.add(mesh)

    const positions = Array.from(state.keyframes.positions)
    const rotations = Array.from(state.keyframes.rotations)
    const scales = Array.from(state.keyframes.scales)
    const colors = state.keyframes.colors
      ? Array.from(state.keyframes.colors)
      : null

    tracks.push(
      new THREE.VectorKeyframeTrack(
        `${mesh.name}.position`,
        times,
        positions
      )
    )
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        `${mesh.name}.quaternion`,
        times,
        rotations
      )
    )
    tracks.push(
      new THREE.VectorKeyframeTrack(
        `${mesh.name}.scale`,
        times,
        scales
      )
    )

    if (colors) {
      tracks.push(
        new THREE.ColorKeyframeTrack(
          `${mesh.name}.material.color`,
          times,
          colors
        )
      )
      tracks.push(
        new THREE.ColorKeyframeTrack(
          `${mesh.name}.material.emissive`,
          times,
          colors
        )
      )
    }
  })

  scene.add(root)
  scene.updateMatrixWorld(true)

  const duration = times[times.length - 1] || params.lifetime
  const clip = new THREE.AnimationClip(
    `${params.effectType}_animation`,
    duration,
    tracks
  )
  clip.optimize()

  return {
    scene,
    geometry,
    materials,
    clip,
    style
  }
}

export const generateVFXGLTF = async (params) => {
  let mapTexture = null
  try {
    if (params.textureMode === 'auto') {
      mapTexture = generateBlockyTexture(
        params.primaryColor,
        params.secondaryColor,
        params.textureResolution || 16
      )
    } else if (params.textureMode === 'custom' && params.customTexture) {
      mapTexture = await createTextureFromDataURL(params.customTexture)
    }
  } catch (_) {
    mapTexture = null
  }

  const { scene, geometry, materials, clip, style } = buildExportScene(params, mapTexture)
  const exporter = new GLTFExporter()

  try {
    const gltf = await exporter.parseAsync(scene, {
      animations: [clip],
      binary: false,
      trs: true
    })

    if (!gltf.asset) {
      gltf.asset = { version: '2.0' }
    }
    gltf.asset.generator = 'GLTF VFX Generator'

    if (Array.isArray(gltf.scenes) && gltf.scenes[0]) {
      gltf.scenes[0].name = `${params.effectType}_scene`
    }

    if (Array.isArray(gltf.animations) && gltf.animations[0]) {
      gltf.animations.forEach((animation, index) => {
        animation.name = `${params.effectType}_animation${gltf.animations.length > 1 ? `_${index}` : ''}`
        animation.extras = {
          ...(animation.extras || {}),
          loop: true,
          playMode: 'loop'
        }
        animation.channels?.forEach(channel => {
          channel.extras = {
            ...(channel.extras || {}),
            loop: true
          }
        })
        animation.samplers?.forEach(sampler => {
          sampler.extras = {
            ...(sampler.extras || {}),
            loop: true
          }
        })
      })
    }

    if (Array.isArray(gltf.nodes)) {
      gltf.nodes.forEach(node => {
        if (node.name === `${params.effectType}_root`) {
          node.extras = {
            ...(node.extras || {}),
            effectType: params.effectType
          }
        }
      })
    }

    gltf.extras = {
      ...(gltf.extras || {}),
      parameters: {
        effectType: params.effectType,
        particleCount: params.particleCount,
        particleSize: params.particleSize,
        particleSpeed: params.particleSpeed,
        spread: params.spread,
        emissionShape: params.emissionShape,
        animationType: params.animationType,
        glowIntensity: params.glowIntensity,
        colorMode: style?.colorMode ?? 'mix',
        colorGradient: style?.colorGradient
          ? style.colorGradient.map(stop => ({
              stop: stop.stop ?? stop.t ?? 0,
              color: stop.color || stop.value || '#ffffff'
            }))
          : null,
        colorGradientSource: style?.colorGradientSource ?? 'random',
        colorGradientPlayback: style?.colorGradientPlayback ?? 'static',
        colorGradientSpeed: style?.colorGradientSpeed ?? 0,
        lifetime: params.lifetime,
        emissionSurfaceOnly: !!params.emissionSurfaceOnly,
        emissionOffset: params.emissionOffset || { x: 0, y: 0, z: 0 },
        motionDirectionMode: params.motionDirectionMode || 'outwards',
        motionDirection: params.motionDirection || { x: 0, y: 1, z: 0 },
        motionAcceleration: params.motionAcceleration || { x: 0, y: 0, z: 0 },
        useArcEmitter: !!(params.useArcEmitter ?? (style?.customEmitter === 'rainbowArc')),
        arcRadius: params.arcRadius ?? style?.arcRadius ?? null,
        arcStartAngle: params.arcStartAngle ?? style?.arcStartAngle ?? null,
        arcEndAngle: params.arcEndAngle ?? style?.arcEndAngle ?? null,
        arcThickness: params.arcThickness ?? style?.arcThickness ?? null,
        arcHeightOffset: params.arcHeightOffset ?? style?.arcHeightOffset ?? null,
        arcFlowSpeed: params.arcFlowSpeed ?? style?.arcFlowSpeed ?? null,
        arcFlowMode: params.arcFlowMode ?? style?.arcFlowMode ?? 'continuous',
        arcConfig: style?.customEmitter === 'rainbowArc'
          ? {
              radius: style.arcRadius ?? null,
              startAngle: style.arcStartAngle ?? null,
              endAngle: style.arcEndAngle ?? null,
              thickness: style.arcThickness ?? null,
              heightOffset: style.arcHeightOffset ?? null,
              flowSpeed: style.arcFlowSpeed ?? null,
              flowMode: style.arcFlowMode ?? 'continuous',
              layers: Array.isArray(style.arcLayers) ? style.arcLayers : null
            }
          : null
      }
    }

    return gltf
  } finally {
    geometry.dispose()
    materials.forEach(material => material.dispose())
    scene.clear()
    if (mapTexture) {
      disposeTexture(mapTexture)
    }
  }
}
