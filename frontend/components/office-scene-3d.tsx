"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Environment, Lightformer, OrthographicCamera, useGLTF } from "@react-three/drei"
import { ACESFilmicToneMapping, Box3, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3, type DirectionalLight, type Material, type MeshStandardMaterial, type OrthographicCamera as ThreeOrthoCam } from "three"
import {
  fitOrthoCamera, apontarCamera, azimuteApos, centroDoConteudo, passoDoGiro,
  AZIMUTE_PADRAO, CAMERA_POS,
} from "@/lib/office-camera"
import { OfficeBloom, marcarQuemAcende } from "@/components/office-bloom"
import { resolveOfficeBg } from "@/lib/office-bg"
import {
  CELEBRATION_MS, buildConfetti, confettiAt, confettiOpacity, jumpHeight, bodyWiggle,
} from "@/lib/office-celebration"
import { useTheme } from "next-themes"
import {
  buildEscritorio, buildPersonagem, recuoDaSala, PIVO_ANTEBRACO,
  type EscritorioExtras, type ParedeTipo, type PersonagemCores, type PisoTipo,
} from "@/lib/office-model"
import { acessoriosEquipados } from "@/lib/avatar-accessories"
import { faseDaHora, type FaseDoDia } from "@/lib/office-city"
import { typingTap, typingRamp } from "@/lib/office-typing"
import { rolagemDoCodigo, deslocamentoEm } from "@/lib/office-code-scroll"
import { segmentoDaGota, chuvaLigadaNoMix, type Gota } from "@/lib/office-rain"
import { TickerDoGsap } from "@/components/r3f-ticker"
import { MIXER_STORAGE_KEY, MIXER_CHANGED_EVENT } from "@/hooks/use-sound-mixer"
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

type Phase = FaseDoDia
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
  "parede-terracota": "#c07a5c", "parede-mostarda": "#d3a94e", "parede-oliva": "#7a8459",
  // Tijolinho, ripado e cimento NÃO entram aqui: a cor deles vem da textura, e
  // uma cor por baixo multiplicaria o desenho inteiro (ver texturaDaParede).
}
// O piso tem duas metades: a COR (aqui) e o DESENHO (PisoTipo, abaixo). Cor
// sozinha nunca fez madeira — o antigo "piso de madeira" era um retângulo marrom.
const FLOOR_COLORS: Record<string, string> = {
  "piso-madeira": "#b07b46",
  "piso-carpete": "#8aa0b8",
  "piso-madeira-escura": "#5d4227",
  "piso-porcelanato": "#d8d6d1",
  "piso-cimento": "#9b9894",
}
const WALL_PATTERNS: Record<string, ParedeTipo> = {
  "parede-papel": "listrada",
  "parede-tijolinho": "tijolo",
  "parede-ripada": "ripada",
  "parede-cimento": "cimento",
}
const FLOOR_PATTERNS: Record<string, PisoTipo> = {
  "piso-madeira": "tabua",
  "piso-madeira-escura": "tabua",
  "piso-porcelanato": "ladrilho",
}
const CHAIR_COLORS: Record<string, string> = { "cadeira-ergonomica": "#3a4250", "cadeira-gamer": "#b23b3b" }
function pick(map: Record<string, string>, equipped: Set<string> | undefined): string | undefined {
  if (equipped) for (const id in map) if (equipped.has(id)) return map[id]
  return undefined
}

function paredeTipoDe(equipped?: Set<string>): ParedeTipo {
  if (equipped) for (const id in WALL_PATTERNS) if (equipped.has(id)) return WALL_PATTERNS[id]
  return "lisa"
}

function pisoTipoDe(equipped?: Set<string>): PisoTipo {
  if (equipped) for (const id in FLOOR_PATTERNS) if (equipped.has(id)) return FLOOR_PATTERNS[id]
  return "liso"
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
    sofa: equipped.has("sofa"),
    poltrona: equipped.has("poltrona"),
    mesaCentro: equipped.has("mesa-centro"),
    quadro: equipped.has("quadro-montanhas"),
    neon: equipped.has("quadro-neon"),
    trofeu: equipped.has("trofeu"),
    gato: equipped.has("pet-gato"),
    setup: equipped.has("setup-ultrawide") ? "ultrawide"
      : equipped.has("setup-duplo") ? "duplo"
      : equipped.has("setup-notebook") ? "notebook"
      : undefined,
    relogio: equipped.has("relogio"),
    prateleira: equipped.has("prateleira"),
    ledRgb: equipped.has("led-rgb"),
  }
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
  // Ele fica no chão. Antes era `position.y = |sin(t·2,2)| · 0,08` — um pulinho
  // contínuo, sem pata no chão e sem pausa nenhuma, que de longe lê como um
  // cachorro flutuando. Cachorro parado não pula: respira e olha em volta.
  //
  // A respiração é escala, não altura: o corpo incha um triz e volta, com as
  // patas paradas onde estão. Os dois tempos não se dividem (1,6 e 0,7), então
  // o balanço da cabeça não cai sempre no mesmo ponto do fôlego — é o que evita
  // o ar de brinquedo de corda.
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const folego = 1 + Math.sin(t * 1.6) * 0.018
    ref.current.scale.set(1, folego, folego)
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

