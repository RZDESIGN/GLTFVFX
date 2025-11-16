import { MOTION_DIRECTION_OPTIONS, TEXTURE_MODE_OPTIONS } from './uiOptions'

const BILLBOARD_FACING_OPTIONS = [
  { value: 'rotate_xyz', label: 'Rotate XYZ' },
  { value: 'rotate_y', label: 'Rotate Y' },
  { value: 'lookat_xyz', label: 'Look at XYZ' },
  { value: 'lookat_y', label: 'Look at Y' },
  { value: 'direction_x', label: 'Direction X' },
  { value: 'direction_y', label: 'Direction Y' },
  { value: 'direction_z', label: 'Direction Z' }
]

const BILLBOARD_DIRECTION_OPTIONS = [
  { value: 'velocity', label: 'Derive From Velocity' },
  { value: 'custom', label: 'Custom Vector' }
]

const EMITTER_RATE_OPTIONS = [
  { value: 'steady', label: 'Steady' },
  { value: 'instant', label: 'Burst' }
]

const EMITTER_LIFETIME_OPTIONS = [
  { value: 'looping', label: 'Looping' },
  { value: 'once', label: 'Once' },
  { value: 'expression', label: 'Expression' }
]

export const PANEL_SECTIONS = [
  {
    id: 'file',
    icon: '📁',
    title: 'File',
    fields: [
      { type: 'text', key: 'effectIdentifier', label: 'Identifier', placeholder: 'namespace:effect' },
      { type: 'textarea', key: 'effectDescription', label: 'Description', placeholder: 'Notes for this effect...' }
    ]
  },
  {
    id: 'particle',
    icon: '⚙️',
    title: 'Particle Settings',
    fields: [
      { type: 'range', key: 'particleCount', label: 'Particle Count', min: 10, max: 200, step: 1 },
      { type: 'range', key: 'particleSize', label: 'Particle Size', min: 0.05, max: 0.5, step: 0.01, decimals: 2 },
      { type: 'range', key: 'particleSpeed', label: 'Particle Speed', min: 0.1, max: 3, step: 0.1, decimals: 1 },
      { type: 'range', key: 'spread', label: 'Spread', min: 0.5, max: 3, step: 0.1, decimals: 1 },
      { type: 'range', key: 'glowIntensity', label: 'Glow Intensity', min: 0.5, max: 5, step: 0.1, decimals: 1 },
      { type: 'range', key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01, decimals: 2 }
    ]
  },
  {
    id: 'colors',
    icon: '🎨',
    title: 'Colors',
    fields: [
      { type: 'color', key: 'primaryColor', label: 'Primary Color' },
      { type: 'color', key: 'secondaryColor', label: 'Secondary Color' }
    ]
  },
  {
    id: 'texture',
    icon: '🧩',
    title: 'Texture & UV',
    customContent: 'texture',
    fields: [
      {
        type: 'select',
        key: 'textureMode',
        label: 'Mode',
        options: TEXTURE_MODE_OPTIONS.map(option => ({ value: option.id, label: option.label }))
      },
      {
        type: 'range',
        key: 'textureResolution',
        label: 'Resolution',
        min: 8,
        max: 64,
        step: 1,
        visibleWhen: (params) => (params.textureMode || 'auto') === 'auto'
      },
      {
        type: 'range',
        key: 'textureBlend',
        label: 'Texture Blend',
        min: 0,
        max: 1,
        step: 0.01,
        decimals: 2,
        visibleWhen: (params) => (params.textureMode || 'auto') !== 'none'
      }
    ]
  },
  {
    id: 'emitter',
    icon: '🎚️',
    title: 'Emitter',
    fields: [
      {
        type: 'select',
        key: 'emitter.rateMode',
        label: 'Rate Mode',
        options: EMITTER_RATE_OPTIONS
      },
      {
        type: 'number',
        key: 'emitter.spawnRate',
        label: 'Spawn Rate',
        min: 0,
        visibleWhen: params => (params.emitter?.rateMode || 'steady') === 'steady'
      },
      {
        type: 'number',
        key: 'emitter.maxParticles',
        label: 'Max Particles',
        min: 1,
        visibleWhen: params => (params.emitter?.rateMode || 'steady') === 'steady'
      },
      {
        type: 'number',
        key: 'emitter.burstAmount',
        label: 'Burst Amount',
        min: 1,
        visibleWhen: params => (params.emitter?.rateMode || 'steady') === 'instant'
      },
      {
        type: 'select',
        key: 'emitter.lifetimeMode',
        label: 'Lifetime Mode',
        options: EMITTER_LIFETIME_OPTIONS
      },
      {
        type: 'number',
        key: 'emitter.activeTime',
        label: 'Active Time',
        min: 0,
        visibleWhen: params => (params.emitter?.lifetimeMode || 'looping') === 'looping'
      },
      {
        type: 'number',
        key: 'emitter.sleepTime',
        label: 'Sleep Time',
        min: 0,
        visibleWhen: params => (params.emitter?.lifetimeMode || 'looping') === 'looping'
      },
      {
        type: 'number',
        key: 'emitter.onceDuration',
        label: 'Duration',
        min: 0,
        visibleWhen: params => (params.emitter?.lifetimeMode || 'looping') === 'once'
      },
      {
        type: 'toggle',
        key: 'emitterSpace.localPosition',
        label: 'Local Position'
      },
      {
        type: 'toggle',
        key: 'emitterSpace.localRotation',
        label: 'Local Rotation'
      },
      {
        type: 'toggle',
        key: 'emitterSpace.localVelocity',
        label: 'Local Velocity'
      }
    ]
  },
  {
    id: 'motion',
    icon: '💨',
    title: 'Motion',
    fields: [
      {
        type: 'select',
        key: 'motionDirectionMode',
        label: 'Direction Mode',
        options: MOTION_DIRECTION_OPTIONS.map(option => ({ value: option.id, label: option.label }))
      },
      {
        type: 'vector',
        key: 'motionDirection',
        label: 'Custom Direction',
        axes: ['x', 'y', 'z'],
        visibleWhen: params => (params.motionDirectionMode || 'outwards') === 'custom'
      },
      {
        type: 'vector',
        key: 'motionAcceleration',
        label: 'Acceleration',
        axes: ['x', 'y', 'z']
      },
      {
        type: 'number',
        key: 'motionDrag',
        label: 'Linear Drag',
        step: 0.01
      }
    ]
  },
  {
    id: 'rotation',
    icon: '🌀',
    title: 'Rotation & Spin',
    fields: [
      {
        type: 'select',
        key: 'rotation.mode',
        label: 'Mode',
        options: [
          { value: 'none', label: 'None' },
          { value: 'dynamic', label: 'Dynamic' }
        ]
      },
      {
        type: 'number',
        key: 'rotation.rate',
        label: 'Rotation Rate',
        visibleWhen: params => (params.rotation?.mode || 'none') === 'dynamic'
      },
      {
        type: 'number',
        key: 'rotation.acceleration',
        label: 'Acceleration',
        visibleWhen: params => (params.rotation?.mode || 'none') === 'dynamic'
      },
      {
        type: 'number',
        key: 'rotation.drag',
        label: 'Drag',
        visibleWhen: params => (params.rotation?.mode || 'none') === 'dynamic'
      }
    ]
  },
  {
    id: 'collision',
    icon: '🧱',
    title: 'Collision',
    fields: [
      { type: 'toggle', key: 'collision.enabled', label: 'Enable Collision' },
      {
        type: 'number',
        key: 'collision.radius',
        label: 'Radius',
        min: 0,
        step: 0.01,
        visibleWhen: params => !!params.collision?.enabled
      },
      {
        type: 'number',
        key: 'collision.drag',
        label: 'Collision Drag',
        visibleWhen: params => !!params.collision?.enabled
      },
      {
        type: 'number',
        key: 'collision.bounciness',
        label: 'Bounciness',
        visibleWhen: params => !!params.collision?.enabled
      },
      {
        type: 'toggle',
        key: 'collision.expireOnContact',
        label: 'Expire on Contact',
        visibleWhen: params => !!params.collision?.enabled
      }
    ]
  },
  {
    id: 'billboard',
    icon: '🧭',
    title: 'Appearance & Facing',
    fields: [
      {
        type: 'select',
        key: 'billboardFacing',
        label: 'Facing Mode',
        options: BILLBOARD_FACING_OPTIONS
      },
      {
        type: 'select',
        key: 'billboardDirectionMode',
        label: 'Direction Mode',
        options: BILLBOARD_DIRECTION_OPTIONS
      },
      {
        type: 'vector',
        key: 'billboardCustomDirection',
        label: 'Custom Direction',
        axes: ['x', 'y', 'z'],
        visibleWhen: params => (params.billboardDirectionMode || 'velocity') === 'custom'
      },
      {
        type: 'number',
        key: 'billboardSpeedThreshold',
        label: 'Min Speed',
        step: 0.01
      }
    ]
  },
  {
    id: 'time',
    icon: '⏱️',
    title: 'Time',
    fields: [
      {
        type: 'range',
        key: 'lifetime',
        label: 'Lifetime (seconds)',
        min: 0.2,
        max: 10,
        step: 0.1,
        decimals: 1
      }
    ]
  }
]
