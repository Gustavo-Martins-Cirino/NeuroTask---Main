"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Environment, Lightformer, OrthographicCamera, useGLTF } from "@react-three/drei"
import { ACESFilmicToneMapping, Box3, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3, type Material, type MeshStandardMaterial, type OrthographicCamera as ThreeOrthoCam } from "three"
import { fitOrthoCamera, CAMERA_POS } from "@/lib/office-camera"
import { resolveOfficeBg } from "@/lib/office-bg"
import {
  CELEBRATION_MS, buildConfetti, confettiAt, confettiOpacity, jumpHeight, bodyWiggle,
} from "@/lib/office-celebration"
import { useTheme } from "next-themes"
import {
  buildEscritorio, buildPersonagem, recuoDaSala, PIVO_ANTEBRACO,
  type EscritorioExtras, type PersonagemAcessorios, type PersonagemCores,
} from "@/lib/office-model"
import { typingTap, typingRamp } from "@/lib/office-typing"
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
  /** Nível do dono da sala — ela cresce em degraus conforme ele sobe. */
  nivel?: number
  /** Cor de fundo escolhida ("auto" = gradiente pela hora do dia). */
  bgColor?: string
  /** Muda a cada conclusão de trabalho real: a sala comemora. Ver
   *  hooks/use-office-celebration (0 = sala parada). */
  celebrateNonce?: number
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
const WALL_COLORS: Record<string, string> = {
  "parede-azul": "#8fb3d9", "parede-verde": "#9ec6a6", "parede-rosa": "#e5b5c8",
  "parede-cinza": "#8f939a", "parede-preta": "#232329", "parede-papel": "#cfc4b4",
}
const FLOOR_COLORS: Record<string, string> = { "piso-madeira": "#b5824f", "piso-carpete": "#8aa0b8" }
const CHAIR_COLORS: Record<string, string> = { "cadeira-ergonomica": "#3a4250", "cadeira-gamer": "#b23b3b" }
function pick(map: Record<string, string>, equipped: Set<string> | undefined): string | undefined {
  if (equipped) for (const id in map) if (equipped.has(id)) return map[id]
  return undefined
}

function cadeiraTipoDe(equipped?: Set<string>): "padrao" | "ergonomica" | "gamer" {
  if (equipped?.has("cadeira-gamer")) return "gamer"
  if (equipped?.has("cadeira-ergonomica")) return "ergonomica"
  return "padrao"
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
    setup: equipped.has("setup-ultrawide") ? "ultrawide"
      : equipped.has("setup-duplo") ? "duplo"
      : equipped.has("setup-notebook") ? "notebook"
      : undefined,
    papelParede: equipped.has("parede-papel"),
    relogio: equipped.has("relogio"),
    prateleira: equipped.has("prateleira"),
    ledRgb: equipped.has("led-rgb"),
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

// Pele/cabelo/roupa vêm do editor de avatar — de graça, sem loja no meio.
function coresDoAvatar(avatar?: AvatarConfig | null): PersonagemCores {
  const c: PersonagemCores = {}
  if (avatar) {
    c.pele = avatar.skin
    c.cabelo = avatar.hairColor
    c.camisa = avatar.outfitColor
  }
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
      // Pelo fosco: sem toon, o beagle passa a receber a luz como o resto da sala.
      const tint = (mat: Material): Material => {
        const cl = (mat as MeshStandardMaterial).clone()
        if (!cl.map) cl.color = brown
        cl.roughness = 0.9
        cl.metalness = 0
        return cl
      }
      m.material = Array.isArray(m.material) ? m.material.map(tint) : tint(m.material)
    })
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

const CONFETTI_N = 36

/** Progresso da festa (0→1). ≥ 1 significa "acabou" (ou nunca começou). */
function progressoDaFesta(ref?: React.RefObject<number>): number {
  if (!ref?.current) return 1
  return (performance.now() - ref.current) / CELEBRATION_MS
}