// Chove na janela quando o som de Chuva está ligado no mixer. Não há previsão
// do tempo no app, e inventar chuva seria decorar com dado falso — então o
// gatilho é o que o usuário já escolheu ouvir.
function useChuvaLigada() {
  const [chovendo, setChovendo] = useState(false)

  useEffect(() => {
    const ler = () => {
      try {
        setChovendo(chuvaLigadaNoMix(localStorage.getItem(MIXER_STORAGE_KEY)))
      } catch {
        setChovendo(false) // localStorage bloqueado (modo privado, iframe)
      }
    }
    ler()
    window.addEventListener(MIXER_CHANGED_EVENT, ler)
    window.addEventListener("storage", ler) // mixer mexido em outra aba
    return () => {
      window.removeEventListener(MIXER_CHANGED_EVENT, ler)
      window.removeEventListener("storage", ler)
    }
  }, [])

  return chovendo
}

// Cena cartoon NATIVA (sala + personagem em código, a partir dos scripts
// Blender build_escritorio_base / build_personagem_base). Toon-shaded. O
// monitor brilha mais quando "trabalhando" e o boneco respira (useFrame).
// Coords Z-up → Y-up via group.
function CartoonOffice({
  working, avatar, equipped, nivel, fase, onAvatarClick, festaRef,
}: {
  working?: boolean
  avatar?: AvatarConfig | null
  equipped?: Set<string>
  nivel?: number
  /** Hora do dia: a vista da janela é pintada com ela. */
  fase: FaseDoDia
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
        fase,
        extras: extrasDe(equipped),
        cores: {
          parede: pick(WALL_COLORS, equipped),
          piso: pick(FLOOR_COLORS, equipped),
          cadeira: pick(CHAIR_COLORS, equipped),
        },
        cadeira: cadeiraTipoDe(equipped),
        piso: pisoTipoDe(equipped),
        parede: paredeTipoDe(equipped),
      })
      // Quem tem emissivo forte entra na camada do bloom (neon, telas, LEDs).
      marcarQuemAcende(r)
      return r
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipKey, nivel, fase]
  )
  const person = useMemo(
    () => {
      return buildPersonagem(coresDoAvatar(avatar), acessoriosEquipados(equipped))
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
  // Nuvens da janela: guardadas com o x de origem, porque a animação as arrasta
  // a partir dele (somar deslocamento sobre a posição atual acumularia erro e
  // elas iriam embora com o tempo).
  // Barras do código na tela: guardam de onde saíram e a altura da tela, que é
  // o que a rolagem precisa para dar a volta (ver lib/office-code-scroll).
  const barrasDeCodigo = useMemo(() => {
    const out: { mesh: Mesh; base: number; alt: number; eixo: "y" | "z" }[] = []
    room.traverse((o) => {
      const r = (o as Mesh).userData?.rolagem as { base: number; alt: number; eixo: "y" | "z" } | undefined
      if (r) out.push({ mesh: o as Mesh, ...r })
    })
    return out
  }, [room])
  const nuvens = useMemo(() => {
    const out: { mesh: Mesh; x0: number }[] = []
    room.traverse((o) => {
      if ((o as Mesh).isMesh && o.name.startsWith("Janela_Nuvem_")) out.push({ mesh: o as Mesh, x0: o.position.x })
    })
    return out
  }, [room])
  // Gotas no vidro: guardam a própria fase/velocidade e o vão em que correm
  // (ver lib/office-rain). Sem janela comprada, a lista vem vazia.
  const gotas = useMemo(() => {
    const out: { mesh: Mesh; gota: Gota; topoZ: number; altura: number }[] = []
    room.traverse((o) => {
      const c = (o as Mesh).userData?.chuva as { gota: Gota; topoZ: number; altura: number } | undefined
      if (c) out.push({ mesh: o as Mesh, ...c })
    })
    return out
  }, [room])
  const chovendo = useChuvaLigada()
  // Ligar/desligar é troca de visibilidade, não reconstrução da sala: rebuildar
  // o modelo a cada clique no mixer piscaria a cena inteira.
  useEffect(() => {
    for (const { mesh } of gotas) mesh.visible = chovendo
  }, [gotas, chovendo])
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
    // A tela acende na cena sem espalhar halo: ela está fora do bloom (semBloom
    // no modelo), então o valor aqui é só o brilho dela mesma. Um pouco abaixo
    // do original — com o bloom nos LEDs em volta, ela não precisa gritar.
    const glow = comemorando ? 1.9 : working ? 1.6 : 0.85 + Math.sin(t * 1.5) * 0.1
    for (const tela of telas) (tela.material as MeshStandardMaterial).emissiveIntensity = glow
    // O código rola: devagar quando a sala está parada, bem mais rápido quando
    // há trabalho em andamento. É o mesmo sinal do brilho e das mãos no teclado.
    if (barrasDeCodigo.length > 0) {
      const d = deslocamentoEm(t, !!working)
      for (const b of barrasDeCodigo) {
        b.mesh.position[b.eixo] = rolagemDoCodigo(b.base, b.alt, d)
      }
    }
    // Nuvens atravessando a janela, cada uma no seu ritmo. Bem devagar: o que
    // se quer é a sensação de que lá fora o tempo passa, não movimento na
    // periferia de quem está tentando trabalhar.
    for (let i = 0; i < nuvens.length; i++) {
      const { mesh, x0 } = nuvens[i]
      const periodo = 90 + i * 34
      const volta = ((t / periodo + i * 0.37) % 1) * 2 - 1 // -1 → 1, e recomeça
      mesh.position.x = x0 + volta * 0.9
    }
    // Chuva escorrendo no vidro. Só conta quando está chovendo — com o mixer
    // desligado as gotas estão invisíveis e mexer nelas seria trabalho jogado
    // fora a 60 quadros por segundo.
    if (chovendo) {
      for (const { mesh, gota, topoZ, altura } of gotas) {
        const { centroZ, escalaZ } = segmentoDaGota(gota, t, topoZ, altura)
        mesh.position.z = centroZ
        mesh.scale.z = escalaZ
      }
    }
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
function FitCamera({
  contentRef, dep, azimuteRef, alvoRef,
}: {
  contentRef: React.RefObject<Group | null>
  dep: string
  /** A volta em que a câmera está — escrita pelo arrasto, lida por quadro. */
  azimuteRef: React.RefObject<number>
  /** Para onde ela quer ir. Arrastando os dois andam juntos; no duplo clique
   *  só o alvo muda, e o giro corre atrás dele. */
  alvoRef: React.RefObject<number>
}) {
  const cam = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const centroRef = useRef<Vector3 | null>(null)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (content && (cam as ThreeOrthoCam).isOrthographicCamera) {
      fitOrthoCamera(cam as ThreeOrthoCam, content, size.width / size.height, 1.06, azimuteRef.current)
      centroRef.current = centroDoConteudo(content)
    }
  }, [cam, size.width, size.height, dep, contentRef, azimuteRef])

  useFrame((_, delta) => {
    const centro = centroRef.current
    if (!centro || !(cam as ThreeOrthoCam).isOrthographicCamera) return
    const alvo = alvoRef.current
    const atual = azimuteRef.current
    if (Math.abs(alvo - atual) < 1e-5) return
    // Um resto de amortecimento, e não o valor cru do arrasto: com meia-vida de
    // 50 ms o arrasto continua colado no dedo, e o duplo clique ganha de graça
    // uma volta suave em vez de um salto.
    azimuteRef.current = atual + (alvo - atual) * passoDoGiro(delta)
    apontarCamera(cam as ThreeOrthoCam, azimuteRef.current, centro)
  })

  return null
}

