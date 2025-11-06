import * as THREE from 'three'

const TWO_PI = Math.PI * 2
const VOXEL_GEOMETRY = new THREE.BoxGeometry(1, 1, 1)

export function generateVFX(config) {
  const group = new THREE.Group()
  group.name = `vfx-${config.type}`
  const effects = {
    aura: createAuraEffect,
    'dark-gas': createDarkGasEffect,
    'fire-aoe': createFireAOEEffect,
    'fire-particle': createFireParticleEffect,
    'fire-rain': createFireRainEffect,
    'fire-tornado': createFireTornadoEffect,
    flamethrower: createFlamethrowerEffect,
    'forward-blast': createForwardBlastEffect,
    fireball: createFireballEffect,
    'gas-explode': createGasExplodeEffect,
    'glow-gas': createGlowGasEffect,
    'ground-explode': createGroundExplodeEffect,
    ice: createIceEffect,
    'ice-aoe': createIceAOEEffect,
    impact: createImpactEffect,
    'ground-smash': createGroundSmashEffect,
    'large-spider-web': createLargeSpiderWebEffect,
    'purple-gas': createPurpleGasEffect,
    tornado: createTornadoEffect,
    sparkles: createSparklesEffect,
    smoke: createSmokeEffect,
    'smoke-puff': createSmokePuffEffect,
    'spider-web': createSpiderWebEffect,
    'stone-eruption': createStoneEruptionEffect,
    'energy-beam': createEnergyBeamEffect,
  }

  const effectFn = effects[config.type] || createAuraEffect
  const clips = effectFn(group, config) || []

  group.animations = Array.isArray(clips)
    ? clips.filter((clip) => clip instanceof THREE.AnimationClip)
    : clips instanceof THREE.AnimationClip
      ? [clips]
      : []

  return group
}
function createAuraEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'aura_root'
  group.add(root)

  const core = new THREE.Group()
  core.name = 'aura_core'
  root.add(core)

  const pillars = new THREE.Group()
  pillars.name = 'aura_pillars'
  root.add(pillars)

  const sparks = new THREE.Group()
  sparks.name = 'aura_sparks'
  root.add(sparks)

  const baseSize = Math.max(0.09, config.size * 1.4)
  const auraHeight = 3 + config.spread * 2.5
  const coreSegments = clampCount(Math.round(config.particleCount * 0.45), 24, 80)
  const coreStep = auraHeight / coreSegments

  for (let i = 0; i < coreSegments; i++) {
    const flare = 1 + Math.sin(i * 0.4) * 0.4
    const voxel = createVoxel(i % 3 === 0 ? accent : primary, {
      scale: [
        baseSize * (0.7 + flare * 0.4),
        baseSize * 1.8,
        baseSize * (0.7 + flare * 0.4),
      ],
      position: [
        rand(-baseSize * 0.3, baseSize * 0.3),
        i * coreStep,
        rand(-baseSize * 0.3, baseSize * 0.3),
      ],
      name: `aura_core_${i}`,
    })
    core.add(voxel)
  }

  const pillarCount = clampCount(Math.round(6 + config.spread * 3), 8, 16)
  const ringRadius = 1.2 + config.spread * 0.9
  const pillarHeightSegments = 5 + Math.floor(config.glowIntensity * 1.5)

  for (let i = 0; i < pillarCount; i++) {
    const pillar = new THREE.Group()
    pillar.name = `aura_pillar_${i}`
    const angle = (i / pillarCount) * TWO_PI
    pillar.position.set(
      Math.cos(angle) * ringRadius,
      0,
      Math.sin(angle) * ringRadius,
    )

    for (let j = 0; j < pillarHeightSegments; j++) {
      const taper = 1 + j * 0.25
      const voxel = createVoxel(j % 2 === 0 ? secondary : accent, {
        scale: [
          baseSize * (1 + j * 0.15),
          baseSize * 2.1,
          baseSize * (0.9 + j * 0.2),
        ],
        position: [
          rand(-baseSize * 0.35, baseSize * 0.35),
          j * baseSize * 1.8,
          rand(-baseSize * 0.35, baseSize * 0.35),
        ],
        name: `aura_pillar_voxel_${i}_${j}`,
      })
      pillar.add(voxel)
    }

    pillars.add(pillar)
  }

  const sparkCount = clampCount(config.particleCount, 40, 140)
  for (let i = 0; i < sparkCount; i++) {
    const spark = createVoxel(i % 5 === 0 ? accent : secondary, {
      scale: [
        baseSize * rand(0.4, 0.8),
        baseSize * rand(0.7, 1.3),
        baseSize * rand(0.4, 0.8),
      ],
      position: [
        rand(-ringRadius * 0.6, ringRadius * 0.6),
        rand(0, auraHeight * 1.1),
        rand(-ringRadius * 0.6, ringRadius * 0.6),
      ],
      name: `aura_spark_${i}`,
    })
    sparks.add(spark)
  }

  const duration = Math.max(3.5, config.lifetime)
  const tracks = []

  tracks.push(createYRotationTrack(
    root.name,
    [0, duration],
    [0, TWO_PI * 0.5]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${root.name}.scale`,
    [0, duration * 0.5, duration],
    [
      0.95, 0.95, 0.95,
      1.15, 1.25, 1.15,
      0.95, 0.95, 0.95,
    ]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${core.name}.scale`,
    [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
    [
      1, 1, 1,
      1.05, 1.4, 1.05,
      1, 1, 1,
      0.95, 1.25, 0.95,
    ]
  ))

  pillars.children.forEach((pillar, index) => {
    const lift = baseSize * (6 + index * 0.4)
    const sway = ringRadius * 0.12
    const baseX = pillar.position.x
    const baseZ = pillar.position.z

    tracks.push(createPositionTrack(
      pillar.name,
      [0, duration * 0.3, duration * 0.6, duration],
      [
        { x: baseX, y: 0, z: baseZ },
        { x: baseX + sway, y: lift, z: baseZ - sway },
        { x: baseX - sway, y: lift * 0.45, z: baseZ + sway },
        { x: baseX, y: 0, z: baseZ },
      ]
    ))

    tracks.push(new THREE.VectorKeyframeTrack(
      `${pillar.name}.scale`,
      [0, duration * 0.5, duration],
      [
        1, 1, 1,
        1.15, 1.5 + index * 0.05, 1.15,
        1, 1, 1,
      ]
    ))
  })

  tracks.push(new THREE.VectorKeyframeTrack(
    `${sparks.name}.position`,
    [0, duration * 0.5, duration],
    [
      0, 0, 0,
      0, auraHeight * 0.4, 0,
      0, 0, 0,
    ]
  ))

  tracks.push(createYRotationTrack(
    sparks.name,
    [0, duration],
    [0, TWO_PI * 1.5]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${sparks.name}.scale`,
    [0, duration * 0.5, duration],
    [
      0.9, 0.9, 0.9,
      1.3, 1.3, 1.3,
      0.9, 0.9, 0.9,
    ]
  ))

  const clip = new THREE.AnimationClip('aura_powerup', duration, tracks)
  clip.optimize()
  return [clip]
}

function createDarkGasEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'dark_gas_root'
  group.add(root)

  const layerCount = clampCount(Math.round(3 + config.spread * 1.5), 3, 7)
  const baseSize = Math.max(0.08, config.size * 1.1)
  const radiusStep = baseSize * 3.5

  for (let i = 0; i < layerCount; i++) {
    const layer = new THREE.Group()
    layer.name = `dark_gas_layer_${i}`
    layer.position.y = i * baseSize * 0.8
    const radius = radiusStep * (1 + i * 0.6)
    const voxels = clampCount(Math.round(config.particleCount / layerCount), 18, 90)

    for (let j = 0; j < voxels; j++) {
      const angle = (j / voxels) * TWO_PI
      const wobble = Math.sin(angle * 3 + i) * baseSize * 1.3
      const dist = radius + rand(-baseSize * 1.2, baseSize * 1.2)
      const material = j % 6 === 0 ? accent : (j % 2 === 0 ? primary : secondary)
      const voxel = createVoxel(material, {
        scale: [
          baseSize * rand(0.8, 1.4),
          baseSize * rand(0.6, 1.1),
          baseSize * rand(0.8, 1.4),
        ],
        name: `dark_gas_voxel_${i}_${j}`,
        position: [
          Math.cos(angle) * dist,
          wobble,
          Math.sin(angle) * dist,
        ],
      })
      layer.add(voxel)
    }

    root.add(layer)
  }

  const duration = Math.max(4, config.lifetime * 1.5)
  const tracks = []

  root.children.forEach((layer, index) => {
    const direction = index % 2 === 0 ? 1 : -1
    const wobble = baseSize * (1 + index * 0.6)
    tracks.push(createYRotationTrack(
      layer.name,
      [0, duration],
      [0, direction * TWO_PI * (0.25 + index * 0.1)]
    ))

    tracks.push(createPositionTrack(
      layer.name,
      [0, duration * 0.33, duration * 0.66, duration],
      [
        { x: layer.position.x, y: layer.position.y, z: layer.position.z },
        { x: layer.position.x + wobble, y: layer.position.y + wobble * 0.2, z: layer.position.z - wobble },
        { x: layer.position.x - wobble, y: layer.position.y - wobble * 0.2, z: layer.position.z + wobble },
        { x: layer.position.x, y: layer.position.y, z: layer.position.z },
      ]
    ))
  })

  const clip = new THREE.AnimationClip('dark_gas_swirl', duration, tracks)
  clip.optimize()
  return [clip]
}

function createFireAOEEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'fire_aoe_root'
  group.add(root)

  const ring = new THREE.Group()
  ring.name = 'fire_aoe_ring'
  root.add(ring)

  const shards = new THREE.Group()
  shards.name = 'fire_aoe_shards'
  root.add(shards)

  const baseSize = Math.max(0.1, config.size * 1.2)
  const radius = 1.6 + config.spread * 0.7
  const segments = clampCount(config.particleCount, 32, 140)

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * TWO_PI
    const height = rand(-baseSize * 0.4, baseSize * 0.4)
    const voxel = createVoxel(i % 4 === 0 ? accent : primary, {
      scale: [baseSize * 1.2, baseSize * 0.6, baseSize * 1.2],
      position: [
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius,
      ],
      name: `fire_aoe_ring_${i}`,
    })
    ring.add(voxel)

    if (i % 5 === 0) {
      const shard = createVoxel(secondary, {
        scale: [baseSize * 0.6, baseSize * 2.4, baseSize * 0.6],
        position: [
          Math.cos(angle) * (radius * 0.6),
          baseSize * rand(0.4, 1.2),
          Math.sin(angle) * (radius * 0.6),
        ],
        name: `fire_aoe_shard_${i}`,
      })
      shard.rotation.set(rand(-0.2, 0.2), angle, rand(-0.2, 0.2))
      shards.add(shard)
    }
  }

  const duration = Math.max(2.8, config.lifetime)
  const tracks = []

  tracks.push(new THREE.VectorKeyframeTrack(
    `${ring.name}.scale`,
    [0, duration * 0.4, duration],
    [
      0.2, 0.2, 0.2,
      1.4, 1, 1.4,
      0.2, 0.2, 0.2,
    ]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${shards.name}.scale`,
    [0, duration * 0.35, duration * 0.7, duration],
    [
      0.4, 0.4, 0.4,
      1.2, 1.6, 1.2,
      0.7, 0.9, 0.7,
      0.4, 0.4, 0.4,
    ]
  ))

  tracks.push(createYRotationTrack(
    root.name,
    [0, duration],
    [0, TWO_PI * 0.25]
  ))

  const clip = new THREE.AnimationClip('fire_aoe_burst', duration, tracks)
  clip.optimize()
  return [clip]
}

function createFireParticleEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'fire_particle_root'
  group.add(root)

  const clusterCount = 3
  const baseSize = Math.max(0.08, config.size)
  const total = clampCount(config.particleCount, 40, 120)

  for (let c = 0; c < clusterCount; c++) {
    const cluster = new THREE.Group()
    cluster.name = `fire_particle_cluster_${c}`
    const radius = 0.6 + c * 0.3

    for (let i = 0; i < Math.floor(total / clusterCount); i++) {
      const pick = i % 6 === 0 ? accent : (i % 2 === 0 ? primary : secondary)
      const voxel = createVoxel(pick, {
        scale: [
          baseSize * rand(0.6, 1.2),
          baseSize * rand(0.9, 1.6),
          baseSize * rand(0.6, 1.2),
        ],
        position: [
          rand(-radius, radius),
          rand(-radius * 0.3, radius * 1.2),
          rand(-radius, radius),
        ],
        name: `fire_particle_${c}_${i}`,
      })
      cluster.add(voxel)
    }

    root.add(cluster)
  }

  const duration = Math.max(2.5, config.lifetime)
  const tracks = []

  root.children.forEach((cluster, index) => {
    const pulse = 0.8 + index * 0.2
    tracks.push(new THREE.VectorKeyframeTrack(
      `${cluster.name}.scale`,
      [0, duration * 0.4, duration * 0.8, duration],
      [
        0.6, 0.6, 0.6,
        1.1 + pulse, 1.1 + pulse, 1.1 + pulse,
        0.8, 0.8, 0.8,
        0.6, 0.6, 0.6,
      ]
    ))

    tracks.push(createYRotationTrack(
      cluster.name,
      [0, duration],
      [0, TWO_PI * (0.4 + index * 0.1)]
    ))
  })

  const clip = new THREE.AnimationClip('fire_particle_orbit', duration, tracks)
  clip.optimize()
  return [clip]
}

function createFireRainEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'fire_rain_root'
  group.add(root)

  const streakGroup = new THREE.Group()
  streakGroup.name = 'fire_rain_streaks'
  root.add(streakGroup)

  const baseSize = Math.max(0.07, config.size)
  const streaks = clampCount(config.particleCount, 40, 120)
  const spread = Math.max(2, config.spread * 1.8)

  for (let i = 0; i < streaks; i++) {
    const length = baseSize * rand(3.5, 6)
    const voxel = createVoxel(i % 7 === 0 ? accent : (i % 2 === 0 ? primary : secondary), {
      scale: [baseSize * rand(0.4, 0.7), length, baseSize * rand(0.4, 0.7)],
      position: [
        rand(-spread, spread),
        rand(1, 6),
        rand(-spread * 0.6, spread * 0.6),
      ],
      name: `fire_rain_${i}`,
    })
    voxel.rotation.x = rand(0, 0.4)
    streakGroup.add(voxel)
  }

  const duration = Math.max(2.2, config.lifetime)
  const tracks = []

  const dropDistance = 6 + config.spread * 2
  tracks.push(new THREE.VectorKeyframeTrack(
    `${streakGroup.name}.position`,
    [0, duration * 0.5, duration],
    [
      0, dropDistance * 0.5, 0,
      0, -dropDistance * 0.5, 0,
      0, dropDistance * 0.5, 0,
    ]
  ))

  tracks.push(createYRotationTrack(
    root.name,
    [0, duration],
    [0, TWO_PI * 0.2]
  ))

  const clip = new THREE.AnimationClip('fire_rain_loop', duration, tracks)
  clip.optimize()
  return [clip]
}

function createFireTornadoEffect(group, config) {
  const tunedConfig = {
    ...config,
    particleCount: Math.max(config.particleCount, 160),
    spread: Math.max(config.spread, 2.8),
    size: Math.max(0.07, config.size * 0.9),
  }
  return createTornadoEffect(group, tunedConfig)
}

function createFlamethrowerEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'flamethrower_root'
  group.add(root)

  const nozzle = new THREE.Group()
  nozzle.name = 'flamethrower_nozzle'
  root.add(nozzle)

  const stream = new THREE.Group()
  stream.name = 'flamethrower_stream'
  root.add(stream)

  const sparks = new THREE.Group()
  sparks.name = 'flamethrower_sparks'
  root.add(sparks)

  const baseSize = Math.max(0.07, config.size)
  const length = 4 + config.spread * 2
  const segments = clampCount(Math.round(length / (baseSize * 0.8)), 12, 40)

  for (let i = 0; i < segments; i++) {
    const progress = i / segments
    const width = baseSize * (1 + Math.sin(progress * Math.PI) * 2)
    const voxel = createVoxel(progress > 0.6 ? secondary : primary, {
      scale: [width * rand(0.8, 1.2), baseSize * rand(0.7, 1.2), baseSize * 2.2],
      position: [rand(-0.2, 0.2), rand(-0.1, 0.1), -progress * length],
      name: `flamethrower_segment_${i}`,
    })
    voxel.rotation.y = rand(-0.3, 0.3)
    stream.add(voxel)

    if (i % 5 === 0) {
      const spark = createVoxel(accent, {
        scale: [baseSize * 0.5, baseSize * 0.5, baseSize * 1.5],
        position: [rand(-0.3, 0.3), rand(-0.3, 0.3), -(progress * length + rand(0.3, 0.8))],
        name: `flamethrower_spark_${i}`,
      })
      spark.rotation.set(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3))
      sparks.add(spark)
    }
  }

  const duration = Math.max(2.2, config.lifetime)
  const tracks = []

  tracks.push(new THREE.VectorKeyframeTrack(
    `${stream.name}.scale`,
    [0, duration * 0.3, duration * 0.6, duration],
    [
      0.5, 0.5, 0.5,
      1.2, 1.2, 1.2,
      0.8, 0.8, 0.8,
      0.5, 0.5, 0.5,
    ]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${sparks.name}.position`,
    [0, duration * 0.5, duration],
    [
      0, 0, 0,
      0, 0, -length * 0.4,
      0, 0, 0,
    ]
  ))

  const clip = new THREE.AnimationClip('flamethrower_loop', duration, tracks)
  clip.optimize()
  return [clip]
}

function createForwardBlastEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'forward_blast_root'
  group.add(root)

  const cone = new THREE.Group()
  cone.name = 'forward_blast_cone'
  root.add(cone)

  const shards = new THREE.Group()
  shards.name = 'forward_blast_shards'
  root.add(shards)

  const baseSize = Math.max(0.1, config.size * 1.1)
  const length = 3 + config.spread * 2
  const radialSegments = clampCount(Math.round(config.particleCount * 0.4), 20, 90)

  for (let i = 0; i < radialSegments; i++) {
    const angle = (i / radialSegments) * TWO_PI
    const voxel = createVoxel(i % 4 === 0 ? accent : primary, {
      scale: [baseSize * 0.8, baseSize * 0.8, baseSize * 2.2],
      position: [
        Math.cos(angle) * baseSize * rand(0.4, 1.2),
        Math.sin(angle) * baseSize * rand(0.4, 1.2),
        rand(-0.3, 0.3),
      ],
      name: `forward_blast_cone_${i}`,
    })
    voxel.rotation.y = angle
    cone.add(voxel)

    if (i % 6 === 0) {
      const shard = createVoxel(secondary, {
        scale: [baseSize * 0.6, baseSize * 0.6, baseSize * 1.8],
        position: [
          Math.cos(angle) * baseSize * 0.6,
          Math.sin(angle) * baseSize * 0.6,
          -length * 0.5,
        ],
        name: `forward_blast_shard_${i}`,
      })
      shards.add(shard)
    }
  }

  const duration = Math.max(2.4, config.lifetime)
  const tracks = []

  tracks.push(new THREE.VectorKeyframeTrack(
    `${cone.name}.scale`,
    [0, duration * 0.3, duration],
    [
      0.2, 0.2, 0.2,
      1.6, 1.6, 2.5,
      0.2, 0.2, 0.2,
    ]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${root.name}.position`,
    [0, duration * 0.5, duration],
    [
      0, 0, 0,
      0, 0, -length * 0.4,
      0, 0, 0,
    ]
  ))

  const clip = new THREE.AnimationClip('forward_blast', duration, tracks)
  clip.optimize()
  return [clip]
}

function createFireballEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'fireball_root'
  const core = new THREE.Group()
  core.name = 'fireball_core'
  const shell = new THREE.Group()
  shell.name = 'fireball_shell'
  const sparks = new THREE.Group()
  sparks.name = 'fireball_sparks'

  root.add(core)
  root.add(shell)
  root.add(sparks)
  group.add(root)

  const total = clampCount(config.particleCount, 60, 200)
  const baseSize = Math.max(0.08, config.size * 1.1)
  const coreCount = Math.round(total * 0.45)

  for (let i = 0; i < coreCount; i++) {
    const dir = randomUnitVector()
    const radius = rand(0, 0.4)
    const voxel = createVoxel(primary, {
      scale: [baseSize, baseSize, baseSize],
      name: `fireball_core_${i}`,
      position: [dir.x * radius, dir.y * radius, dir.z * radius],
    })
    core.add(voxel)
  }

  for (let i = 0; i < total - coreCount; i++) {
    const dir = randomUnitVector()
    const radius = rand(0.5, 1.2)
    const voxel = createVoxel(secondary, {
      scale: [baseSize * 1.3, baseSize * 1.3, baseSize * 1.3],
      name: `fireball_shell_${i}`,
      position: [dir.x * radius, dir.y * radius, dir.z * radius],
    })
    shell.add(voxel)

    if (i % 6 === 0) {
      const streak = createVoxel(accent, {
        scale: [baseSize * 0.7, baseSize * 2.6, baseSize * 0.7],
        name: `fireball_spark_${sparks.children.length}`,
        position: [dir.x * radius * 1.1, dir.y * radius * 1.1, dir.z * radius * 1.1],
      })
      streak.rotation.set(rand(-0.2, 0.2), rand(-0.2, 0.2), rand(-0.2, 0.2))
      sparks.add(streak)
    }
  }

  const duration = Math.max(2.5, config.lifetime)
  const tracks = []

  tracks.push(new THREE.VectorKeyframeTrack(
    `${root.name}.scale`,
    [0, duration * 0.3, duration * 0.6, duration],
    [
      0.6, 0.6, 0.6,
      1.6, 1.6, 1.6,
      0.9, 0.9, 0.9,
      0.6, 0.6, 0.6,
    ]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${shell.name}.scale`,
    [0, duration * 0.4, duration],
    [
      0.3, 0.3, 0.3,
      1.8, 1.8, 1.8,
      0.3, 0.3, 0.3,
    ]
  ))

  tracks.push(createYRotationTrack(
    root.name,
    [0, duration],
    [0, TWO_PI]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${sparks.name}.position`,
    [0, duration * 0.5, duration],
    [
      0, 0, 0,
      0, baseSize * 6, 0,
      0, 0, 0,
    ]
  ))

  const clip = new THREE.AnimationClip('fireball_burst', duration, tracks)
  clip.optimize()
  return [clip]
}

function createGasExplodeEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'gas_explode_root'
  group.add(root)

  const plumeGroup = new THREE.Group()
  plumeGroup.name = 'gas_explode_plumes'
  root.add(plumeGroup)

  const plumeCount = clampCount(Math.round(5 + config.spread * 1.5), 4, 10)
  const baseSize = Math.max(0.08, config.size * 1.1)

  for (let i = 0; i < plumeCount; i++) {
    const plume = new THREE.Group()
    plume.name = `gas_plume_${i}`
    const angle = (i / plumeCount) * TWO_PI
    const radius = 0.8 + config.spread * 0.6
    plume.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)

    const segments = 6 + Math.floor(config.lifetime)
    for (let j = 0; j < segments; j++) {
      const voxel = createVoxel(j % 3 === 0 ? accent : (j % 2 === 0 ? primary : secondary), {
        scale: [
          baseSize * rand(0.9, 1.6),
          baseSize * rand(0.8, 1.3),
          baseSize * rand(0.9, 1.6),
        ],
        position: [
          rand(-baseSize * 0.5, baseSize * 0.5),
          j * baseSize * 1.2,
          rand(-baseSize * 0.5, baseSize * 0.5),
        ],
        name: `gas_voxel_${i}_${j}`,
      })
      plume.add(voxel)
    }

    plumeGroup.add(plume)
  }

  const shockwave = new THREE.Group()
  shockwave.name = 'gas_shockwave'
  root.add(shockwave)

  const ringSegments = clampCount(config.particleCount, 24, 120)
  for (let i = 0; i < ringSegments; i++) {
    const angle = (i / ringSegments) * TWO_PI
    const voxel = createVoxel(primary, {
      scale: [baseSize * 0.8, baseSize * 0.4, baseSize * 0.8],
      position: [Math.cos(angle), 0, Math.sin(angle)],
      name: `gas_shockwave_voxel_${i}`,
    })
    shockwave.add(voxel)
  }

  const duration = Math.max(3, config.lifetime)
  const tracks = []

  plumeGroup.children.forEach((plume, index) => {
    const lift = baseSize * (6 + index)
    tracks.push(createPositionTrack(
      plume.name,
      [0, duration * 0.4, duration],
      [
        { x: plume.position.x, y: 0, z: plume.position.z },
        { x: plume.position.x * 1.3, y: lift, z: plume.position.z * 1.3 },
        { x: plume.position.x * 0.4, y: 0, z: plume.position.z * 0.4 },
      ]
    ))

    tracks.push(new THREE.VectorKeyframeTrack(
      `${plume.name}.scale`,
      [0, duration * 0.6, duration],
      [
        0.8, 0.8, 0.8,
        1.4, 1.6, 1.4,
        0.5, 0.5, 0.5,
      ]
    ))
  })

  tracks.push(new THREE.VectorKeyframeTrack(
    `${shockwave.name}.scale`,
    [0, duration * 0.3, duration],
    [
      0.2, 0.2, 0.2,
      2.6, 1, 2.6,
      0.2, 0.2, 0.2,
    ]
  ))

  const clip = new THREE.AnimationClip('gas_explode', duration, tracks)
  clip.optimize()
  return [clip]
}

