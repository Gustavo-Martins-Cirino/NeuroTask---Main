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

export type IdCena =
  | "correnteza"
  | "formulas"
  | "folego"
  | "revoada"
  | "buraco-negro"
  | "ferrofluido"
  | "constelacao"
  | "sinapses"

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
    id: "revoada",
    itemId: "foco-revoada",
    preco: 260,
    fundo: "#2a2350",
    previa: "radial-gradient(1px 1px at 38% 34%, #140f22, transparent), radial-gradient(1px 1px at 44% 30%, #140f22, transparent), radial-gradient(1px 1px at 50% 36%, #140f22, transparent), radial-gradient(40% 30% at 45% 33%, rgba(20,15,34,0.55), transparent 70%), radial-gradient(18% 14% at 72% 80%, #ffd9a0, transparent 70%), linear-gradient(180deg, #1d2b5e 0%, #6b4a8a 45%, #e0806a 75%, #ffc38a 82%, #120d1e 83%)",
  },
  {
    id: "buraco-negro",
    itemId: "foco-buraco-negro",
    preco: 320,
    fundo: "#000000",
    previa: "radial-gradient(circle at 50% 50%, #000 0 16%, rgba(255,217,160,0.9) 18%, rgba(255,95,0,0.55) 30%, transparent 58%), #000",
  },
  {
    id: "ferrofluido",
    itemId: "foco-ferrofluido",
    preco: 400,
    fundo: "#16161b",
    previa: "radial-gradient(10% 8% at 40% 40%, rgba(255,255,255,0.9), transparent 70%), radial-gradient(30% 28% at 46% 50%, #050507 62%, rgba(120,160,255,0.6) 67%, rgba(255,120,220,0.35) 71%, transparent 74%), radial-gradient(16% 14% at 72% 64%, #050507 60%, rgba(120,255,220,0.45) 68%, transparent 74%), radial-gradient(80% 70% at 50% 30%, #3d3d44, #121216)",
  },
  {
    id: "constelacao",
    itemId: "foco-constelacao",
    preco: 480,
    fundo: "#03040a",
    previa: "radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(2px 2px at 60% 25%, #cfe0ff, transparent), radial-gradient(1.5px 1.5px at 75% 70%, #fff, transparent), radial-gradient(2px 2px at 35% 65%, #ffe9b8, transparent), linear-gradient(160deg, #0a1030, #03040a)",
  },
  {
    id: "sinapses",
    itemId: "foco-sinapses",
    preco: 600,
    fundo: "#020806",
    previa: "radial-gradient(6% 6% at 30% 40%, #fff3d0, transparent 70%), radial-gradient(5% 5% at 72% 62%, #ffe0a0, transparent 70%), linear-gradient(120deg, transparent 44%, rgba(127,224,192,0.6) 46%, transparent 48%), linear-gradient(35deg, transparent 50%, rgba(19,143,128,0.7) 51.5%, transparent 53%), linear-gradient(160deg, transparent 58%, rgba(127,224,192,0.45) 59%, transparent 60.5%), #020806",
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

const entre0e1 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)
const suave = (a: number, b: number, v: number) => {
  const t = entre0e1((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * Quanto um ponto está DENTRO do miolo do timer: 1 no meio, 0 fora, com borda
 * macia. `escala` encolhe ou cresce a área (em fração da meia-tela, como as
 * estrelas). As Sinapses usam para a rede crescer em volta do timer.
 */
export function pesoDoMiolo(x: number, y: number, escala = 1): number {
  const v = (x / (MIOLO_DO_TIMER.rx * escala)) ** 4 + (y / (MIOLO_DO_TIMER.ry * escala)) ** 4
  return 1 - suave(0.55, 1.35, v)
}

// Revoada: o sol se põe enquanto você foca. Três céus — fim de tarde, pôr do
// sol e a hora azul — e o progresso da sessão anda entre eles.
export type Rgb = [number, number, number]

const CEUS: Rgb[][] = [
  // do alto até o horizonte
  [[29, 43, 94], [107, 74, 138], [224, 128, 106], [255, 195, 138]],
  [[20, 26, 64], [74, 47, 110], [194, 80, 106], [255, 138, 90]],
  [[10, 15, 46], [29, 26, 72], [62, 39, 88], [106, 63, 106]],
]

export function misturaRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = entre0e1(t)
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

export interface Entardecer {
  /** Quatro cores, do alto da tela até o horizonte. */
  ceu: Rgb[]
  /** Altura do centro do sol acima do horizonte, em fração da altura da tela (negativo = já se pôs). */
  sol: number
  /** 0 = ainda é dia, 1 = noite: as janelas e as estrelas acendem com ele. */
  noite: number
}

export function entardecer(progresso: number): Entardecer {
  const p = entre0e1(progresso)
  const [a, b, t] = p < 0.5 ? [CEUS[0], CEUS[1], p / 0.5] : [CEUS[1], CEUS[2], (p - 0.5) / 0.5]
  return {
    ceu: a.map((c, i) => misturaRgb(c, b[i], t)),
    sol: 0.13 - 0.2 * p,
    noite: suave(0.55, 0.95, p),
  }
}

// Ferrofluido: as gotas se procuram mais conforme o foco avança — soltas no
// começo, uma gota só no fim da sessão.
export function coesaoDasGotas(progresso: number): number {
  return 0.12 + 0.88 * suave(0, 1, entre0e1(progresso))
}

// Sinapses: uma rede de agentes (o modelo do mofo limoso, Physarum) que deixa
// rastro e segue o rastro dos outros. Roda na CPU, numa grade mais grossa que a
// tela — e a grade é escolhida para caber num teto de células, o que segura o
// custo em qualquer tamanho de janela.
export interface GradeDaRede {
  /** Lado da célula, em pixels de CSS. */
  celula: number
  colunas: number
  linhas: number
}

export function gradeDaRede(largura: number, altura: number, maxCelulas: number): GradeDaRede {
  const w = Math.max(1, Number.isFinite(largura) ? largura : 1)
  const h = Math.max(1, Number.isFinite(altura) ? altura : 1)
  const teto = Math.max(1, maxCelulas)
  let celula = Math.max(2, Math.ceil(Math.sqrt((w * h) / teto)))
  while (Math.ceil(w / celula) * Math.ceil(h / celula) > teto) celula++
  return { celula, colunas: Math.ceil(w / celula), linhas: Math.ceil(h / celula) }
}

/** A rede cresce enquanto você foca: 30% dos agentes no começo, todos no fim. */
export function agentesAtivos(total: number, progresso: number): number {
  return Math.round(Math.max(0, total) * (0.3 + 0.7 * entre0e1(progresso)))
}

export interface JeitoDaRede {
  /** Radianos: quão aberto o agente "cheira" para os lados. */
  anguloSensor: number
  /** Radianos: quanto ele vira para o lado do cheiro. */
  anguloGiro: number
  /** Células: quão longe ele cheira. */
  distanciaSensor: number
}

/** A roda muda o JEITO da rede: fios longos (0) → a rede clássica → células fechadas (1). */
export function jeitoDaRede(roda: number): JeitoDaRede {
  const w = entre0e1(roda)
  const grau = Math.PI / 180
  return {
    anguloSensor: (20 + 35 * w) * grau,
    anguloGiro: (30 + 30 * w) * grau,
    distanciaSensor: 8 - 4 * w,
  }
}

/** Quantos rumos o agente conhece: o ângulo vira índice de tabela (seno e cosseno sem conta). */
export const RUMOS_DA_REDE = 256

export function rumosDoAngulo(radianos: number): number {
  return Math.max(1, Math.round((radianos / (Math.PI * 2)) * RUMOS_DA_REDE))
}

/** Os neurônios: pontos fixos (com semente) em volta do timer, longe uns dos outros. */
export interface Neuronio {
  /** -1 a 1, fração da meia-tela, como as estrelas. */
  x: number
  y: number
}

export const NEURONIOS_DA_REDE = 12

export function neuroniosDaRede(total = NEURONIOS_DA_REDE, semente = 2718): Neuronio[] {
  const rnd = aleatorioComSemente(semente)
  const lista: Neuronio[] = []
  for (let tentativa = 0; lista.length < total && tentativa < 4000; tentativa++) {
    const x = (rnd() * 2 - 1) * 0.86
    const y = (rnd() * 2 - 1) * 0.8
    if (pesoDoMiolo(x, y, 1.05) > 0) continue
    // Folga mínima entre eles, que afrouxa se a tela não comportar todos.
    const folga = tentativa < 2000 ? 0.36 : 0.22
    if (lista.every((n) => (n.x - x) ** 2 + (n.y - y) ** 2 > folga * folga)) lista.push({ x, y })
  }
  return lista
}

/** Três neurônios desde o começo; os outros acendem conforme o foco avança. */
export function neuroniosAcesos(progresso: number, total = NEURONIOS_DA_REDE): number {
  const base = Math.min(3, total)
  return Math.min(total, base + Math.floor(entre0e1(progresso) * (total - base + 0.999)))
}