/**
 * Sombra sob demanda.
 *
 * O mapa de sombra é um RENDER INTEIRO da cena, a 2048², e o three.js o refaz a
 * cada quadro por padrão — para uma sala que está parada. Era o quadro mais caro
 * do Escritório sem nada em troca: móvel, parede e planta projetam exatamente a
 * mesma sombra no quadro seguinte.
 *
 * Então ele só é refeito quando a cena muda de verdade (item equipado, nível,
 * hora do dia) e enquanto a sala comemora — que é a única hora em que alguém
 * sai do lugar o bastante para a sombra mudar. Respirar e digitar mexem menos
 * de um pixel de sombra: congelar ali é invisível.
 */
function SombraSobDemanda({
  luzRef, festaRef, chave,
}: {
  luzRef: React.RefObject<DirectionalLight | null>
  festaRef: React.RefObject<number>
  chave: string
}) {
  // Alguns quadros, não um: no quadro em que a sala é trocada a malha nova pode
  // ainda não ter entrado no grafo, e a sombra sairia da sala antiga.
  const restantes = useRef(0)

  useEffect(() => {
    const luz = luzRef.current
    if (!luz) return
    luz.shadow.autoUpdate = false
    restantes.current = 3
  }, [chave, luzRef])

  useFrame(() => {
    const luz = luzRef.current
    if (!luz) return
    const comemorando = progressoDaFesta(festaRef) < 1
    if (!comemorando && restantes.current <= 0) return
    luz.shadow.needsUpdate = true
    if (restantes.current > 0) restantes.current--
  })

  return null
}

