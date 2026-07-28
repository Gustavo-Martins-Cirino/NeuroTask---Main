"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { ContactShadows, OrthographicCamera, useGLTF } from "@react-three/drei"
import { ACESFilmicToneMapping, Box3, Color, Group, Mesh, Vector3, type Material, type MeshStandardMaterial, type MeshToonMaterial } from "three"
import { toonifyObject } from "@/lib/toon"
import {
  buildEscritorio, buildPersonagem, recuoDaSala, tamanhoDaSala,
  type EscritorioExtras, type PersonagemAcessorios, type PersonagemCores,
} from "@/lib/office-model"
import type { AvatarConfig } from "@/lib/avatar"

// Cena 3D (React-Three-Fiber) do Escritório. Câmera ortográfica isométrica,
// luz que segue a hora real e personagem sentado por construção. Os itens da
// LOJA entram por `equipped`: decorações viram malhas dentro da sala (ver
// buildEscritorio) e parede/piso/cadeira viram cor.

interface OfficeScene3DProps {
  avatar?: AvatarConfig | null
  working?: boolean
  onAvatarClick?: () => void
  /** Ids de itens equipados/prévia — a cena reflete decorações e cores. */
  equipped?: Set<string>
  /** Skin do personagem: cor da camisa (manequim). Vem de resolveSkin. */
  skinUrl?: string
  skinTint?: string
  /** Nível do dono da sala — ela cresce em degraus conforme ele sobe. */
  nivel?: number
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

// Itens da loja que viram COR (os demais viram malha em buildEscritorio).
const WALL_COLORS: Record<string, string> = { "parede-azul": "#8fb3d9", "parede-verde": "#9ec6a6", "parede-rosa": "#e5b5c8" }
const FLOOR_COLORS: Record<string, string> = { "piso-madeira": "#b5824f", "piso-carpete": "#8aa0b8" }
const CHAIR_COLORS: Record<string, string> = { "cadeira-ergonomica": "#3a4250", "cadeira-gamer": "#b23b3b" }
function pick(map: Record<string, string>, equipped: Set<string> | undefined): string | undefined {
  if (equipped) for (const id in map) if (equipped.has(id)) return map[id]
  return undefined
}

function extrasDe(equipped?: Set<string>): EscritorioExtras {
  if (!equipped) return {}
  return {
    janela: equipped.has("janela-cidade"),
    tapete: equipped.has("tapete"),
    plantaPequena: equipped.has("planta-pequena"),
    plantaGrande: equipped.has("planta-grande"),
    luminaria: equipped.has("luminaria"),
    estante: equipped.has("estante"),
    quadro: equipped.has("quadro-montanhas"),
    neon: equipped.has("quadro-neon"),
    trofeu: equipped.has("trofeu"),
    gato: equipped.has("pet-gato"),
  }
}

// Acessórios vestíveis (slots exclusivos na loja, então no máximo um de cada).
function acessoriosDe(equipped?: Set<string>): PersonagemAcessorios {
  if (!equipped) return {}
  const a: PersonagemAcessorios = {}
  if (equipped.has("chapeu-bone")) a.chapeu = "bone"
  else if (equipped.has("chapeu-social")) a.chapeu = "social"
  else if (equipped.has("chapeu-coroa")) a.chapeu = "coroa"
  if (equipped.has("oculos-grau")) a.oculos = "grau"
  else if (equipped.has("oculos-escuros")) a.oculos = "escuros"
  return a
}

// O avatar do editor pinta pele/cabelo/roupa; a skin comprada, quando
// equipada, tem a última palavra sobre a camisa.
function coresDoAvatar(avatar?: AvatarConfig | null, skinTint?: string): PersonagemCores {
  const c: PersonagemCores = {}
  if (avatar) {
    c.pele = avatar.skin
    c.cabelo = avatar.hairColor
    c.camisa = avatar.outfitColor
  }
  if (skinTint) c.camisa = skinTint
  return c
}

// Sala em metros (Z-up) dentro de <group rotation={[-π/2,0,0]} scale={4}>:
// um ponto (x,y,z) da sala vira (4x, 4z, −4y) no mundo. O beagle é GLB, então
// vive fora do grupo e usa coordenadas de mundo já convertidas.
function PetBeagle({ recuo = 0 }: { recuo?: number }) {
  const { scene } = useGLTF("/models/pet-beagle.glb")
  const ref = useRef<Group>(null)
  const dog = useMemo(() => {
    const c = scene.clone(true)
    const h0 = new Box3().setFromObject(c).getSize(new Vector3()).y || 1
    c.scale.setScalar(1.6 / h0) // ~0.4 m de altura na escala da sala
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
    toonifyObject(c)
    return c
  }, [scene])
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = Math.abs(Math.sin(t * 2.2)) * 0.08 // pulinho
    ref.current.rotation.y = Math.PI * 0.25 + Math.sin(t * 0.7) * 0.3 // olha em volta
  })
  return (
    <group ref={ref} position={[-3.4, 0, -4 * (0.25 + recuo)]}>
      <primitive object={dog} />
    </group>
  )
}
useGLTF.preload("/models/pet-beagle.glb")

