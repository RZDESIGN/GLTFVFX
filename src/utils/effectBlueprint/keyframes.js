import { wrap01 } from './math'
import { sampleGradient } from './colors'
import { toVector3 } from './vectors'
import { eulerToQuaternion, normalizeQuaternion } from './orientation'

export const buildAnimationKeyframes = (params, style, state, times) => {
  const positions = new Float32Array(times.length * 3)
  const rotations = new Float32Array(times.length * 4)
  const scales = new Float32Array(times.length * 3)
  const gradientInfo = state.colorGradient
  const colors =
    gradientInfo && gradientInfo.stops && gradientInfo.playback !== 'static'
      ? new Float32Array(times.length * 3)
      : null
  const gradientStops = gradientInfo?.stops || null
  const gradientPlayback = gradientInfo?.playback || 'static'
  const gradientBaseT = gradientInfo?.baseT ?? 0
  const gradientSpeed = gradientInfo?.speed ?? 0
  const gradientSampleOptions = {
    wrap: gradientInfo?.wrap ?? false
  }

  const isRainbowArc = style.customEmitter === 'rainbowArc'
  const arcRange = state.arcRange || {
    start: style.arcStartAngle ?? Math.PI * 0.1,
    end: style.arcEndAngle ?? Math.PI * 0.9
  }
  const arcStartAngle = arcRange.start ?? 0
  const arcEndAngle =
    arcRange.end ?? arcStartAngle + Math.PI * 0.8
  const arcSpan = Math.max(1e-5, arcEndAngle - arcStartAngle)
  const arcRadius = Math.max(
    0.01,
    state.arcRadius ?? style.arcRadius ?? params.spread
  )
  const arcFlowMode = state.arcFlowMode || style.arcFlowMode || 'continuous'
  const arcTravelSpeed = state.arcTravelSpeed ?? (style.arcFlowSpeed ?? 1)
  const arcTravelOffset = state.arcTravelOffset ?? 0
  const arcOffsetVec = state.arcOffset || { x: 0, y: 0, z: 0 }
  const arcLateral = state.arcLateral ?? 0

  const spiralHeight = style.spiralHeight ?? 1
  const riseSpeed = style.riseSpeed ?? 0.5
  const riseHeight = style.riseHeight ?? 3
  const explosionSpread = style.explosionSpread ?? 2
  const explosionShrink = style.explosionShrink ?? 0.85
  const driftStrength = state.driftAmplitude ?? 0
  const pulseBase = style.pulseScaleBase ?? 0.55
  const pulseRange = style.pulseScaleRange ?? 0.75
  const velocityVec = state.velocity || { x: 0, y: 0, z: 0 }
  const accelerationVec = state.acceleration || { x: 0, y: 0, z: 0 }
  const effectiveSpeedMultiplier = Math.max(0, 1 + (state.speedOffset ?? 0))
  const effectiveSpeed = Math.max(0, params.particleSpeed) * effectiveSpeedMultiplier
  const emitterOffset = toVector3(params.emissionOffset)

  const duration = params.lifetime > 0 ? params.lifetime : 1

  for (let i = 0; i < times.length; i++) {
    const time = times[i]
    const elapsed = time
    const progress = duration === 0 ? 0 : Math.min(1, elapsed / duration)
    let x = state.initialPosition.x
    let y = state.initialPosition.y
    let z = state.initialPosition.z

    let scaleX = state.scale.x
    let scaleY = state.scale.y
    let scaleZ = state.scale.z

    if (isRainbowArc) {
      const flowMode = arcFlowMode
      const startX = emitterOffset.x + Math.cos(arcStartAngle) * arcRadius + arcOffsetVec.x
      const startY = emitterOffset.y + Math.sin(arcStartAngle) * arcRadius + arcOffsetVec.y
      const startZ = emitterOffset.z + arcLateral + arcOffsetVec.z

      const endX = emitterOffset.x + Math.cos(arcEndAngle) * arcRadius + arcOffsetVec.x
      const endY = emitterOffset.y + Math.sin(arcEndAngle) * arcRadius + arcOffsetVec.y
      const endZ = emitterOffset.z + arcLateral + arcOffsetVec.z

      if (flowMode === 'continuous') {
        let phaseValue = progress * arcTravelSpeed + arcTravelOffset
        phaseValue = ((phaseValue % 1) + 1) % 1

        const arcAngle = arcStartAngle + phaseValue * arcSpan
        x = emitterOffset.x + Math.cos(arcAngle) * arcRadius + arcOffsetVec.x
        y = emitterOffset.y + Math.sin(arcAngle) * arcRadius + arcOffsetVec.y
        z = emitterOffset.z + arcLateral + arcOffsetVec.z

        if (driftStrength > 0) {
          const drift = driftStrength * 0.25
          const driftAngle = phaseValue * Math.PI * 2 + state.driftPhase
          x += Math.sin(driftAngle) * drift
          z += Math.cos(driftAngle * 0.6) * drift
        }

        const floatWave =
          Math.sin(progress * Math.PI * 2 * (state.floatFrequency || 1) + state.orbitOffset) *
          state.floatStrength *
          0.45
        y += floatWave

        const fadeIn = Math.min(1, phaseValue / 0.08)
        const fadeOut = Math.min(1, (1 - phaseValue) / 0.08)
        const visibility = Math.max(0, Math.min(fadeIn, fadeOut))

        const arcPulse =
          Math.sin(progress * Math.PI * 2 + state.orbitOffset + state.index * 0.18) * 0.2 + 0.9
        const scaleWave = arcPulse * visibility

        scaleX = state.scale.x * scaleWave
        scaleY = state.scale.y * scaleWave
        scaleZ = state.scale.z * scaleWave
      } else {
        const phaseValue = progress * arcTravelSpeed + arcTravelOffset

        if (phaseValue <= 0) {
          x = startX
          y = startY
          z = startZ
          scaleX = scaleY = scaleZ = 0
        } else if (phaseValue >= 1) {
          x = endX
          y = endY
          z = endZ
          scaleX = scaleY = scaleZ = 0
        } else {
          const arcAngle = arcStartAngle + phaseValue * arcSpan
          x = emitterOffset.x + Math.cos(arcAngle) * arcRadius + arcOffsetVec.x
          y = emitterOffset.y + Math.sin(arcAngle) * arcRadius + arcOffsetVec.y
          z = emitterOffset.z + arcLateral + arcOffsetVec.z

          const floatWave =
            Math.sin(progress * Math.PI * 2 * (state.floatFrequency || 1) + state.orbitOffset) *
            state.floatStrength *
            0.45
          y += floatWave

          const fadeIn = Math.min(1, phaseValue / 0.12)
          const fadeOut = Math.min(1, (1 - phaseValue) / 0.12)
          const visibility = Math.max(0, Math.min(fadeIn, fadeOut))

          const arcPulse =
            Math.sin(progress * Math.PI * 2 + state.orbitOffset + state.index * 0.18) * 0.2 + 0.9
          const scaleWave = arcPulse * visibility

          scaleX = state.scale.x * scaleWave
          scaleY = state.scale.y * scaleWave
          scaleZ = state.scale.z * scaleWave
        }
      }
    } else {
      switch (params.animationType) {
        case 'rise': {
          const riseProgress = progress * riseHeight * riseSpeed
          y = state.initialPosition.y + riseProgress

          if (driftStrength > 0) {
            const drift = driftStrength
            const driftAngle = progress * Math.PI * 2 + state.driftPhase
            x += Math.sin(driftAngle) * drift
            z += Math.cos(driftAngle * 0.8) * drift
          }
          break
        }
        case 'explode': {
          const normalized = progress
          const expansion = 1 + normalized * explosionSpread
          x = state.initialPosition.x * expansion
          y = state.initialPosition.y * expansion
          z = state.initialPosition.z * expansion
          const shrink = Math.max(0.12, 1 - normalized * explosionShrink)
          scaleX = state.scale.x * shrink
          scaleY = state.scale.y * shrink
          scaleZ = state.scale.z * shrink
          break
        }
        case 'spiral': {
          const spiralTurns = (style.spiralRevolutions ?? 4.5) * Math.max(0.4, effectiveSpeed * (style.spiralAngularSpeed ?? 1))
          const revolutions = spiralTurns * progress
          const angle = state.orbitOffset + state.swirlPhase + revolutions * Math.PI * 2
          const fractionalRevolution = revolutions - Math.floor(revolutions)

          if (style.customEmitter === 'vortex') {
            const height = style.vortexHeight ?? style.spiralHeight ?? 2
            const drift = style.vortexLayerDrift ?? 0.75
            const totalProgress = (state.layerT ?? 0) + revolutions * drift
            const layerProgress = totalProgress - Math.floor(totalProgress)

            const maxRadius = style.vortexBaseRadius ?? state.baseRadius ?? state.radius
            const minRadius = Math.max(
              0.02,
              style.vortexTipRadius ?? state.tipRadius ?? maxRadius * 0.15
            )
            const falloff = style.vortexRadiusFalloff ?? 1.3
            const radiusRange = Math.max(0.001, maxRadius - minRadius)
            let swirlRadius =
              minRadius + radiusRange * Math.pow(layerProgress, falloff)

            const taper = 1 - (style.spiralTaper ?? 0.35) * (1 - layerProgress)
            swirlRadius *= Math.max(0.25, taper)

            const swayRadius = style.vortexSwayRadius ?? 0
            if (swayRadius > 0) {
              swirlRadius += Math.sin(angle * 0.35 + state.swirlPhase) * swayRadius
            }

            x = emitterOffset.x + Math.cos(angle) * swirlRadius
            z = emitterOffset.z + Math.sin(angle) * swirlRadius
            y = emitterOffset.y - height * 0.5 + layerProgress * height

            const sway = style.vortexSway ?? 0
            if (sway !== 0) {
              y += Math.sin(
                angle * (style.vortexSwaySpeed ?? 1.5) + state.swirlPhase
              ) * sway
            }

            const radialScale = 0.65 + layerProgress * 0.45
            scaleX = state.scale.x * radialScale
            scaleZ = state.scale.z * radialScale
            scaleY = state.scale.y * (0.85 + (1 - layerProgress) * 0.25)
          } else {
            const taper = Math.max(0.2, 1 - fractionalRevolution * (style.spiralTaper ?? 0.3))
            const spiralRadius = state.radius * taper
            x = emitterOffset.x + Math.cos(angle) * spiralRadius
            z = emitterOffset.z + Math.sin(angle) * spiralRadius
            y =
              state.initialPosition.y +
              fractionalRevolution * spiralHeight
          }

          break
        }
        case 'pulse': {
          const cycles = Math.max(1, effectiveSpeed)
          const oscillation =
            Math.sin(progress * Math.PI * 2 * cycles + state.orbitOffset) * 0.5 + 0.5
          const scaleFactor = pulseBase + oscillation * pulseRange
          scaleX = state.scale.x * scaleFactor
          scaleY = state.scale.y * scaleFactor
          scaleZ = state.scale.z * scaleFactor
          break
        }
        case 'orbit':
        default: {
          const orbitTurns = Math.max(1, effectiveSpeed)
          const orbitAngle =
            state.orbitOffset + progress * Math.PI * 2 * orbitTurns
          x = emitterOffset.x + Math.cos(orbitAngle) * state.radius
          z = emitterOffset.z + Math.sin(orbitAngle) * state.radius
          y =
            state.initialPosition.y +
            Math.sin(progress * Math.PI * 2 * (state.floatFrequency || 1) + state.orbitOffset) *
              state.floatStrength
          break
        }
      }
    }

    if (
      !isRainbowArc &&
      (velocityVec.x !== 0 || velocityVec.y !== 0 || velocityVec.z !== 0 || accelerationVec.x !== 0 || accelerationVec.y !== 0 || accelerationVec.z !== 0)
    ) {
      const halfTimeSquared = 0.5 * elapsed * elapsed
      x += velocityVec.x * elapsed + accelerationVec.x * halfTimeSquared
      y += velocityVec.y * elapsed + accelerationVec.y * halfTimeSquared
      z += velocityVec.z * elapsed + accelerationVec.z * halfTimeSquared
    }

    if (colors && gradientStops) {
      let colorSampleT = gradientBaseT
      switch (gradientPlayback) {
        case 'lifetime':
          colorSampleT = wrap01(gradientBaseT + progress)
          break
        case 'scroll':
          colorSampleT = gradientBaseT + gradientSpeed * elapsed
          break
        default:
          colorSampleT = gradientBaseT
          break
      }
      const rgb = sampleGradient(gradientStops, colorSampleT, gradientSampleOptions)
      const colorIndex = i * 3
      colors[colorIndex] = rgb.r
      colors[colorIndex + 1] = rgb.g
      colors[colorIndex + 2] = rgb.b
    }

    const rotation = normalizeQuaternion(
      eulerToQuaternion(
        elapsed * state.spinRates.x,
        elapsed * state.spinRates.y,
        elapsed * state.spinRates.z
      )
    )

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    rotations[i * 4] = rotation.x
    rotations[i * 4 + 1] = rotation.y
    rotations[i * 4 + 2] = rotation.z
    rotations[i * 4 + 3] = rotation.w

    scales[i * 3] = scaleX
    scales[i * 3 + 1] = scaleY
    scales[i * 3 + 2] = scaleZ
  }

  const keyframeData = { positions, rotations, scales }
  if (colors) {
    keyframeData.colors = colors
  }

  return keyframeData
}

