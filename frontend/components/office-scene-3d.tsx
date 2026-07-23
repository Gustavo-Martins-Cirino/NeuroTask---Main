"use client"

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { ContactShadows, OrthographicCamera, useGLTF } from "@react-three/drei"
import { ACESFilmicToneMapping, Box3, Color, Group, Mesh, Vector3, type Material, type MeshStandardMaterial } from "three"
import { OfficeFigure3D } from "@/components/office-figure-3d"
import { SeatedCharacter } from "@/components/seated-character"
import { TOON_GRADIENT, toonifyObject } from "@/lib/toon"
import type { AvatarConfig } from "@/lib/avatar"

// Fallback resiliente: se o .glb do personagem não existir (404) ou falhar,
// cai no personagem procedural — a cena NUNCA quebra. Some sozinho quando o
// arquivo /models/seated-character.glb passar a existir (num reload).
class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// Cena 3D (React-Three-Fiber) — PROTÓTIPO. Câmera ortográfica isométrica,
// luz que segue a hora real, e o personagem sentado por construção. Coexiste
// com a cena SVG; a loja/itens ainda não foram portados (fase seguinte).

interface OfficeScene3DProps {
  avatar?: AvatarConfig | null
  working?: boolean
  onAvatarClick?: () => void
  /** Ids de itens equipados/prévia — a cena reflete cor de parede/piso/cadeira. */
  equipped?: Set<string>
  /** Skin do personagem: modelo 3D + cor (manequim). Vem de resolveSkin. */
  skinUrl?: string
  skinTint?: string
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

const WALL = "#8fc0ec"
const WALL_SIDE = "#79b0e2"
const FLOOR = "#e0964a"
const WOOD = "#b07d40"
const WOOD_D = "#8c5f2c"

// Itens da loja que a cena 3D já reflete (cor). Decorativos (planta, gato,
// estante…) viram malhas numa fase seguinte. `pick` acha o 1º id equipado.
const WALL_COLORS: Record<string, string> = { "parede-azul": "#8fb3d9", "parede-verde": "#9ec6a6", "parede-rosa": "#e5b5c8" }
const FLOOR_COLORS: Record<string, string> = { "piso-madeira": "#b5824f", "piso-carpete": "#8aa0b8" }
const CHAIR_COLORS: Record<string, string> = { "cadeira-ergonomica": "#3a4250", "cadeira-gamer": "#b23b3b" }
function pick(map: Record<string, string>, equipped: Set<string> | undefined, fallback: string): string {
  if (equipped) for (const id in map) if (equipped.has(id)) return map[id]
  return fallback
}

// Cadeira de escritório (GLB do usuário). Auto-escala pela bbox real (o modelo
// traz um transform de nó, então o accessor mente) até ~8 un de altura, gira π
// para o encosto ficar atrás de quem senta e, se houver cor de cadeira
// equipada, recolore a malha (clonando o material p/ não vazar no cache).
function OfficeChairGlb({ color }: { color?: string }) {
  const { scene } = useGLTF("/models/office-chair.glb")
  const chair = useMemo(() => {
    const c = scene.clone(true)
    const h0 = new Box3().setFromObject(c).getSize(new Vector3()).y || 1
    c.scale.setScalar(8 / h0)
    c.rotation.y = Math.PI // encosto ATRÁS de quem senta (no objeto, não no <primitive>)
    c.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      if (color) {
        const tint = (mat: Material): Material => {
          const cl = (mat as MeshStandardMaterial).clone()
          cl.color = new Color(color)
          return cl
        }
        m.material = Array.isArray(m.material) ? m.material.map(tint) : tint(m.material)
      }
    })
    toonifyObject(c) // cell-shading
    return c
  }, [scene, color])
  return <primitive object={chair} />
}
useGLTF.preload("/models/office-chair.glb")