// Cena cartoon NATIVA (sala + personagem em código, a partir dos scripts
// Blender build_escritorio_base / build_personagem_base). Toon-shaded. O
// monitor brilha mais quando "trabalhando" e o boneco respira (useFrame).
// Coords Z-up → Y-up via group.
function CartoonOffice({
  working, skinTint, avatar, equipped, nivel, onAvatarClick,
}: {
  working?: boolean
  skinTint?: string
  avatar?: AvatarConfig | null
  equipped?: Set<string>
  nivel?: number
  onAvatarClick?: () => void
}) {
  // Chave estável: o Set costuma ser recriado a cada render (prévia da loja).
  const equipKey = [...(equipped ?? [])].sort().join("|")
  const room = useMemo(
    () => buildEscritorio({
      nivel,
      extras: extrasDe(equipped),
      cores: {
        parede: pick(WALL_COLORS, equipped),
        piso: pick(FLOOR_COLORS, equipped),
        cadeira: pick(CHAIR_COLORS, equipped),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipKey, nivel]
  )
  const person = useMemo(
    () => buildPersonagem(coresDoAvatar(avatar, skinTint), acessoriosDe(equipped)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [avatar, skinTint, equipKey]
  )
  const personRef = useRef<Group>(null)
  const tela = useMemo(() => room.getObjectByName("Monitor_Tela") as Mesh | undefined, [room])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (tela) (tela.material as MeshToonMaterial).emissiveIntensity = working ? 2.2 : 1.0 + Math.sin(t * 1.5) * 0.12
    if (personRef.current) personRef.current.position.z = Math.sin(t * 1.7) * 0.012 // respiração
  })
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} scale={4}>
      <primitive object={room} />
      {/* A pessoa recua junto com a mesa quando a sala cresce */}
      <group position={[0, recuoDaSala(nivel), 0]}>
        <group ref={personRef} onClick={onAvatarClick}>
          <primitive object={person} />
        </group>
      </group>
    </group>
  )
}

const CAM_ASP = 480 / 340

function Scene({
  working, onAvatarClick, phase, skinTint, avatar, equipped, nivel,
}: {
  working?: boolean
  onAvatarClick: () => void
  phase: Phase
  skinTint?: string
  avatar?: AvatarConfig | null
  equipped?: Set<string>
  nivel?: number
}) {
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
        shadow-bias={-0.0005}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      <directionalLight color="#bcd0ff" intensity={0.5} position={[-10, 8, -6]} />
      <pointLight color="#ffcf8a" intensity={6 + L.lampI * 0.15} distance={40} decay={2} position={[4, 7, -4]} />

      <CartoonOffice
        working={working}
        skinTint={skinTint}
        avatar={avatar}
        equipped={equipped}
        nivel={nivel}
        onAvatarClick={onAvatarClick}
      />
      {equipped?.has("pet-cachorro") && <PetBeagle recuo={recuoDaSala(nivel)} />}

      <ContactShadows position={[0, 0.02, -4 * (0.9 + recuoDaSala(nivel))]} opacity={0.3} scale={20} blur={2.6} far={9} />
    </>
  )
}

export function OfficeScene3D({
  working = false, onAvatarClick = () => {}, avatar, equipped, skinTint, nivel, className,
}: OfficeScene3DProps) {
  // Sala maior → afasta a câmera na mesma proporção (senão as paredes novas
  // saem do enquadramento) e mira na pessoa, que recuou junto com a mesa.
  const camD = 18 * (tamanhoDaSala(nivel) / 4)
  const alvoZ = -4 * (0.9 + recuoDaSala(nivel))
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
        <OrthographicCamera
          makeDefault
          manual
          position={[16, 14, 16]}
          left={(-camD * CAM_ASP) / 2}
          right={(camD * CAM_ASP) / 2}
          top={camD / 2}
          bottom={-camD / 2}
          near={-100}
          far={300}
          onUpdate={(c) => c.lookAt(0, 3.4, alvoZ)}
        />
        <Scene
          working={working}
          onAvatarClick={onAvatarClick}
          phase={phase}
          skinTint={skinTint}
          avatar={avatar}
          equipped={equipped}
          nivel={nivel}
        />
      </Canvas>
    </div>
  )
}