function Scene({
  working, onAvatarClick, phase, avatar, equipped, nivel, celebrateNonce, bloom, azimuteRef, alvoRef,
}: {
  working?: boolean
  onAvatarClick: () => void
  phase: Phase
  avatar?: AvatarConfig | null
  equipped?: Set<string>
  nivel?: number
  celebrateNonce?: number
  bloom?: boolean
  azimuteRef: React.RefObject<number>
  alvoRef: React.RefObject<number>
}) {
  const L = LIGHT[phase]
  const contentRef = useRef<Group>(null)
  const luzRef = useRef<DirectionalLight>(null)
  // Tudo que faz a sala mudar de forma — e portanto de sombra.
  const chaveDaCena = [phase, nivel ?? 1, [...(equipped ?? [])].sort().join("|")].join("·")
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
        ref={luzRef}
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
          fase={phase}
          onAvatarClick={onAvatarClick}
          festaRef={festaRef}
        />
      </group>
      <FitCamera contentRef={contentRef} dep={String(nivel ?? 1)} azimuteRef={azimuteRef} alvoRef={alvoRef} />
      <SombraSobDemanda luzRef={luzRef} festaRef={festaRef} chave={chaveDaCena} />
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

      {/* Bloom seletivo — dois renders por quadro, então só onde compensa: numa
          tela grande. Em tela pequena a cena já é minúscula, o brilho não se
          veria e o custo cairia justo em quem tem menos GPU. */}
      {bloom && <OfficeBloom />}
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

/**
 * Renderizar só o que está à vista. A página do Escritório é comprida — a loja
 * inteira vem abaixo da sala — e o Canvas continuava desenhando a 60 fps para
 * ninguém enquanto a pessoa rolava escolhendo item. Aqui o loop simplesmente
 * para quando a sala sai da tela e volta quando ela reaparece.
 */
function useNaTela<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [naTela, setNaTela] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const obs = new IntersectionObserver(([e]) => setNaTela(e.isIntersecting), {
      // Uma folga: a sala volta a animar um pouco antes de aparecer, para não
      // entrar na tela congelada e "acordar" na frente de quem está olhando.
      rootMargin: "200px",
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])

  return naTela
}