// Pet (Beagle GLB, item "pet-cachorro"). Auto-escala pela bbox real (~3 un),
// tinge de marrom (modelo sem textura) e ganha vida com useFrame: pulinho
// suave + olhar de um lado pro outro no tapete, virado para o dono.
function PetBeagle() {
  const { scene } = useGLTF("/models/pet-beagle.glb")
  const ref = useRef<Group>(null)
  const dog = useMemo(() => {
    const c = scene.clone(true)
    const h0 = new Box3().setFromObject(c).getSize(new Vector3()).y || 1
    c.scale.setScalar(3 / h0)
    const brown = new Color("#a4703c")
    c.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.castShadow = true
      const tint = (mat: Material): Material => {
        const cl = (mat as MeshStandardMaterial).clone()
        if (!cl.map) cl.color = brown
        return cl
      }
      m.material = Array.isArray(m.material) ? m.material.map(tint) : tint(m.material)
    })
    toonifyObject(c) // cell-shading
    return c
  }, [scene])
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = Math.abs(Math.sin(t * 2.2)) * 0.18 // pulinho
    ref.current.rotation.y = Math.PI * 0.25 + Math.sin(t * 0.7) * 0.3 // olha em volta
  })
  return (
    <group ref={ref} position={[-4, 0, 4]}>
      <primitive object={dog} />
    </group>
  )
}
useGLTF.preload("/models/pet-beagle.glb")

function Desk({ working }: { working?: boolean }) {
  return (
    <group position={[0, 0, -3.6]}>
      {/* tampo em L */}
      <mesh position={[0, 5.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 0.6, 3.4]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color={WOOD} />
      </mesh>
      <mesh position={[4.7, 5.4, 2.2]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.6, 4]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color={WOOD} />
      </mesh>
      {/* pés */}
      {[-4.4, 4.4].map((x) => (
        <mesh key={x} position={[x, 2.6, 0.2]} castShadow>
          <boxGeometry args={[0.5, 5.4, 3]} />
          <meshToonMaterial gradientMap={TOON_GRADIENT} color={WOOD_D} />
        </mesh>
      ))}
      {/* dois monitores — telas brilham mais quando está trabalhando */}
      {[-2.3, 1.1].map((x, i) => (
        <group key={i} position={[x, 6.6, -0.4]}>
          <mesh castShadow>
            <boxGeometry args={[3, 1.9, 0.25]} />
            <meshToonMaterial gradientMap={TOON_GRADIENT} color="#1f2530" />
          </mesh>
          <mesh position={[0, 0, 0.14]}>
            <planeGeometry args={[2.7, 1.6]} />
            <meshToonMaterial gradientMap={TOON_GRADIENT} color="#3b82f6" emissive="#3b82f6" emissiveIntensity={working ? 1.2 : 0.35} />
          </mesh>
          <mesh position={[0, -1.2, 0.2]}>
            <boxGeometry args={[0.4, 0.6, 0.4]} />
            <meshToonMaterial gradientMap={TOON_GRADIENT} color="#3a3f4a" />
          </mesh>
        </group>
      ))}
      {/* teclado */}
      <mesh position={[-0.6, 5.75, 1.2]} castShadow>
        <boxGeometry args={[3, 0.25, 1]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color="#2b2f38" />
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
              <meshToonMaterial gradientMap={TOON_GRADIENT} color="#54545e" />
            </mesh>
            <mesh position={[0, 0.15, 2.9]} castShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.5, 12]} />
              <meshToonMaterial gradientMap={TOON_GRADIENT} color={dark} />
            </mesh>
          </group>
        )
      })}
      {/* coluna a gás */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 2.4, 14]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color="#5a5a64" />
      </mesh>
      {/* assento */}
      <mesh position={[0, 2.5, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.5, 3.4]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color={color} />
      </mesh>
      {/* encosto (atrás) */}
      <mesh position={[0, 5.2, -1.4]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[3.4, 4.8, 0.5]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color={color} />
      </mesh>
      {/* braços */}
      {[-1.9, 1.9].map((x) => (
        <mesh key={x} position={[x, 3.4, 0.3]} castShadow>
          <boxGeometry args={[0.4, 0.4, 2.4]} />
          <meshToonMaterial gradientMap={TOON_GRADIENT} color="#3f4552" />
        </mesh>
      ))}
    </group>
  )
}

