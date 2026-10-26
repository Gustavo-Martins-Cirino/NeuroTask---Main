// Ambientes PAGOS do Modo Foco — comprados com as moedas do jogo, pela mesma
// loja do Escritório (shop_items + buy_item; ver supabase/foco_cenas.sql).
//
// Cada um nasceu de uma referência visual (Originkit, ShaderGradient, three.js,
// Lenis), mas foi ESCRITO aqui, nos padrões do projeto: desenha no relógio único
// (gsap.ticker), pausa com a aba oculta, congela com movimento reduzido e só é
// carregado por quem escolhe. Do original sobra a ideia, não o código — a mesma
// regra da esfera da Neuro (ver ROADMAP, "A pasta components/inspirações").
//
// Mais caro = mais trabalho por trás e mais útil para o foco: o último acende
// uma estrela a cada 5 minutos focados.
//
// Aqui mora o que é determinístico: o catálogo, os preços (os MESMOS do SQL — o
// teste confere) e a matemática das cenas. O canvas de cada uma vive em
// components/foco-cenas/.

export type IdCena = "correnteza" | "formulas" | "folego" | "buraco-negro" | "constelacao"

export interface CenaDoFoco {
  id: IdCena
  /** O id na loja (shop_items). O prefixo evita colidir com os itens do Escritório. */
  itemId: `foco-${IdCena}`
  preco: number
  /** Cor de fundo enquanto o canvas carrega, e o fundo de quem prefere menos movimento. */
  fundo: string
  /** A prévia no painel de ambientes: CSS puro, para não abrir um WebGL por miniatura. */
  previa: string
}

export const CENAS: CenaDoFoco[] = [
  {
    id: "correnteza",
    itemId: "foco-correnteza",
    preco: 60,
    fundo: "#04050c",
    previa: "radial-gradient(120% 90% at 20% 80%, #2b44d9 0%, transparent 55%), radial-gradient(90% 80% at 85% 20%, #6a35e6 0%, transparent 55%), #04050c",
  },
  {
    id: "formulas",
    itemId: "foco-formulas",
    preco: 120,
    fundo: "#0b0b0e",
    previa: "repeating-linear-gradient(178deg, transparent 0 9px, rgba(232,228,220,0.18) 9px 10px), radial-gradient(60% 60% at 70% 40%, rgba(255,90,20,0.45), transparent 70%), #0b0b0e",
  },
  {
    id: "folego",
    itemId: "foco-folego",
    preco: 200,
    fundo: "#06060f",
    previa: "linear-gradient(160deg, transparent 30%, rgba(255,120,200,0.55) 45%, transparent 55%), linear-gradient(200deg, transparent 40%, rgba(90,200,255,0.55) 52%, transparent 62%), #06060f",
  },
  {
    id: "buraco-negro",
    itemId: "foco-buraco-negro",
    preco: 320,
    fundo: "#000000",
    previa: "radial-gradient(circle at 50% 50%, #000 0 16%, rgba(255,217,160,0.9) 18%, rgba(255,95,0,0.55) 30%, transparent 58%), #000",
  },
  {
    id: "constelacao",
    itemId: "foco-constelacao",
    preco: 480,
    fundo: "#03040a",
    previa: "radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(2px 2px at 60% 25%, #cfe0ff, transparent), radial-gradient(1.5px 1.5px at 75% 70%, #fff, transparent), radial-gradient(2px 2px at 35% 65%, #ffe9b8, transparent), linear-gradient(160deg, #0a1030, #03040a)",
  },
]

export const ID_CENAS = CENAS.map((c) => c.id)

export function cenaPorId(id: string): CenaDoFoco | undefined {
  return CENAS.find((c) => c.id === id)
}

/** A pessoa pode usar a cena: comprou (o item está no inventário dela). */
export function cenaLiberada(id: IdCena, itensComprados: ReadonlySet<string> | readonly string[]): boolean {
  const cena = cenaPorId(id)
  if (!cena) return false
  return Array.isArray(itensComprados) ? itensComprados.includes(cena.itemId) : (itensComprados as ReadonlySet<string>).has(cena.itemId)
}

