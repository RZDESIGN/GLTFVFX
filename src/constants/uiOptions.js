export const EMISSION_SHAPE_OPTIONS = [
  { id: 'sphere', name: 'Sphere' },
  { id: 'cone', name: 'Cone' },
  { id: 'ring', name: 'Ring' },
  { id: 'disc', name: 'Disc' },
  { id: 'box', name: 'Box' }
]

export const MOTION_DIRECTION_OPTIONS = [
  { id: 'outwards', label: 'Outwards', vector: { x: 0, y: 1, z: 0 } },
  { id: 'inwards', label: 'Inwards', vector: { x: 0, y: -1, z: 0 } },
  { id: 'custom', label: 'Custom', vector: null }
]

export const ARC_FLOW_MODE_OPTIONS = [
  { id: 'continuous', label: 'Continuous' },
  { id: 'burst', label: 'Burst Loop' }
]

export const TEXTURE_MODE_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'auto', label: 'Auto (blocky)' },
  { id: 'custom', label: 'Custom (upload)' }
]