// ── Decorações 3D (toon). Cada uma aparece quando o item da loja está
// equipado. Posições fixas na sala; malhas simples de baixo poli. ──────────
const M = ({ c, e, ei }: { c: string; e?: string; ei?: number }) => (
  <meshToonMaterial gradientMap={TOON_GRADIENT} color={c} emissive={e} emissiveIntensity={ei} />
)

function SmallPlant() {
  return (
    <group position={[-3.6, 5.7, -3.1]}>
      <mesh castShadow position={[0, 0.35, 0]}><cylinderGeometry args={[0.42, 0.32, 0.7, 14]} /><M c="#c96f4a" /></mesh>
      <mesh castShadow position={[0, 1.0, 0]}><icosahedronGeometry args={[0.6, 0]} /><M c="#4f9d5a" /></mesh>
      <mesh castShadow position={[0.35, 1.25, 0.1]}><icosahedronGeometry args={[0.34, 0]} /><M c="#5cae67" /></mesh>
      <mesh castShadow position={[-0.3, 1.2, -0.1]}><icosahedronGeometry args={[0.3, 0]} /><M c="#57a862" /></mesh>
    </group>
  )
}

function BigPlant() {
  return (
    <group position={[-9.5, 0, -5.5]}>
      <mesh castShadow position={[0, 1.0, 0]}><cylinderGeometry args={[1.1, 0.8, 2, 16]} /><M c="#b9603f" /></mesh>
      {[[0, 0], [0.7, 0.5], [-0.7, -0.4], [0.4, -0.7], [-0.5, 0.6]].map(([dx, dz], i) => (
        <mesh key={i} castShadow position={[dx, 3.1 + Math.abs(dx) * 0.3, dz]} rotation={[dz * 0.5, 0, -dx * 0.5]}>
          <coneGeometry args={[0.55, 3.2, 6]} /><M c={i % 2 ? "#4f9d5a" : "#5cae67"} />
        </mesh>
      ))}
    </group>
  )
}

function DeskLamp() {
  return (
    <group position={[-4.1, 5.7, -4.4]}>
      <mesh castShadow position={[0, 0.12, 0]}><cylinderGeometry args={[0.5, 0.55, 0.24, 18]} /><M c="#2f3540" /></mesh>
      <mesh castShadow position={[0, 0.9, 0]}><cylinderGeometry args={[0.09, 0.09, 1.6, 10]} /><M c="#3a4150" /></mesh>
      <mesh castShadow position={[0.45, 1.75, 0]} rotation={[0, 0, -0.7]}><cylinderGeometry args={[0.09, 0.09, 1.3, 10]} /><M c="#3a4150" /></mesh>
      <mesh castShadow position={[1.05, 2.0, 0]} rotation={[0, 0, 0.5]}><cylinderGeometry args={[0.42, 0.22, 0.55, 18, 1, true]} /><M c="#e0b23a" /></mesh>
      <mesh position={[1.05, 1.78, 0]}><sphereGeometry args={[0.19, 12, 10]} /><M c="#fff1c8" e="#ffdf8a" ei={1.6} /></mesh>
    </group>
  )
}