export function OfficeScene3D({
  working = false, onAvatarClick = () => {}, avatar, equipped, nivel, bgColor, celebrateNonce, className,
}: OfficeScene3DProps) {
  const [phase, setPhase] = useState<Phase>("day")
  const caixaRef = useRef<HTMLDivElement>(null)
  const naTela = useNaTela(caixaRef)
  // Síncrono no PRIMEIRO render: num useEffect o <Canvas> já teria montado e
  // estourado antes da checagem. A cena só entra por dynamic(ssr:false), então
  // aqui é sempre cliente — o typeof é só cinto de segurança.
  const [webgl] = useState(() => (typeof window === "undefined" ? true : temWebGL()))
  // Quem desenha a sala é o TickerDoGsap, então o Canvas fica em "never" e só
  // anda quando mandam. O socorro é o caminho de volta: se os quadros pararem
  // de chegar, o R3F reassume o loop dele. Sem essa saída, um ticker perdido
  // não deixaria a cena lenta — deixaria congelada, e sem nada explicando.
  const [socorro, setSocorro] = useState(false)
  const socorrer = useCallback(() => setSocorro(true), [])

  // ---- Girar a vista com o mouse ("mãozinha") ----
  //
  // Arrastar para a direita leva a câmera para a esquerda da cena, que é o que
  // faz a sala parecer virar junto com a mão. Os limites estão em
  // lib/office-camera: fora deles uma parede entra na frente da sala.
  const azimuteRef = useRef(AZIMUTE_PADRAO)
  const alvoRef = useRef(AZIMUTE_PADRAO)
  const arrastoRef = useRef<{ id: number; x: number; base: number; andou: boolean } | null>(null)
  const [arrastando, setArrastando] = useState(false)

  const comecarArrasto = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    arrastoRef.current = { id: e.pointerId, x: e.clientX, base: alvoRef.current, andou: false }
    setArrastando(true)
  }

  // O resto do arrasto mora na JANELA, e não em `setPointerCapture` no container.
  // Capturar aqui redirecionaria os eventos para esta div, o canvas nunca veria
  // o pointerup e o clique no boneco deixaria de existir — a captura conserta o
  // arrasto que sai da caixa e quebra a única interação que a cena já tinha.
  useEffect(() => {
    if (!arrastando) return
    const mover = (e: PointerEvent) => {
      const a = arrastoRef.current
      if (!a || a.id !== e.pointerId) return
      const dx = e.clientX - a.x
      // Uns poucos pixels de tolerância: sem isso o tremor de um clique no
      // boneco contaria como arrasto e engoliria o clique.
      if (Math.abs(dx) > 4) a.andou = true
      alvoRef.current = azimuteApos(a.base, dx)
    }
    // Sai depois do clique do R3F: o canvas recebe o pointerup na fase de alvo,
    // a janela só na de borbulha. Limpar antes apagaria o "andou" que o clique
    // do boneco consulta.
    const soltar = (e: PointerEvent) => {
      const a = arrastoRef.current
      if (!a || a.id !== e.pointerId) return
      arrastoRef.current = null
      setArrastando(false)
    }
    window.addEventListener("pointermove", mover)
    window.addEventListener("pointerup", soltar)
    window.addEventListener("pointercancel", soltar)
    return () => {
      window.removeEventListener("pointermove", mover)
      window.removeEventListener("pointerup", soltar)
      window.removeEventListener("pointercancel", soltar)
    }
  }, [arrastando])

  // Duplo clique devolve a vista ao ângulo de sempre — sem isso não há caminho
  // de volta de uma volta esquisita a não ser recarregar a página.
  const voltarAoAngulo = () => { alvoRef.current = AZIMUTE_PADRAO }

  // O clique no boneco só vale se a mão não arrastou: numa volta de câmera,
  // abrir o editor de avatar no fim seria o oposto do que se pediu.
  const clicarNoAvatar = useCallback(() => {
    if (arrastoRef.current?.andou) return
    onAvatarClick()
  }, [onAvatarClick])
  // Bloom custa DOIS renders por quadro. Em tela pequena a cena já é minúscula
  // (o halo mal se veria) e o custo cairia justamente em quem tem menos GPU —
  // então ali ele não entra. É a regra de "efeito pesado" do roadmap.
  const [bloom, setBloom] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const ler = () => setBloom(mq.matches)
    ler()
    mq.addEventListener("change", ler)
    return () => mq.removeEventListener("change", ler)
  }, [])
  useEffect(() => {
    const tick = () => setPhase(faseDaHora(new Date().getHours()))
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
    <div
      ref={caixaRef}
      className={className}
      // `pan-y` e não `none`: a página do Escritório é comprida, e roubar a
      // rolagem vertical do dedo para girar a sala seria trocar uma coisa útil
      // por um enfeite. O arrasto horizontal é nosso; o vertical continua sendo
      // da página.
      style={{
        position: "relative",
        background: bgStyle,
        touchAction: "pan-y",
        cursor: arrastando ? "grabbing" : "grab",
        userSelect: "none",
      }}
      onPointerDown={comecarArrasto}
      onDoubleClick={voltarAoAngulo}
    >
      <Canvas
        shadows="soft"
        // Fora da tela nada desenha, nos dois arranjos: a página é comprida e a
        // loja inteira vem abaixo da sala.
        frameloop={socorro && naTela ? "always" : "never"}
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
        {!socorro && <TickerDoGsap ativo={naTela} onSocorro={socorrer} />}
        <Scene
          working={working}
          onAvatarClick={clicarNoAvatar}
          azimuteRef={azimuteRef}
          alvoRef={alvoRef}
          phase={phase}
          avatar={avatar}
          equipped={equipped}
          nivel={nivel}
          celebrateNonce={celebrateNonce}
          bloom={bloom}
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