// Confete da comemoração, em coordenadas da sala (z = altura). Fica montado e
// invisível: a festa dura ~2,6 s e não vale remontar 36 malhas por conclusão.
// As posições são determinísticas (lib/office-celebration) — o mesmo confete a
// cada quadro, sem papel teleportando.
function Confete({ startRef, recuo = 0 }: { startRef: React.RefObject<number>; recuo?: number }) {
  const ref = useRef<Group>(null)
  const { pieces, group, materials } = useMemo(() => {
    const pieces = buildConfetti(CONFETTI_N)
    const geo = new PlaneGeometry(0.075, 0.11)
    const materials = new Map<string, MeshBasicMaterial>()
    const group = new Group()
    for (const p of pieces) {
      let mat = materials.get(p.color)
      if (!mat) {
        mat = new MeshBasicMaterial({ color: new Color(p.color), side: DoubleSide, transparent: true })
        materials.set(p.color, mat)
      }
      group.add(new Mesh(geo, mat))
    }
    return { pieces, group, materials }
  }, [])

  useFrame(() => {
    const g = ref.current
    if (!g) return
    const p = progressoDaFesta(startRef)
    if (p >= 1) {
      if (g.visible) g.visible = false
      return
    }
    g.visible = true
    const o = confettiOpacity(p)
    for (const m of materials.values()) m.opacity = o
    group.children.forEach((child, i) => {
      const { x, y, z, rot } = confettiAt(pieces[i], p)
      child.position.set(x, y, z)
      child.rotation.set(rot, rot * 0.7, rot * 1.3)
    })
  })

  return (
    <group ref={ref} position={[0, recuo, 0]} visible={false}>
      <primitive object={group} />
    </group>
  )
}