function Bookshelf() {
  const books = ["#c0492f", "#2f6bb0", "#e0b23a", "#4f9d5a", "#8a5cf0", "#d76b86"]
  return (
    <group position={[9.2, 0, -7]}>
      <mesh castShadow position={[0, 3, 0]}><boxGeometry args={[3.6, 6, 1.5]} /><M c="#7a5230" /></mesh>
      {[1.1, 2.9, 4.7].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.1]}><boxGeometry args={[3.3, 0.16, 1.35]} /><M c="#5f3f22" /></mesh>
          {books.map((c, i) => (
            <mesh key={i} castShadow position={[-1.3 + i * 0.5, y + 0.6, 0.1]}>
              <boxGeometry args={[0.34, 1.0, 1.0]} /><M c={c} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function WallPicture() {
  return (
    <group position={[4.5, 10.6, -7.82]}>
      <mesh><boxGeometry args={[3.6, 2.6, 0.2]} /><M c="#6b4e2e" /></mesh>
      <mesh position={[0, 0, 0.12]}><planeGeometry args={[3.2, 2.2]} /><M c="#bfe4f2" /></mesh>
      <mesh position={[0, -0.7, 0.13]}><planeGeometry args={[3.2, 0.8]} /><M c="#6bbf7a" /></mesh>
      <mesh position={[-0.5, -0.25, 0.15]}><coneGeometry args={[0.7, 1.0, 3]} /><M c="#8a97a6" /></mesh>
      <mesh position={[0.7, -0.35, 0.15]}><coneGeometry args={[0.55, 0.8, 3]} /><M c="#9aa7b6" /></mesh>
    </group>
  )
}

function NeonSign() {
  const pink = "#ff4fa3"
  return (
    <group position={[-5, 11, -7.8]}>
      <mesh><boxGeometry args={[3.8, 1.5, 0.15]} /><M c="#241d38" /></mesh>
      <mesh position={[-1.1, 0, 0.14]}><torusGeometry args={[0.42, 0.09, 10, 22]} /><M c={pink} e={pink} ei={2} /></mesh>
      {[-0.2, 0.5, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.14]}><boxGeometry args={[0.13, 0.95, 0.12]} /><M c="#59e0ff" e="#59e0ff" ei={2} /></mesh>
      ))}
    </group>
  )
}

function Window3D() {
  return (
    <group position={[-12.8, 9, 0.5]} rotation={[0, Math.PI / 2, 0]}>
      <mesh><boxGeometry args={[5, 3.8, 0.25]} /><M c="#6b5030" /></mesh>
      <mesh position={[0, 0.3, 0.08]}><planeGeometry args={[4.5, 2.9]} /><M c="#8fd0ee" /></mesh>
      {[[-1.5, 0.9], [-0.4, 1.3], [0.7, 0.7], [1.7, 1.1]].map(([x, h], i) => (
        <mesh key={i} position={[x, -0.4 + h / 2, 0.1]}><boxGeometry args={[0.8, h, 0.05]} /><M c={i % 2 ? "#5a6b86" : "#47566e"} /></mesh>
      ))}
      <mesh position={[0, 0.3, 0.14]}><boxGeometry args={[0.14, 2.9, 0.05]} /><M c="#6b5030" /></mesh>
      <mesh position={[0, 0.3, 0.14]}><boxGeometry args={[4.5, 0.14, 0.05]} /><M c="#6b5030" /></mesh>
    </group>
  )
}

function Trophy() {
  const gold = "#e8b73a"
  return (
    <group position={[2.7, 5.7, -3.0]}>
      <mesh castShadow position={[0, 0.16, 0]}><boxGeometry args={[0.7, 0.32, 0.7]} /><M c="#4a3524" /></mesh>
      <mesh castShadow position={[0, 0.6, 0]}><cylinderGeometry args={[0.09, 0.09, 0.5, 10]} /><M c={gold} e={gold} ei={0.3} /></mesh>
      <mesh castShadow position={[0, 1.05, 0]}><cylinderGeometry args={[0.46, 0.2, 0.62, 16]} /><M c={gold} e={gold} ei={0.3} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.46, 1.05, 0]} rotation={[0, 0, (s * Math.PI) / 2]}>
          <torusGeometry args={[0.16, 0.045, 8, 14, Math.PI]} /><M c={gold} e={gold} ei={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function Cat() {
  return (
    <group position={[4.6, 0, 3.4]} rotation={[0, -Math.PI * 0.78, 0]}>
      <mesh castShadow position={[0, 0.75, 0]} scale={[1, 1.15, 1.35]}><sphereGeometry args={[0.75, 16, 12]} /><M c="#d98a3f" /></mesh>
      <mesh castShadow position={[0, 1.7, 0.45]}><sphereGeometry args={[0.52, 16, 12]} /><M c="#d98a3f" /></mesh>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} castShadow position={[x, 2.15, 0.45]} rotation={[0.2, 0, 0]}><coneGeometry args={[0.18, 0.42, 8]} /><M c="#c97e35" /></mesh>
      ))}
      <mesh castShadow position={[-0.4, 0.7, -0.7]} rotation={[0.9, 0, 0.3]}><cylinderGeometry args={[0.12, 0.06, 1.4, 8]} /><M c="#c97e35" /></mesh>
    </group>
  )
}