function createGlowGasEffect(group, config) {
  const tuned = {
    ...config,
    particleCount: Math.max(config.particleCount, 110),
    spread: Math.max(config.spread, 2.8),
    glowIntensity: config.glowIntensity + 1.5,
  }
  return createDarkGasEffect(group, tuned)
}

function createPurpleGasEffect(group, config) {
  const tuned = {
    ...config,
    particleCount: Math.max(config.particleCount, 90),
    spread: Math.max(config.spread, 2.2),
    glowIntensity: config.glowIntensity + 0.8,
  }
  return createDarkGasEffect(group, tuned)
}

function createIceEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'ice_root'
  group.add(root)

  const shardCount = clampCount(Math.round(6 + config.spread * 2), 6, 16)
  const baseSize = Math.max(0.07, config.size * 1.1)

  for (let i = 0; i < shardCount; i++) {
    const shard = new THREE.Group()
    shard.name = `ice_shard_${i}`
    const angle = (i / shardCount) * TWO_PI
    const radius = 0.4 + rand(0, config.spread * 0.4)
    shard.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)

    const height = rand(1.8, 3.2)
    const segments = Math.max(4, Math.floor(height / (baseSize * 0.7)))

    for (let j = 0; j < segments; j++) {
      const taper = 1 - j / segments
      const voxel = createVoxel(j % 3 === 0 ? accent : secondary, {
        scale: [
          baseSize * (0.7 + taper * 0.4),
          baseSize * 1.2,
          baseSize * (0.7 + taper * 0.4),
        ],
        position: [
          rand(-baseSize * 0.2, baseSize * 0.2),
          j * baseSize * 1.1,
          rand(-baseSize * 0.2, baseSize * 0.2),
        ],
        name: `ice_voxel_${i}_${j}`,
      })
      shard.add(voxel)
    }

    root.add(shard)
  }

  const duration = Math.max(3, config.lifetime)
  const tracks = []

  root.children.forEach((shard, index) => {
    const twist = (index % 2 === 0 ? 1 : -1) * 0.6
    tracks.push(createYRotationTrack(
      shard.name,
      [0, duration],
      [0, twist]
    ))

    const lift = baseSize * 2.2
    const baseX = shard.position.x
    const baseY = shard.position.y
    const baseZ = shard.position.z
    tracks.push(createPositionTrack(
      shard.name,
      [0, duration * 0.4, duration * 0.8, duration],
      [
        { x: baseX, y: baseY, z: baseZ },
        { x: baseX, y: baseY + lift, z: baseZ },
        { x: baseX, y: baseY, z: baseZ },
        { x: baseX, y: baseY, z: baseZ },
      ]
    ))
  })

  tracks.push(new THREE.VectorKeyframeTrack(
    `${root.name}.scale`,
    [0, duration * 0.5, duration],
    [
      1, 1, 1,
      1.15, 1.2, 1.15,
      1, 1, 1,
    ]
  ))

  const clip = new THREE.AnimationClip('ice_pulse', duration, tracks)
  clip.optimize()
  return [clip]
}

function createIceAOEEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'ice_aoe_root'
  group.add(root)

  const ringCount = clampCount(Math.round(3 + config.spread), 3, 6)
  const baseSize = Math.max(0.09, config.size * 1.1)
  const radiusStep = 1 + config.spread * 0.4

  for (let i = 0; i < ringCount; i++) {
    const ring = new THREE.Group()
    ring.name = `ice_aoe_ring_${i}`
    const radius = radiusStep * (1 + i * 0.8)
    const shards = clampCount(Math.round(config.particleCount / ringCount), 18, 60)

    for (let j = 0; j < shards; j++) {
      const angle = (j / shards) * TWO_PI
      const height = baseSize * rand(3, 5)
      const voxel = createVoxel(j % 4 === 0 ? accent : secondary, {
        scale: [baseSize * 0.6, height, baseSize * 0.6],
        position: [Math.cos(angle) * radius, height * 0.5, Math.sin(angle) * radius],
        name: `ice_aoe_voxel_${i}_${j}`,
      })
      ring.add(voxel)
    }

    root.add(ring)
  }

  const duration = Math.max(3.2, config.lifetime)
  const tracks = []

  root.children.forEach((ring, index) => {
    const scalePeak = 1.2 + index * 0.1
    tracks.push(new THREE.VectorKeyframeTrack(
      `${ring.name}.scale`,
      [0, duration * 0.4, duration * 0.8, duration],
      [
        0.3, 0.3, 0.3,
        scalePeak, scalePeak, scalePeak,
        0.5, 0.5, 0.5,
        0.3, 0.3, 0.3,
      ]
    ))

    tracks.push(createYRotationTrack(
      ring.name,
      [0, duration],
      [0, TWO_PI * (index % 2 === 0 ? 0.2 : -0.2)]
    ))
  })

  const clip = new THREE.AnimationClip('ice_aoe_burst', duration, tracks)
  clip.optimize()
  return [clip]
}

function createGroundSmashEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'ground_root'
  group.add(root)

  const baseSize = Math.max(0.08, config.size * 1.2)
  const ring = new THREE.Group()
  ring.name = 'ground_ring'
  const ringRadius = 1.1 + config.spread * 0.6
  const segments = clampCount(config.particleCount, 18, 80)

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * TWO_PI
    const height = rand(-baseSize * 0.2, baseSize * 0.2)
    const voxel = createVoxel(i % 4 === 0 ? accent : primary, {
      scale: [baseSize * 1.1, baseSize * 0.6, baseSize * 1.1],
      name: `ground_ring_voxel_${i}`,
      position: [
        Math.cos(angle) * ringRadius,
        height,
        Math.sin(angle) * ringRadius,
      ],
    })
    ring.add(voxel)
  }

  root.add(ring)

  const debris = new THREE.Group()
  debris.name = 'ground_debris'
  const debrisChunks = 10

  for (let i = 0; i < debrisChunks; i++) {
    const chunk = new THREE.Group()
    chunk.name = `ground_chunk_${i}`
    const angle = (i / debrisChunks) * TWO_PI
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    chunk.userData.direction = dir
    chunk.position.set(0, baseSize * 0.5, 0)

    for (let j = 0; j < 3; j++) {
      const material = j === 0 ? secondary : primary
      const voxel = createVoxel(material, {
        scale: [baseSize, baseSize, baseSize],
        name: `ground_debris_${i}_${j}`,
        position: [
          rand(-baseSize * 0.3, baseSize * 0.3),
          rand(-baseSize * 0.1, baseSize * 0.6),
          rand(-baseSize * 0.3, baseSize * 0.3),
        ],
      })
      chunk.add(voxel)
    }

    debris.add(chunk)
  }

  root.add(debris)

  const duration = Math.max(2.2, config.lifetime)
  const tracks = []

  tracks.push(new THREE.VectorKeyframeTrack(
    `${ring.name}.scale`,
    [0, duration * 0.3, duration * 0.6, duration],
    [
      0.2, 0.2, 0.2,
      1, 1, 1,
      0.7, 0.7, 0.7,
      0.2, 0.2, 0.2,
    ]
  ))

  debris.children.forEach((chunk) => {
    const out = chunk.userData.direction.clone().multiplyScalar(ringRadius * 1.2 + config.spread)
    const times = [0, duration * 0.4, duration]
    const values = [
      0, baseSize * 0.5, 0,
      out.x, baseSize * 1.8, out.z,
      0, baseSize * 0.5, 0,
    ]
    tracks.push(new THREE.VectorKeyframeTrack(
      `${chunk.name}.position`,
      times,
      values
    ))
  })

  tracks.push(createYRotationTrack(
    root.name,
    [0, duration],
    [0, TWO_PI * 0.25]
  ))

  const clip = new THREE.AnimationClip('ground_smash', duration, tracks)
  clip.optimize()
  return [clip]
}

function createGroundExplodeEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'ground_explode_root'
  group.add(root)

  const spikes = new THREE.Group()
  spikes.name = 'ground_explode_spikes'
  root.add(spikes)

  const debris = new THREE.Group()
  debris.name = 'ground_explode_debris'
  root.add(debris)

  const baseSize = Math.max(0.12, config.size * 1.2)
  const spikeCount = clampCount(Math.round(config.particleCount * 0.35), 12, 36)
  const radius = 0.9 + config.spread * 0.7

  for (let i = 0; i < spikeCount; i++) {
    const spike = new THREE.Group()
    spike.name = `ground_explode_spike_${i}`
    const angle = (i / spikeCount) * TWO_PI
    const height = baseSize * rand(4, 6)
    spike.position.set(Math.cos(angle) * radius, height * 0.5, Math.sin(angle) * radius)
    spike.rotation.y = angle

    const segmentCount = 3
    for (let j = 0; j < segmentCount; j++) {
      const voxel = createVoxel(j === 0 ? accent : primary, {
        scale: [baseSize * 0.8, baseSize * (2.2 - j * 0.4), baseSize * 0.8],
        position: [0, baseSize * j * 0.8, 0],
        name: `ground_explode_spike_voxel_${i}_${j}`,
      })
      spike.add(voxel)
    }

    spikes.add(spike)
  }

  const debrisChunks = clampCount(Math.round(config.particleCount * 0.2), 12, 24)
  for (let i = 0; i < debrisChunks; i++) {
    const chunk = new THREE.Group()
    chunk.name = `ground_explode_chunk_${i}`
    chunk.position.set(rand(-0.6, 0.6), rand(0.1, 0.6), rand(-0.6, 0.6))

    for (let j = 0; j < 3; j++) {
      const voxel = createVoxel(j === 0 ? secondary : primary, {
        scale: [baseSize * rand(0.5, 0.9), baseSize * rand(0.5, 0.9), baseSize * rand(0.5, 0.9)],
        position: [
          rand(-baseSize * 0.3, baseSize * 0.3),
          rand(-baseSize * 0.3, baseSize * 0.3),
          rand(-baseSize * 0.3, baseSize * 0.3),
        ],
        name: `ground_explode_debris_${i}_${j}`,
      })
      chunk.add(voxel)
    }

    debris.add(chunk)
  }

  const duration = Math.max(2.6, config.lifetime)
  const tracks = []

  spikes.children.forEach((spike, index) => {
    const rise = baseSize * (6 + index * 0.2)
    tracks.push(createPositionTrack(
      spike.name,
      [0, duration * 0.4, duration],
      [
        { x: spike.position.x, y: 0, z: spike.position.z },
        { x: spike.position.x * 1.2, y: rise, z: spike.position.z * 1.2 },
        { x: spike.position.x * 0.8, y: 0, z: spike.position.z * 0.8 },
      ]
    ))

    tracks.push(new THREE.VectorKeyframeTrack(
      `${spike.name}.scale`,
      [0, duration * 0.5, duration],
      [
        0.4, 0.4, 0.4,
        1.2, 1.4, 1.2,
        0.4, 0.4, 0.4,
      ]
    ))
  })

  debris.children.forEach((chunk) => {
    const direction = new THREE.Vector3(chunk.position.x, 0.5, chunk.position.z).normalize()
    const distance = 1.6 + config.spread
    tracks.push(new THREE.VectorKeyframeTrack(
      `${chunk.name}.position`,
      [0, duration * 0.6, duration],
      [
        chunk.position.x, chunk.position.y, chunk.position.z,
        direction.x * distance, chunk.position.y + baseSize * 2.4, direction.z * distance,
        chunk.position.x * 0.3, chunk.position.y, chunk.position.z * 0.3,
      ]
    ))
  })

  const clip = new THREE.AnimationClip('ground_explode', duration, tracks)
  clip.optimize()
  return [clip]
}

function createTornadoEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'tornado_root'
  group.add(root)

  const layerCount = clampCount(Math.round(5 + config.spread * 2), 5, 12)
  const baseSize = Math.max(0.07, config.size)
  const heightStep = baseSize * 2.2
  const total = clampCount(config.particleCount, layerCount * 12, 240)

  for (let i = 0; i < layerCount; i++) {
    const layer = new THREE.Group()
    layer.name = `tornado_layer_${i}`
    layer.position.y = i * heightStep
    const radius = baseSize * 3 + i * baseSize * 1.4
    const voxels = Math.max(10, Math.floor(total / layerCount))

    for (let j = 0; j < voxels; j++) {
      const angle = (j / voxels) * TWO_PI
      const lean = rand(-baseSize * 0.4, baseSize * 0.4)
      const material = (i + j) % 4 === 0 ? accent : (j % 2 === 0 ? primary : secondary)
      const voxel = createVoxel(material, {
        scale: [baseSize * 0.8, baseSize * 1.1, baseSize * 0.8],
        name: `tornado_voxel_${i}_${j}`,
        position: [
          Math.cos(angle) * radius,
          lean,
          Math.sin(angle) * radius,
        ],
      })
      layer.add(voxel)
    }

    root.add(layer)
  }

  const duration = Math.max(3, config.lifetime)
  const tracks = []

  root.children.forEach((layer, index) => {
    const direction = index % 2 === 0 ? 1 : -1
    tracks.push(createYRotationTrack(
      layer.name,
      [0, duration],
      [0, direction * TWO_PI * (1 + index * 0.1)]
    ))

    const sway = baseSize * 1.5
    const baseX = layer.position.x
    const baseY = layer.position.y
    const baseZ = layer.position.z
    tracks.push(createPositionTrack(
      layer.name,
      [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
      [
        { x: baseX, y: baseY, z: baseZ },
        { x: baseX + sway, y: baseY, z: baseZ },
        { x: baseX, y: baseY, z: baseZ },
        { x: baseX - sway, y: baseY, z: baseZ },
        { x: baseX, y: baseY, z: baseZ },
      ]
    ))
  })

  tracks.push(createYRotationTrack(
    root.name,
    [0, duration],
    [0, TWO_PI]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${root.name}.position`,
    [0, duration * 0.5, duration],
    [
      0, 0, 0,
      0, baseSize * layerCount * 0.8, 0,
      0, 0, 0,
    ]
  ))

  const clip = new THREE.AnimationClip('tornado_swirl', duration, tracks)
  clip.optimize()
  return [clip]
}

function createSparklesEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'sparkles_root'
  group.add(root)

  const clusterCount = 3
  const baseSize = Math.max(0.06, config.size)
  const total = clampCount(config.particleCount, 30, 160)

  for (let i = 0; i < clusterCount; i++) {
    const cluster = new THREE.Group()
    cluster.name = `sparkles_cluster_${i}`
    const radius = config.spread * 0.6 + 0.5 * (i + 1)

    for (let j = 0; j < Math.floor(total / clusterCount); j++) {
      const voxel = createVoxel(j % 5 === 0 ? accent : (j % 2 === 0 ? primary : secondary), {
        scale: [
          baseSize * rand(0.6, 1.2),
          baseSize * rand(0.6, 1.2),
          baseSize * rand(0.6, 1.2),
        ],
        name: `sparkle_${i}_${j}`,
        position: [
          rand(-radius, radius),
          rand(-radius * 0.5, radius * 0.8),
          rand(-radius, radius),
        ],
      })
      cluster.add(voxel)
    }

    root.add(cluster)
  }

  const duration = Math.max(2.4, config.lifetime)
  const tracks = []

  root.children.forEach((cluster, index) => {
    const pulse = 0.6 + index * 0.2
    tracks.push(new THREE.VectorKeyframeTrack(
      `${cluster.name}.scale`,
      [0, duration * 0.5, duration],
      [
        0.6, 0.6, 0.6,
        1.2 + pulse, 1.2 + pulse, 1.2 + pulse,
        0.6, 0.6, 0.6,
      ]
    ))

    tracks.push(createYRotationTrack(
      cluster.name,
      [0, duration],
      [0, TWO_PI * (0.5 + index * 0.2)]
    ))
  })

  const clip = new THREE.AnimationClip('sparkle_pulse', duration, tracks)
  clip.optimize()
  return [clip]
}

function createSmokeEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'smoke_root'
  group.add(root)

  const plumeCount = clampCount(Math.round(3 + config.spread), 3, 6)
  const baseSize = Math.max(0.07, config.size * 1.1)

  for (let i = 0; i < plumeCount; i++) {
    const plume = new THREE.Group()
    plume.name = `smoke_plume_${i}`
    plume.position.x = rand(-0.4, 0.4)
    plume.position.z = rand(-0.4, 0.4)

    const segments = 5 + Math.floor(config.lifetime)
    for (let j = 0; j < segments; j++) {
      const dim = baseSize * (1 + j * 0.25)
      const voxel = createVoxel(j % 3 === 0 ? accent : secondary, {
        scale: [dim, dim * 0.8, dim],
        name: `smoke_voxel_${i}_${j}`,
        position: [
          rand(-baseSize * 0.3, baseSize * 0.3),
          j * baseSize * 1.1,
          rand(-baseSize * 0.3, baseSize * 0.3),
        ],
      })
      plume.add(voxel)
    }

    root.add(plume)
  }

  const duration = Math.max(3, config.lifetime)
  const tracks = []

  root.children.forEach((plume) => {
    const driftX = plume.position.x + rand(-0.3, 0.3)
    const driftZ = plume.position.z + rand(-0.3, 0.3)
    const rise = baseSize * 6
    tracks.push(new THREE.VectorKeyframeTrack(
      `${plume.name}.position`,
      [0, duration * 0.5, duration],
      [
        plume.position.x, 0, plume.position.z,
        driftX, rise, driftZ,
        plume.position.x, 0, plume.position.z,
      ]
    ))

    tracks.push(createYRotationTrack(
      plume.name,
      [0, duration],
      [0, TWO_PI * 0.25]
    ))
  })

  const clip = new THREE.AnimationClip('smoke_rise', duration, tracks)
  clip.optimize()
  return [clip]
}

function createSmokePuffEffect(group, config) {
  const tuned = {
    ...config,
    particleCount: Math.max(config.particleCount, 60),
    spread: Math.max(config.spread, 1.2),
    lifetime: Math.max(config.lifetime, 2.2),
  }
  return createSmokeEffect(group, tuned)
}

function createImpactEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'impact_root'
  group.add(root)

  const column = new THREE.Group()
  column.name = 'impact_column'
  root.add(column)

  const ring = new THREE.Group()
  ring.name = 'impact_ring'
  root.add(ring)

  const baseSize = Math.max(0.1, config.size * 1.2)
  const height = 3.5 + config.spread * 1.5
  const segments = clampCount(Math.round(height / (baseSize * 0.8)), 12, 36)

  for (let i = 0; i < segments; i++) {
    const voxel = createVoxel(i % 4 === 0 ? accent : primary, {
      scale: [baseSize * rand(0.6, 1.1), baseSize * 1.6, baseSize * rand(0.6, 1.1)],
      position: [rand(-0.3, 0.3), i * baseSize * 0.9, rand(-0.3, 0.3)],
      name: `impact_column_${i}`,
    })
    column.add(voxel)
  }

  const ringSegments = clampCount(config.particleCount, 20, 80)
  const radius = 1.2 + config.spread * 0.5
  for (let i = 0; i < ringSegments; i++) {
    const angle = (i / ringSegments) * TWO_PI
    const voxel = createVoxel(i % 5 === 0 ? accent : secondary, {
      scale: [baseSize * 0.9, baseSize * 0.4, baseSize * 0.9],
      position: [Math.cos(angle) * radius, baseSize * 0.3, Math.sin(angle) * radius],
      name: `impact_ring_${i}`,
    })
    ring.add(voxel)
  }

  const duration = Math.max(2.6, config.lifetime)
  const tracks = []

  tracks.push(new THREE.VectorKeyframeTrack(
    `${column.name}.scale`,
    [0, duration * 0.3, duration * 0.6, duration],
    [
      0.3, 0.3, 0.3,
      1.3, 1.5, 1.3,
      0.6, 0.7, 0.6,
      0.3, 0.3, 0.3,
    ]
  ))

  tracks.push(createPositionTrack(
    column.name,
    [0, duration * 0.5, duration],
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: height * 0.6, z: 0 },
      { x: 0, y: 0, z: 0 },
    ]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${ring.name}.scale`,
    [0, duration * 0.4, duration],
    [
      0.2, 0.2, 0.2,
      1.8, 0.8, 1.8,
      0.2, 0.2, 0.2,
    ]
  ))

  tracks.push(createYRotationTrack(
    ring.name,
    [0, duration],
    [0, TWO_PI * 0.4]
  ))

  const clip = new THREE.AnimationClip('impact_strike', duration, tracks)
  clip.optimize()
  return [clip]
}