// Cena cartoon NATIVA (sala + personagem em código, a partir dos scripts
// Blender build_escritorio_base / build_personagem_base). Toon-shaded. O
// monitor brilha mais quando "trabalhando" e o boneco respira (useFrame).
// Coords Z-up → Y-up via group.
function CartoonOffice({
  working, avatar, equipped, nivel, onAvatarClick, festaRef,
}: {
  working?: boolean
  avatar?: AvatarConfig | null
  equipped?: Set<string>
  nivel?: number
  onAvatarClick?: () => void
  /** Instante em que a comemoração começou (performance.now); 0 = sala parada. */
  festaRef?: React.RefObject<number>
}) {
  // Chave estável: o Set costuma ser recriado a cada render (prévia da loja).
  const equipKey = [...(equipped ?? [])].sort().join("|")
  const room = useMemo(
    () => {
      const r = buildEscritorio({
        nivel,
        extras: extrasDe(equipped),
        cores: {
          parede: pick(WALL_COLORS, equipped),
          piso: pick(FLOOR_COLORS, equipped),
          cadeira: pick(CHAIR_COLORS, equipped),
        },
        cadeira: cadeiraTipoDe(equipped),
      })
      return r
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipKey, nivel]
  )
  const person = useMemo(
    () => {
      return buildPersonagem(coresDoAvatar(avatar), acessoriosDe(equipped))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [avatar, equipKey]
  )
  const personRef = useRef<Group>(null)
  // Todas as telas (o setup duplo tem duas) brilham juntas ao "trabalhar".
  const telas = useMemo(() => {
    const out: Mesh[] = []
    room.traverse((o) => { if ((o as Mesh).isMesh && o.name.startsWith("Monitor_Tela")) out.push(o as Mesh) })
    return out
  }, [room])
  // Os dois cotovelos: girá-los é o boneco digitando (ver lib/office-typing).
  const cotovelos = useMemo(() => {
    const out: { pivo: Group; lado: 1 | -1 }[] = []
    person.traverse((o) => {
      if (!o.name.startsWith(PIVO_ANTEBRACO)) return
      out.push({ pivo: o as Group, lado: o.name.endsWith("Direito") ? 1 : -1 })
    })
    return out
  }, [person])
  // Intensidade da digitação (0→1). Num ref porque quem lê é o useFrame.
  const digitandoRef = useRef(0)
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const festa = progressoDaFesta(festaRef)
    const comemorando = festa < 1
    const glow = comemorando ? 2.6 : working ? 2.2 : 1.0 + Math.sin(t * 1.5) * 0.12
    for (const tela of telas) (tela.material as MeshStandardMaterial).emissiveIntensity = glow
    // Comemorando, as mãos saem do teclado: quem pula não digita.
    digitandoRef.current = typingRamp(digitandoRef.current, !!working && !comemorando, delta)
    const intensidade = digitandoRef.current
    for (const { pivo, lado } of cotovelos) {
      pivo.rotation.x = intensidade > 0.001 ? typingTap(t, lado) * intensidade : 0
    }
    if (personRef.current) {
      personRef.current.position.z = Math.sin(t * 1.7) * 0.012 // respiração
      // Pula e balança. O eixo Y local passa pelos pés (x=0, z=0), então a
      // inclinação vira uma dança apoiada no chão — não um giro em volta da sala.
      personRef.current.position.z += comemorando ? jumpHeight(festa) : 0
      personRef.current.rotation.y = comemorando ? bodyWiggle(festa) : 0
    }
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

// Reenquadra a câmera no conteúdo quando a sala muda de tamanho (nível) ou o
// canvas é redimensionado — sala centralizada e cheia em qualquer nível. Não
// depende dos itens equipados (todos cabem dentro da casca), então prever um
// chapéu na loja não faz a câmera pular.
function FitCamera({ contentRef, dep }: { contentRef: React.RefObject<Group | null>; dep: string }) {
  const cam = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useLayoutEffect(() => {
    const content = contentRef.current
    if (content && (cam as ThreeOrthoCam).isOrthographicCamera) {
      fitOrthoCamera(cam as ThreeOrthoCam, content, size.width / size.height)
    }
  }, [cam, size.width, size.height, dep, contentRef])
  return null
}

function Scene({
  working, onAvatarClick, phase, avatar, equipped, nivel, celebrateNonce,
}: {
  working?: boolean
  onAvatarClick: () => void
  phase: Phase
  avatar?: AvatarConfig | null
  equipped?: Set<string>
  nivel?: number
  celebrateNonce?: number
}) {
  const L = LIGHT[phase]
  const contentRef = useRef<Group>(null)
  // Início da comemoração (performance.now); 0 = sala parada. Vive num ref
  // porque quem lê é o useFrame, não o render.
  const festaRef = useRef(0)
  useEffect(() => {
    if (celebrateNonce && celebrateNonce > 0) festaRef.current = performance.now()
  }, [celebrateNonce])
  return (
    <>
      {/* Environment PROCEDURAL (nada baixado da rede): painéis de luz viram um
          cubemap que os materiais PBR refletem. É o que dá "peso" de 3D — sem
          isso metal e cerâmica ficam chapados feito desenho. frames={1}: gera
          uma vez, não a cada quadro. */}
      <Environment resolution={128} frames={1} environmentIntensity={0.4}>
        <Lightformer intensity={2.4} color={L.key} position={[0, 6, 4]} scale={[12, 8, 1]} />
        <Lightformer intensity={1.1} color="#bcd0ff" position={[-8, 4, -4]} scale={[8, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer intensity={0.7} color="#8a6a4a" position={[0, -5, 0]} scale={[12, 12, 1]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>

      {/* fill macio (céu/chão) + key quente com sombra + fill frio + luminária.
          Intensidades menores que na era toon: o environment já preenche. */}
      <hemisphereLight args={["#fff1e0", "#9a7b5a", L.hemiI * 0.55]} />
      <directionalLight
        color={L.key}
        intensity={L.keyI * 0.85}
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
      <directionalLight color="#bcd0ff" intensity={0.28} position={[-10, 8, -6]} />
      {/* Luz de recorte por trás/alto: um fio de luz na borda superior separa o
          boneco e os móveis do fundo — dá profundidade sem clarear a cena. */}
      <directionalLight color={L.key} intensity={0.5} position={[-6, 12, -12]} />
      <pointLight color="#ffcf8a" intensity={4 + L.lampI * 0.12} distance={40} decay={2} position={[4, 7, -4]} />

      <group ref={contentRef}>
        <CartoonOffice
          working={working}
          avatar={avatar}
          equipped={equipped}
          nivel={nivel}
          onAvatarClick={onAvatarClick}
          festaRef={festaRef}
        />
      </group>
      <FitCamera contentRef={contentRef} dep={String(nivel ?? 1)} />
      {/* Fora do contentRef de propósito: o confete não pode entrar na conta do
          auto-fit, senão a sala encolheria para caber num papelzinho no teto. */}
      <group rotation={[-Math.PI / 2, 0, 0]} scale={4}>
        <Confete startRef={festaRef} recuo={recuoDaSala(nivel)} />
      </group>
      {equipped?.has("pet-cachorro") && <PetBeagle recuo={recuoDaSala(nivel)} />}

      {/* Duas camadas: uma ampla e suave (ambiente) + uma justa e mais escura
          logo sob os móveis (contato) — assenta tudo no chão sem virar borrão. */}
      <ContactShadows position={[0, 0.02, -4 * (0.9 + recuoDaSala(nivel))]} opacity={0.28} scale={22} blur={3.0} far={9} />
      <ContactShadows position={[0, 0.03, -4 * (0.9 + recuoDaSala(nivel))]} opacity={0.35} scale={12} blur={1.4} far={5} />
    </>
  )
}

// Sem WebGL o <Canvas> do R3F estoura e derruba a página inteira. Aqui a cena
// simplesmente não aparece e o resto (loja, avatar, visita) continua de pé.
function temWebGL() {
  try {
    const c = document.createElement("canvas")
    return !!(c.getContext("webgl2") || c.getContext("webgl"))
  } catch {
    return false
  }
}

export function OfficeScene3D({
  working = false, onAvatarClick = () => {}, avatar, equipped, nivel, bgColor, celebrateNonce, className,
}: OfficeScene3DProps) {
  const [phase, setPhase] = useState<Phase>("day")
  // Síncrono no PRIMEIRO render: num useEffect o <Canvas> já teria montado e
  // estourado antes da checagem. A cena só entra por dynamic(ssr:false), então
  // aqui é sempre cliente — o typeof é só cinto de segurança.
  const [webgl] = useState(() => (typeof window === "undefined" ? true : temWebGL()))
  useEffect(() => {
    const tick = () => setPhase(phaseOf(new Date().getHours()))
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [])

  // Fundo: cor fixa escolhida, ou "Automático" seguindo o tema (claro/escuro).
  // A hora do dia continua mandando na LUZ interna da cena (LIGHT[phase]), só
  // não no fundo. resolvedTheme pode vir undefined no 1º render → trata como claro.
  const { resolvedTheme } = useTheme()
  const bg = resolveOfficeBg(bgColor ?? "auto", resolvedTheme === "dark")
  const bgStyle = `linear-gradient(160deg, ${bg}, ${bg}cc)`

  if (!webgl) {
    return (
      <div className={className} style={{ background: bgStyle }}>
        <div
          className="flex flex-col items-center justify-center gap-1.5 px-6 text-center"
          style={{ width: "100%", aspectRatio: "480 / 340" }}
        >
          <span className="text-3xl">🪑</span>
          <p className="text-sm font-medium text-white/90">Seu escritório precisa de 3D</p>
          <p className="max-w-xs text-xs text-white/70">
            Este navegador está sem WebGL. A loja e o avatar continuam funcionando — abra em
            outro navegador para ver a sala.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: "relative", background: bgStyle }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        // preserveDrawingBuffer: mantém o buffer pra dar pra "tirar foto" da sala
        // (snapshot compartilhável) com canvas.toBlob a qualquer momento.
        // Exposição menor que na era toon: com PBR a luz soma de verdade
        // (environment + key + fill) e 1.18 estourava as paredes.
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
        style={{ width: "100%", aspectRatio: "480 / 340" }}
      >
        {/* Frustum e lookAt vêm do FitCamera (auto-fit); aqui só a posição
            fixa que dá o ângulo isométrico. */}
        <OrthographicCamera makeDefault manual position={CAMERA_POS} near={-100} far={300} />
        <Scene
          working={working}
          onAvatarClick={onAvatarClick}
          phase={phase}
          avatar={avatar}
          equipped={equipped}
          nivel={nivel}
          celebrateNonce={celebrateNonce}
        />
      </Canvas>
      {/* Vinheta suave: escurece só os cantos, focando o olhar no centro. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "inherit",
          background: "radial-gradient(120% 100% at 50% 34%, transparent 56%, rgba(24,18,12,0.24) 100%)",
        }}
      />
    </div>
  )
}
