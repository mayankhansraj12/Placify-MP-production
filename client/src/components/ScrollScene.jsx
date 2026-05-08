import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ─── Ink Smoke / Fluid Orb ─── */
function InkOrb({ scroll = 0 }) {
  const ref = useRef()
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(2.2, 32, 32)
    const positions = geo.attributes.position.array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i+1], z = positions[i+2]
      const offset = 0.35 * (Math.sin(x * 2.1) * Math.cos(y * 1.7) + Math.cos(z * 2.3))
      positions[i]   = x * (1 + offset * 0.18)
      positions[i+1] = y * (1 + offset * 0.22)
      positions[i+2] = z * (1 + offset * 0.16)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.y = t * 0.15 + scroll * Math.PI * 0.5
    ref.current.rotation.x = Math.sin(t * 0.08) * 0.3 + scroll * 0.4
    ref.current.rotation.z = Math.cos(t * 0.05) * 0.15
    ref.current.position.y = Math.sin(t * 0.3) * 0.25
  })

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial
        color="#888888"
        roughness={0.15} metalness={0.05}
        transparent opacity={0.55}
      />
    </mesh>
  )
}

/* ─── Particle Cloud ─── */
function ParticleCloud({ count = 120, scroll = 0, color = '#AAAAAA' }) {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i*3]   = (Math.random() - 0.5) * 7
      arr[i*3+1] = (Math.random() - 0.5) * 7
      arr[i*3+2] = (Math.random() - 0.5) * 4
    }
    return arr
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.y = t * 0.06 + scroll * Math.PI * 0.3
    ref.current.rotation.x = t * 0.03 + scroll * 0.2
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={positions.length / 3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.045} transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

/* ─── Floating Torus Knot ─── */
function FloatingKnot({ scroll = 0 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.x = t * 0.15 + scroll * Math.PI
    ref.current.rotation.y = t * 0.22 + scroll * 0.5
    ref.current.position.y = Math.sin(t * 0.4) * 0.4
  })
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[1.2, 0.35, 80, 12, 2, 3]} />
      <meshStandardMaterial color="#111111" roughness={0.1} metalness={0.15} transparent opacity={0.75} />
    </mesh>
  )
}

/* ─── Wireframe Globe ─── */
function WireGlobe({ scroll = 0 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.12 + scroll * Math.PI * 0.6
    ref.current.rotation.x = 0.4 + scroll * 0.3
  })
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[2, 2]} />
      <meshBasicMaterial color="#888888" wireframe transparent opacity={0.45} />
    </mesh>
  )
}

/* ─── Lighting ─── */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#888888" />
      <directionalLight position={[-5, -3, 2]} intensity={0.5} color="#AAAAAA" />
      <pointLight position={[0, 4, 2]} intensity={1.5} color="#F2FDFF" />
    </>
  )
}

/* ─── Scene Types ─── */
function SceneA({ scroll }) {
  return <><Lights /><InkOrb scroll={scroll} /><ParticleCloud count={100} scroll={scroll} color="#888888" /></>
}
function SceneB({ scroll }) {
  return <><Lights /><FloatingKnot scroll={scroll} /><ParticleCloud count={80} scroll={scroll} color="#AAAAAA" /></>
}
function SceneC({ scroll }) {
  return <><Lights /><WireGlobe scroll={scroll} /><ParticleCloud count={120} scroll={scroll} color="#888888" /></>
}
function SceneD({ scroll }) {
  const ref = useRef()
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.05 })
  return (
    <group ref={ref}>
      <Lights />
      <InkOrb scroll={scroll} />
      <ParticleCloud count={150} scroll={scroll} color="#AAAAAA" />
    </group>
  )
}

/* ─── Exported Canvas Component ─── */
export default function ScrollScene({ type = 'A', scrollProgress = 0, style, className }) {
  const dict = { A: SceneA, B: SceneB, C: SceneC, D: SceneD }
  const Scene = dict[type] || SceneA

  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.5 }}
      style={style}
      className={className}
    >
      <Scene scroll={scrollProgress} />
    </Canvas>
  )
}