function createEnergyBeamEffect(group, config) {
  const { primary, secondary, accent } = createVoxelMaterials(config)
  const root = new THREE.Group()
  root.name = 'beam_root'
  group.add(root)

  const baseSize = Math.max(0.07, config.size)
  const segmentCount = clampCount(Math.round(12 + config.spread * 4), 12, 40)
  const segmentGroup = new THREE.Group()
  segmentGroup.name = 'beam_segments'

  for (let i = 0; i < segmentCount; i++) {
    const voxel = createVoxel(i % 5 === 0 ? accent : (i % 2 === 0 ? primary : secondary), {
      scale: [baseSize * 0.8, baseSize * 0.8, baseSize * 1.4],
      name: `beam_voxel_${i}`,
      position: [
        rand(-baseSize * 0.1, baseSize * 0.1),
        rand(-baseSize * 0.1, baseSize * 0.1),
        -i * baseSize * 2.2,
      ],
    })
    segmentGroup.add(voxel)
  }

  root.add(segmentGroup)

  const halo = new THREE.Group()
  halo.name = 'beam_halo'
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * TWO_PI
    const voxel = createVoxel(accent, {
      scale: [baseSize * 1.2, baseSize * 0.2, baseSize * 1.2],
      name: `beam_halo_${i}`,
      position: [
        Math.cos(angle) * baseSize * 2.5,
        Math.sin(angle) * baseSize * 2.5,
        0,
      ],
    })
    halo.add(voxel)
  }

  root.add(halo)

  const duration = Math.max(2.8, config.lifetime)
  const tracks = []
  const range = baseSize * segmentCount * 2.2

  tracks.push(new THREE.VectorKeyframeTrack(
    `${segmentGroup.name}.position`,
    [0, duration * 0.5, duration],
    [
      0, 0, 0,
      0, 0, -range,
      0, 0, 0,
    ]
  ))

  tracks.push(createYRotationTrack(
    halo.name,
    [0, duration],
    [0, TWO_PI]
  ))

  tracks.push(new THREE.VectorKeyframeTrack(
    `${root.name}.scale`,
    [0, duration * 0.5, duration],
    [
      1, 1, 1,
      1.1, 1.1, 1.1,
      1, 1, 1,
    ]
  ))

  const clip = new THREE.AnimationClip('energy_beam', duration, tracks)
  clip.optimize()
  return [clip]
}

function createVoxelMaterials(config) {
  const primaryColor = new THREE.Color(config.color)
  const secondaryColor = new THREE.Color(config.secondaryColor)
  const emissiveStrength = 0.25 + Math.min(0.6, config.glowIntensity * 0.15)

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: primaryColor,
    emissive: primaryColor.clone().multiplyScalar(emissiveStrength),
    emissiveIntensity: 1 + config.glowIntensity * 0.3,
    metalness: 0.05,
    roughness: 0.75,
    flatShading: true,
    transparent: true,
    opacity: 0.95,
  })

  const primary = baseMaterial

  const secondary = baseMaterial.clone()
  secondary.color.copy(secondaryColor)
  secondary.emissive.copy(secondaryColor.clone().multiplyScalar(emissiveStrength))

  const accent = baseMaterial.clone()
  accent.color.copy(primaryColor.clone().lerp(secondaryColor, 0.35))
  accent.emissive.copy(accent.color.clone().multiplyScalar(emissiveStrength * 1.1))
  accent.opacity = 0.85

  return { primary, secondary, accent }
}

function createVoxel(material, options = {}) {
  const mesh = new THREE.Mesh(VOXEL_GEOMETRY, material)
  const scale = options.scale || [0.2, 0.2, 0.2]
  mesh.scale.set(scale[0], scale[1], scale[2])

  if (options.position) {
    mesh.position.set(options.position[0], options.position[1], options.position[2])
  }

  if (options.rotation) {
    mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2])
  }

  if (options.name) {
    mesh.name = options.name
  }

  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

const tempEuler = new THREE.Euler()
const tempQuaternion = new THREE.Quaternion()

function createYRotationTrack(nodeName, times, angles) {
  const values = []
  angles.forEach((angle) => {
    tempQuaternion.setFromEuler(tempEuler.set(0, angle, 0))
    values.push(tempQuaternion.x, tempQuaternion.y, tempQuaternion.z, tempQuaternion.w)
  })
  return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values)
}

function createPositionTrack(nodeName, times, positions) {
  const values = []
  positions.forEach((pos) => {
    values.push(pos.x, pos.y, pos.z)
  })
  return new THREE.VectorKeyframeTrack(`${nodeName}.position`, times, values)
}

function randomUnitVector() {
  const theta = rand(0, TWO_PI)
  const z = rand(-1, 1)
  const r = Math.sqrt(Math.max(0, 1 - z * z))
  return new THREE.Vector3(
    r * Math.cos(theta),
    z,
    r * Math.sin(theta),
  )
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function clampCount(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
