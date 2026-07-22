"use client"

import { useEffect, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { ContactShadows, OrthographicCamera } from "@react-three/drei"
import { ACESFilmicToneMapping } from "three"
import { OfficeFigure3D } from "@/components/office-figure-3d"
import type { AvatarConfig } from "@/lib/avatar"

// Cena 3D (React-Three-Fiber) — PROTÓTIPO. Câmera ortográfica isométrica,
// luz que segue a hora real, e o personagem sentado por construção. Coexiste
// com a cena SVG; a loja/itens ainda não foram portados (fase seguinte).

interface OfficeScene3DProps {
  avatar?: AvatarConfig | null
  working?: boolean
  onAvatarClick?: () => void
  className?: string
}

type Phase = "dawn" | "day" | "dusk" | "night"
function phaseOf(h: number): Phase {
  if (h >= 5 && h < 8) return "dawn"
  if (h >= 8 && h < 17) return "day"
  if (h >= 17 && h < 19) return "dusk"
  return "night"
}
// Sala SEMPRE aconchegante (luzes internas acesas). A fase só muda o tom da
// luz-chave, o brilho da luminária e o fundo — nunca escurece a cena a ponto
// de "sumir" a pessoa (o erro que deixou tudo sombrio à noite).
const LIGHT: Record<Phase, { key: string; keyI: number; hemiI: number; lampI: number; bg: string }> = {
  dawn: { key: "#ffe3c2", keyI: 1.55, hemiI: 1.2, lampI: 30, bg: "#f0dcc8" },
  day: { key: "#fff0d8", keyI: 1.7, hemiI: 1.3, lampI: 18, bg: "#dfeaf4" },
  dusk: { key: "#ffc59a", keyI: 1.45, hemiI: 1.1, lampI: 42, bg: "#e6c6be" },
  night: { key: "#cdd8ff", keyI: 1.35, hemiI: 1.05, lampI: 55, bg: "#2b2f4a" },
}

const WALL = "#a9c6dc"
const FLOOR = "#c08a55"
const WOOD = "#8a6f4e"
const WOOD_D = "#705534"

function Desk() {
  return (
    <group position={[0, 0, -3.6]}>
      {/* tampo em L */}
      <mesh position={[0, 5.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 0.6, 3.4]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[4.7, 5.4, 2.2]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.6, 4]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {/* pés */}
      {[-4.4, 4.4].map((x) => (
        <mesh key={x} position={[x, 2.6, 0.2]} castShadow>
          <boxGeometry args={[0.5, 5.4, 3]} />
          <meshStandardMaterial color={WOOD_D} />
        </mesh>
      ))}
      {/* dois monitores */}
      {[-2.3, 1.1].map((x, i) => (
        <group key={i} position={[x, 6.6, -0.4]}>
          <mesh castShadow>
            <boxGeometry args={[3, 1.9, 0.25]} />
            <meshStandardMaterial color="#1f2530" />
          </mesh>
          <mesh position={[0, 0, 0.14]}>
            <planeGeometry args={[2.7, 1.6]} />
            <meshStandardMaterial color="#3b82f6" emissive="#1e3a8a" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -1.2, 0.2]}>
            <boxGeometry args={[0.4, 0.6, 0.4]} />
            <meshStandardMaterial color="#3a3f4a" />
          </mesh>
        </group>
      ))}
      {/* teclado */}
      <mesh position={[-0.6, 5.75, 1.2]} castShadow>
        <boxGeometry args={[3, 0.25, 1]} />
        <meshStandardMaterial color="#2b2f38" />
      </mesh>
    </group>
  )
}

function Chair({ color = "#4a5568" }: { color?: string }) {
  const dark = "#3a3f4a"
  return (
    <group position={[0, 0, 0]}>
      {/* base estrela 5 pontas + rodízios */}
      {[0, 72, 144, 216, 288].map((deg) => {
        const a = (deg * Math.PI) / 180
        return (
          <group key={deg} rotation={[0, a, 0]}>
            <mesh position={[0, 0.2, 1.5]} castShadow>
              <boxGeometry args={[0.4, 0.3, 3]} />
              <meshStandardMaterial color="#54545e" />
            </mesh>
            <mesh position={[0, 0.15, 2.9]} castShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.5, 12]} />
              <meshStandardMaterial color={dark} />
            </mesh>
          </group>
        )
      })}
      {/* coluna a gás */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 2.4, 14]} />
        <meshStandardMaterial color="#5a5a64" />
      </mesh>
      {/* assento */}
      <mesh position={[0, 2.5, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.5, 3.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* encosto (atrás) */}
      <mesh position={[0, 5.2, -1.4]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[3.4, 4.8, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* braços */}
      {[-1.9, 1.9].map((x) => (
        <mesh key={x} position={[x, 3.4, 0.3]} castShadow>
          <boxGeometry args={[0.4, 0.4, 2.4]} />
          <meshStandardMaterial color="#3f4552" />
        </mesh>
      ))}
    </group>
  )
}

function Scene({ avatar, working, onAvatarClick, phase }: Required<Pick<OfficeScene3DProps, "onAvatarClick">> & { avatar?: AvatarConfig | null; working?: boolean; phase: Phase }) {
  const L = LIGHT[phase]
  return (
    <>
      {/* fill macio (céu/chão) + key quente com sombra + fill frio + luminária */}
      <hemisphereLight args={["#fff1e0", "#9a7b5a", L.hemiI]} />
      <directionalLight
        color={L.key}
        intensity={L.keyI}
        position={[9, 16, 11]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight color="#bcd0ff" intensity={0.5} position={[-10, 8, -6]} />
      <pointLight color="#ffcf8a" intensity={L.lampI} distance={22} decay={2} position={[4.5, 7, -1.2]} />

      {/* piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color={FLOOR} />
      </mesh>
      {/* tapete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]} receiveShadow>
        <circleGeometry args={[5.5, 40]} />
        <meshStandardMaterial color="#b76e79" />
      </mesh>
      {/* duas paredes */}
      <mesh position={[0, 8, -8]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial color={WALL} />
      </mesh>
      <mesh position={[-13, 8, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial color="#98b7cf" />
      </mesh>

      <Desk />
      {/* conjunto cadeira+pessoa girado para ficar de frente para a mesa
          (-z), encostado nela; câmera 3/4 mostra as costas + parte da roupa */}
      <group rotation={[0, Math.PI, 0]} position={[0, 0, 0.4]}>
        <Chair />
        <OfficeFigure3D avatar={avatar} working={working} onClick={onAvatarClick} />
      </group>

      <ContactShadows position={[0, 0.03, 0]} opacity={0.35} scale={20} blur={2.2} far={8} />
    </>
  )
}

export function OfficeScene3D({ avatar, working = false, onAvatarClick = () => {}, className }: OfficeScene3DProps) {
  const [phase, setPhase] = useState<Phase>("day")
  useEffect(() => {
    const tick = () => setPhase(phaseOf(new Date().getHours()))
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={className} style={{ background: `linear-gradient(160deg, ${LIGHT[phase].bg}, ${LIGHT[phase].bg}cc)` }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        style={{ width: "100%", aspectRatio: "480 / 340" }}
      >
        <OrthographicCamera makeDefault position={[16, 14, 16]} zoom={20} near={-100} far={200} onUpdate={(c) => c.lookAt(0, 4, 0)} />
        <Scene avatar={avatar} working={working} onAvatarClick={onAvatarClick} phase={phase} />
      </Canvas>
    </div>
  )
}
