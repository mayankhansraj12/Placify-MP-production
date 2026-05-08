import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* Render all particles as a single Points object — one draw call instead of 35 */
function ParticleField({ count = 35 }) {
  const ref = useRef()
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 12
      positions[i*3+1] = (Math.random() - 0.5) * 8
      positions[i*3+2] = (Math.random() - 0.5) * 6
      speeds[i] = 0.25 + Math.random() * 0.4
    }
    return { positions, speeds }
  }, [count])

  const baseY = useMemo(() => Float32Array.from(positions.filter((_, i) => i % 3 === 1)), [positions])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i*3+1] = baseY[i] + Math.sin(t * speeds[i]) * 0.5
      pos[i*3]   = positions[i*3] + Math.cos(t * speeds[i] * 0.6) * 0.3
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#7B6BFF" size={0.08} transparent opacity={0.55} sizeAttenuation />
    </points>
  )
}

function NeuralConnections({ count = 35, threshold = 4 }) {
  const linePoints = useMemo(() => {
    const positions = []
    for (let i = 0; i < count; i++) {
      positions.push([(Math.random()-0.5)*12, (Math.random()-0.5)*8, (Math.random()-0.5)*6])
    }
    const pts = []
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i][0] - positions[j][0]
        const dy = positions[i][1] - positions[j][1]
        const dz = positions[i][2] - positions[j][2]
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < threshold) {
          pts.push(...positions[i], ...positions[j])
        }
      }
    }
    return new Float32Array(pts)
  }, [count, threshold])

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={linePoints} itemSize={3} count={linePoints.length / 3} />
      </bufferGeometry>
      <lineBasicMaterial color="#AAAAAA" transparent opacity={0.35} />
    </lineSegments>
  )
}

function FloatingRing() {
  const ref = useRef()
  useFrame((_, delta) => { if (ref.current) { ref.current.rotation.x += delta * 0.12; ref.current.rotation.z += delta * 0.07 } })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[5.5, 0.025, 12, 80]} />
      <meshBasicMaterial color="#7B6BFF" transparent opacity={0.18} />
    </mesh>
  )
}

function FloatingRing2() {
  const ref = useRef()
  useFrame((_, delta) => { if (ref.current) { ref.current.rotation.y += delta * 0.10; ref.current.rotation.x -= delta * 0.05 } })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[3.8, 0.02, 12, 60]} />
      <meshBasicMaterial color="#AAAAAA" transparent opacity={0.22} />
    </mesh>
  )
}

function SceneGroup({ children }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.10) * 0.25
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.07) * 0.08
    }
  })
  return <group ref={ref}>{children}</group>
}

export default function NeuralNetworkScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.5 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneGroup>
        <ParticleField count={35} />
        <NeuralConnections count={35} threshold={4} />
        <FloatingRing />
        <FloatingRing2 />
      </SceneGroup>
    </Canvas>
  )
}