function Decor({ equipped }: { equipped?: Set<string> }) {
  if (!equipped) return null
  return (
    <>
      {equipped.has("planta-pequena") && <SmallPlant />}
      {equipped.has("planta-grande") && <BigPlant />}
      {equipped.has("luminaria") && <DeskLamp />}
      {equipped.has("estante") && <Bookshelf />}
      {equipped.has("quadro-montanhas") && <WallPicture />}
      {equipped.has("quadro-neon") && <NeonSign />}
      {equipped.has("janela-cidade") && <Window3D />}
      {equipped.has("trofeu") && <Trophy />}
      {equipped.has("pet-gato") && <Cat />}
    </>
  )
}

function Scene({ avatar, working, onAvatarClick, phase, equipped, skinUrl, skinTint }: Required<Pick<OfficeScene3DProps, "onAvatarClick">> & { avatar?: AvatarConfig | null; working?: boolean; phase: Phase; equipped?: Set<string>; skinUrl?: string; skinTint?: string }) {
  const L = LIGHT[phase]
  const wallColor = pick(WALL_COLORS, equipped, WALL)
  const wallSide = pick(WALL_COLORS, equipped, WALL_SIDE)
  const floorColor = pick(FLOOR_COLORS, equipped, FLOOR)
  const chairColor = pick(CHAIR_COLORS, equipped, "")
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
        <meshToonMaterial gradientMap={TOON_GRADIENT} color={floorColor} />
      </mesh>
      {/* tapete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]} receiveShadow>
        <circleGeometry args={[5.5, 40]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color="#e37a92" />
      </mesh>
      {/* duas paredes */}
      <mesh position={[0, 8, -8]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color={wallColor} />
      </mesh>
      <mesh position={[-13, 8, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <meshToonMaterial gradientMap={TOON_GRADIENT} color={wallSide} />
      </mesh>

      <Desk working={working} />
      {/* pet (Beagle) — item comprável "pet-cachorro" */}
      {equipped?.has("pet-cachorro") && (
        <Suspense fallback={null}>
          <PetBeagle />
        </Suspense>
      )}
      {/* conjunto cadeira+pessoa girado para ficar de frente para a mesa
          (-z), encostado nela; câmera 3/4 mostra as costas + parte da roupa.
          O personagem é FILHO deste mesmo grupo → herda a orientação. */}
      <group rotation={[0, Math.PI, 0]} position={[0, 0, 0.4]}>
        {/* cadeira GLB (com fallback procedural se o arquivo falhar) */}
        <GlbBoundary fallback={<Chair color={chairColor || undefined} />}>
          <Suspense fallback={<Chair color={chairColor || undefined} />}>
            <OfficeChairGlb color={chairColor || undefined} />
          </Suspense>
        </GlbBoundary>
        {/* personagem por skin (modelo + cor); fallback procedural se falhar */}
        <GlbBoundary fallback={<OfficeFigure3D avatar={avatar} working={working} onClick={onAvatarClick} />}>
          <Suspense fallback={<OfficeFigure3D avatar={avatar} working={working} onClick={onAvatarClick} />}>
            <SeatedCharacter key={skinUrl} chairId="padrao" modelUrl={skinUrl} tint={skinTint} onClick={onAvatarClick} />
          </Suspense>
        </GlbBoundary>
      </group>

      <Decor equipped={equipped} />

      <ContactShadows position={[0, 0.03, 0]} opacity={0.35} scale={20} blur={2.2} far={8} />
    </>
  )
}

export function OfficeScene3D({ avatar, working = false, onAvatarClick = () => {}, equipped, skinUrl, skinTint, className }: OfficeScene3DProps) {
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
        <Scene avatar={avatar} working={working} onAvatarClick={onAvatarClick} phase={phase} equipped={equipped} skinUrl={skinUrl} skinTint={skinTint} />
      </Canvas>
    </div>
  )
}