/** Quantas moedas faltam para comprar (0 = dá para comprar agora). */
export function moedasQueFaltam(preco: number, saldo: number): number {
  return Math.max(0, Math.ceil(preco) - Math.max(0, Math.floor(saldo || 0)))
}

/** Segundos de "experimentar" antes de comprar. */
export const SEGUNDOS_DE_PREVIA = 20

// ---- Matemática das cenas ----

/** Gerador pseudoaleatório com semente (mulberry32): a mesma cena a cada abertura. */
export function aleatorioComSemente(semente: number): () => number {
  let a = semente | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Aproxima `atual` de `alvo` sem depender da taxa de quadros (decaimento exponencial). */
export function suaviza(atual: number, alvo: number, dt: number, taxa: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return atual
  return atual + (alvo - atual) * (1 - Math.exp(-dt * taxa))
}

/** A roda do mouse acumula num valor, dentro de um intervalo. Linha é ~1 "clique". */
export function giraARoda(valor: number, deltaY: number, porClique: number, min: number, max: number): number {
  if (!Number.isFinite(deltaY)) return valor
  // Trackpad manda deltas pequenos e muitos; mouse, ~100 por clique. Normaliza para "cliques".
  const cliques = deltaY / 100
  return Math.min(max, Math.max(min, valor - cliques * porClique))
}

/** "#rrggbb" → [r, g, b] de 0 a 1. Inválido → o padrão. */
export function corHex(hex: string, padrao: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return padrao
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// Fôlego: a respiração guiada. 4 s inspirando, 6 s soltando — expirar mais longo
// que inspirar é o que acalma (o ritmo de respiração lenta usado contra
// ansiedade). As fitas sobem e descem com ela.
export const INSPIRA_S = 4
export const EXPIRA_S = 6

export interface Respiracao {
  fase: "inspira" | "expira"
  /** 0 (vazio) → 1 (cheio), suave nas pontas. */
  cheio: number
}

export function respiracao(tempo: number): Respiracao {
  const ciclo = INSPIRA_S + EXPIRA_S
  const t = ((tempo % ciclo) + ciclo) % ciclo
  const suave = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)))
  if (t < INSPIRA_S) return { fase: "inspira", cheio: suave(t / INSPIRA_S) }
  return { fase: "expira", cheio: 1 - suave((t - INSPIRA_S) / EXPIRA_S) }
}

// Constelação: uma estrela por bloco de 5 minutos da sessão.
export const MINUTOS_POR_ESTRELA = 5

export function estrelasDaSessao(duracaoSegundos: number): number {
  return Math.min(24, Math.max(3, Math.round(duracaoSegundos / 60 / MINUTOS_POR_ESTRELA)))
}

export function estrelasAcesas(progresso: number, total: number): number {
  if (!Number.isFinite(progresso) || progresso <= 0) return 0
  if (progresso >= 1) return total
  return Math.min(total, Math.floor(progresso * total))
}

export interface Estrela {
  /** -1 a 1 nos dois eixos (fração da meia-tela), centrado na tela. */
  x: number
  y: number
  brilho: number
}

/**
 * O miolo da tela é do timer: os números gigantes, a barra e os botões cobririam
 * a estrela. A figura contorna essa área — uma superelipse (quase um retângulo de
 * cantos redondos, como o bloco do timer), em fração da meia-tela.
 */
export const MIOLO_DO_TIMER = { rx: 0.52, ry: 0.5 }
export const LIMITE_DA_FIGURA = { x: 0.85, y: 0.78 }

export function foraDoMiolo(x: number, y: number): boolean {
  return (x / MIOLO_DO_TIMER.rx) ** 4 + (y / MIOLO_DO_TIMER.ry) ** 4 > 1
}

/**
 * O desenho da constelação: um passeio aleatório suave (com semente — a mesma
 * forma toda vez para a mesma duração), sem estrelas grudadas, sem sair da tela
 * e sem passar por trás do timer — ela anda em volta dele.
 */
