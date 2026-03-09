"use client"

import { Canvas } from "@react-three/fiber"
import { Float, MeshDistortMaterial, RoundedBox, Sphere, Torus } from "@react-three/drei"
import { Suspense } from "react"

function DollarIcon() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group>
        <RoundedBox args={[1, 1, 0.3]} radius={0.15} smoothness={4}>
          <MeshDistortMaterial color="#22c55e" distort={0.1} speed={2} />
        </RoundedBox>
        <mesh position={[0, 0, 0.2]}>
          <torusGeometry args={[0.25, 0.08, 16, 32]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  )
}

function UsersIcon() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group>
        <RoundedBox args={[1, 1, 0.3]} radius={0.15} smoothness={4}>
          <MeshDistortMaterial color="#3b82f6" distort={0.1} speed={2} />
        </RoundedBox>
        <Sphere args={[0.2, 16, 16]} position={[0, 0.1, 0.2]}>
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </Sphere>
        <Sphere args={[0.15, 16, 16]} position={[-0.2, -0.15, 0.2]}>
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </Sphere>
        <Sphere args={[0.15, 16, 16]} position={[0.2, -0.15, 0.2]}>
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </Sphere>
      </group>
    </Float>
  )
}

function SparklesIcon() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group>
        <RoundedBox args={[1, 1, 0.3]} radius={0.15} smoothness={4}>
          <MeshDistortMaterial color="#f59e0b" distort={0.1} speed={2} />
        </RoundedBox>
        <mesh position={[0, 0, 0.2]} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.25]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </Float>
  )
}

function BotIcon() {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <group>
        {/* Main head/body */}
        <RoundedBox args={[1.2, 1.2, 0.4]} radius={0.2} smoothness={4}>
          <MeshDistortMaterial color="#f59e0b" distort={0.15} speed={3} />
        </RoundedBox>
        {/* Eyes */}
        <Sphere args={[0.12, 16, 16]} position={[-0.25, 0.15, 0.25]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </Sphere>
        <Sphere args={[0.12, 16, 16]} position={[0.25, 0.15, 0.25]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </Sphere>
        {/* Antenna */}
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        <Sphere args={[0.08, 16, 16]} position={[0, 0.9, 0]}>
          <meshStandardMaterial color="#ffffff" emissive="#f59e0b" emissiveIntensity={0.8} />
        </Sphere>
        {/* Mouth/speaker grill */}
        <mesh position={[0, -0.2, 0.22]}>
          <boxGeometry args={[0.4, 0.12, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
    </Float>
  )
}

function ChartIcon() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group>
        <RoundedBox args={[1, 1, 0.3]} radius={0.15} smoothness={4}>
          <MeshDistortMaterial color="#8b5cf6" distort={0.1} speed={2} />
        </RoundedBox>
        {/* Bar chart bars */}
        <mesh position={[-0.2, -0.1, 0.2]}>
          <boxGeometry args={[0.15, 0.35, 0.1]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.05, 0.2]}>
          <boxGeometry args={[0.15, 0.5, 0.1]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.2, -0.02, 0.2]}>
          <boxGeometry args={[0.15, 0.4, 0.1]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  )
}

function CampaignIcon() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group>
        <RoundedBox args={[1, 1, 0.3]} radius={0.15} smoothness={4}>
          <MeshDistortMaterial color="#ec4899" distort={0.1} speed={2} />
        </RoundedBox>
        {/* Megaphone shape */}
        <mesh position={[0, 0, 0.2]} rotation={[0, 0, -Math.PI / 6]}>
          <coneGeometry args={[0.3, 0.5, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  )
}

interface Icon3DProps {
  type: "dollar" | "users" | "sparkles" | "bot" | "chart" | "campaign"
  size?: number
}

export function Icon3D({ type, size = 48 }: Icon3DProps) {
  const icons = {
    dollar: DollarIcon,
    users: UsersIcon,
    sparkles: SparklesIcon,
    bot: BotIcon,
    chart: ChartIcon,
    campaign: CampaignIcon,
  }

  const IconComponent = icons[type]

  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} gl={{ alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#f59e0b" />
          <IconComponent />
        </Suspense>
      </Canvas>
    </div>
  )
}

export function LargeBotIcon() {
  return (
    <div className="h-24 w-24">
      <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} gl={{ alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#f59e0b" />
          <spotLight position={[0, 5, 5]} angle={0.3} penumbra={1} intensity={1} color="#f59e0b" />
          <BotIcon />
        </Suspense>
      </Canvas>
    </div>
  )
}
