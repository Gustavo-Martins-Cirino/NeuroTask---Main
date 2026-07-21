"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type { Group } from "three"
import { DEFAULT_AVATAR, normalizeAvatar, type AvatarConfig } from "@/lib/avatar"

// Personagem 3D low-poly SENTADO POR CONSTRUÇÃO. A pose de sentar não é
// calculada — é a hierarquia de meshes montada uma vez (quadril → coxa
// horizontal → canela para baixo). Impossível "flutuar": é 3D de verdade
// com câmera. A customização (skin/cabelo/roupa/corpo/fones) vira material
// e proporção; "working" gira os antebraços em direção à mesa.

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) - amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) - amt))
  const b = Math.max(0, Math.min(255, (n & 255) - amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

interface Props {
  avatar?: AvatarConfig | null
  working?: boolean
  onClick?: () => void
}

// Unidades: ~1 = 10cm. Origem no piso, sob o centro da cadeira.
export function OfficeFigure3D({ avatar, working = false, onClick }: Props) {
  const cfg = avatar ? normalizeAvatar(avatar) : DEFAULT_AVATAR
  const fem = cfg.body === "f"
  const pants = cfg.outfit === "terno" ? darken(cfg.outfitColor, 18) : "#3b5378"
  const sleeve = cfg.outfit === "camiseta" ? cfg.skin : cfg.outfitColor

  const seatY = 2.6 // altura do assento
  const shoulderY = seatY + (fem ? 3.9 : 4.2)
  const headY = shoulderY + 1.4
  const torsoW = fem ? 1.5 : 1.7

  const headRef = useRef<Group>(null)
  const lArm = useRef<Group>(null)
  const rArm = useRef<Group>(null)

  // Respira/digita: leve balanço da cabeça ocioso; antebraços batendo teclado
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (headRef.current) headRef.current.position.y = working ? 0 : Math.sin(t * 1.6) * 0.05
    if (working) {
      const beat = Math.sin(t * 9) * 0.12
      if (lArm.current) lArm.current.rotation.x = -1.15 + beat
      if (rArm.current) rArm.current.rotation.x = -1.15 - beat
    }
  })

  return (
    <group onClick={onClick} onPointerOver={(e) => { if (onClick) { e.stopPropagation(); document.body.style.cursor = "pointer" } }} onPointerOut={() => { if (onClick) document.body.style.cursor = "auto" }}>
      {/* pernas: coxa horizontal a partir do quadril + canela descendo ao piso */}
      {[-0.75, 0.75].map((dx, i) => (
        <group key={i} position={[dx, seatY, 0]}>
          {/* coxa (deitada, indo para frente +z) */}
          <mesh position={[0, 0, 1.1]} castShadow>
            <boxGeometry args={[0.85, 0.85, 2.4]} />
            <meshStandardMaterial color={i === 0 ? darken(pants, 12) : pants} />
          </mesh>
          {/* canela (desce do joelho ao pé) */}
          <mesh position={[0, -1.2, 2.15]} castShadow>
            <boxGeometry args={[0.8, 2.6, 0.8]} />
            <meshStandardMaterial color={i === 0 ? darken(pants, 12) : pants} />
          </mesh>
          {/* pé */}
          <mesh position={[0, -2.4, 2.5]} castShadow>
            <boxGeometry args={[0.85, 0.5, 1.3]} />
            <meshStandardMaterial color="#2f2f38" />
          </mesh>
        </group>
      ))}

      {/* quadril */}
      <mesh position={[0, seatY + 0.5, 0.2]} castShadow>
        <boxGeometry args={[torsoW * 2 + 0.4, 1.2, 1.6]} />
        <meshStandardMaterial color={darken(pants, 6)} />
      </mesh>

      {/* tronco (levemente reclinado no encosto) */}
      <mesh position={[0, (seatY + 1.1 + shoulderY) / 2, -0.15]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[torsoW * 2, shoulderY - (seatY + 1.1), 1.5]} />
        <meshStandardMaterial color={cfg.outfitColor} />
      </mesh>

      {/* braços (ombro → cotovelo), giram em working */}
      {[
        { ref: lArm, x: -(torsoW + 0.35) },
        { ref: rArm, x: torsoW + 0.35 },
      ].map((a, i) => (
        <group key={i} ref={a.ref} position={[a.x, shoulderY - 0.2, -0.1]} rotation={[working ? -1.15 : -0.15, 0, 0]}>
          <mesh position={[0, -0.9, 0.1]} castShadow>
            <boxGeometry args={[0.6, 2.1, 0.6]} />
            <meshStandardMaterial color={sleeve} />
          </mesh>
          {/* mão */}
          <mesh position={[0, -2, 0.15]} castShadow>
            <sphereGeometry args={[0.42, 12, 12]} />
            <meshStandardMaterial color={cfg.skin} />
          </mesh>
        </group>
      ))}

      {/* cabeça + cabelo + fones (balança quando ocioso) */}
      <group ref={headRef} position={[0, headY, -0.05]}>
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[1.05, 20, 20]} />
          <meshStandardMaterial color={cfg.skin} />
        </mesh>
        {/* cabelo: casca cobrindo a nuca (vista de costas) */}
        {cfg.hairStyle !== "raspado" && (
          <mesh position={[0, 0.15, -0.15]} castShadow>
            <sphereGeometry args={[1.12, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={cfg.hairColor} />
          </mesh>
        )}
        {cfg.hairStyle === "raspado" && (
          <mesh position={[0, 0.1, -0.1]}>
            <sphereGeometry args={[1.08, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={cfg.hairColor} transparent opacity={0.55} />
          </mesh>
        )}
        {cfg.hairStyle === "longo" && (
          <mesh position={[0, -0.9, -0.5]} castShadow>
            <boxGeometry args={[1.7, 1.8, 0.7]} />
            <meshStandardMaterial color={cfg.hairColor} />
          </mesh>
        )}
        {cfg.hairStyle === "coque" && (
          <mesh position={[0, 1.05, -0.35]} castShadow>
            <sphereGeometry args={[0.5, 14, 14]} />
            <meshStandardMaterial color={cfg.hairColor} />
          </mesh>
        )}
        {/* fones: arco + duas conchas */}
        {cfg.headphones && (
          <group>
            <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[1.05, 0.13, 8, 20, Math.PI]} />
              <meshStandardMaterial color="#2f2f38" />
            </mesh>
            {[-1.05, 1.05].map((x) => (
              <mesh key={x} position={[x, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.42, 0.42, 0.35, 16]} />
                <meshStandardMaterial color="#2f2f38" />
              </mesh>
            ))}
          </group>
        )}
      </group>
    </group>
  )
}