export function desenhoDaConstelacao(total: number, semente = 1729): Estrela[] {
  const rnd = aleatorioComSemente(semente + total * 7919)
  const estrelas: Estrela[] = []
  let x = -0.72 + rnd() * 0.08
  let y = -0.2 + rnd() * 0.4
  let angulo = rnd() * Math.PI * 2
  for (let i = 0; i < total; i++) {
    estrelas.push({ x, y, brilho: 0.6 + rnd() * 0.4 })
    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const giro = angulo + (rnd() - 0.5) * 1.6
      const passo = 0.16 + rnd() * 0.12
      const nx = x + Math.cos(giro) * passo
      const ny = y + Math.sin(giro) * passo * 0.75
      const dentro = Math.abs(nx) < LIMITE_DA_FIGURA.x && Math.abs(ny) < LIMITE_DA_FIGURA.y && foraDoMiolo(nx, ny)
      const longe = estrelas.every((e) => (e.x - nx) ** 2 + (e.y - ny) ** 2 > 0.012)
      if (dentro && longe) {
        angulo = giro
        x = nx
        y = ny
        break
      }
      // Sem saída boa: tenta virar mais; na última, aceita um passo seguro ao
      // longo do contorno (gira em volta do timer em vez de atravessá-lo).
      angulo += 0.9
      if (tentativa === 11) {
        const t = Math.atan2(y / MIOLO_DO_TIMER.ry, x / MIOLO_DO_TIMER.rx) + 0.35
        x = Math.max(-LIMITE_DA_FIGURA.x, Math.min(LIMITE_DA_FIGURA.x, Math.cos(t) * MIOLO_DO_TIMER.rx * 1.3))
        y = Math.max(-LIMITE_DA_FIGURA.y, Math.min(LIMITE_DA_FIGURA.y, Math.sin(t) * MIOLO_DO_TIMER.ry * 1.3))
      }
    }
  }
  return estrelas
}

// Fórmulas: "x^{2}" e "a_{0}" viram pedaços com nível (sobrescrito/subscrito).
export interface PedacoDeFormula {
  texto: string
  nivel: 0 | 1 | -1
}

export function pedacosDaFormula(fonte: string): PedacoDeFormula[] {
  const pedacos: PedacoDeFormula[] = []
  let normal = ""
  let i = 0
  const solta = () => {
    if (normal) pedacos.push({ texto: normal, nivel: 0 })
    normal = ""
  }
  while (i < fonte.length) {
    const c = fonte[i]
    if ((c === "^" || c === "_") && i + 1 < fonte.length) {
      solta()
      let corpo: string
      if (fonte[i + 1] === "{") {
        const fim = fonte.indexOf("}", i + 2)
        corpo = fonte.slice(i + 2, fim < 0 ? fonte.length : fim)
        i = fim < 0 ? fonte.length : fim + 1
      } else {
        corpo = fonte[i + 1]
        i += 2
      }
      if (corpo) pedacos.push({ texto: corpo, nivel: c === "^" ? 1 : -1 })
      continue
    }
    normal += c
    i++
  }
  solta()
  return pedacos
}

export const FORMULAS = [
  "e^{iπ} + 1 = 0",
  "∫_{−∞}^{∞} e^{−x²} dx = √π",
  "∇ · E = ρ / ε_{0}",
  "iħ ∂ψ/∂t = Ĥψ",
  "E = mc²",
  "a² + b² = c²",
  "F = G m_{1}m_{2} / r²",
  "ζ(s) = Σ 1/n^{s}",
  "x = (−b ± √(b² − 4ac)) / 2a",
  "sin²θ + cos²θ = 1",
  "lim_{n→∞} (1 + 1/n)^{n} = e",
  "∂u/∂t = α ∇²u",
  "P(A|B) = P(B|A) P(A) / P(B)",
  "det(A − λI) = 0",
  "φ = (1 + √5) / 2",
  "S = k_{B} ln Ω",
  "Δx Δp ≥ ħ/2",
  "PV = nRT",
  "H(X) = −Σ p(x) log p(x)",
  "n! ≈ √(2πn) (n/e)^{n}",
  "|ψ⟩ = α|0⟩ + β|1⟩",
  "V − E + F = 2",
  "e^{x} = Σ x^{n} / n!",
  "Σ_{k=1}^{n} k = n(n + 1) / 2",
]
