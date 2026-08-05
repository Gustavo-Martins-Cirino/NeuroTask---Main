// Comemoração no Escritório: a sala reage quando trabalho REAL é concluído.
// O gatilho é XP concedido (> 0), que já passou pelo anti-farm de
// lib/gamification — login e clique não geram XP, então não geram festa.
//
// Este módulo é puro: a regra do que fica pendente e a matemática da animação.
// O I/O (localStorage, evento de XP) mora em hooks/use-office-celebration.

/** Duração de uma comemoração, do primeiro pulo ao último confete. */
export const CELEBRATION_MS = 2600

/** Conclusão mais velha que isso não comemora: a festa é do momento, não do
 *  histórico. Quem conclui de manhã e abre o Escritório à noite não vê confete. */
export const CELEBRATION_TTL_MS = 15 * 60_000

/** Concluiu dez tarefas seguidas? A sala comemora, mas não vira fliperama. */
export const MAX_PENDING = 3

export interface PendingCelebration {
  /** Quantas conclusões esperam comemoração. */
  count: number
  /** Quando a última aconteceu (epoch ms) — é o que vence pelo TTL. */
  at: number
}

export function parsePending(raw: string | null): PendingCelebration | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as unknown
    if (!v || typeof v !== "object") return null
    const { count, at } = v as Record<string, unknown>
    if (typeof count !== "number" || typeof at !== "number") return null
    if (!Number.isFinite(count) || !Number.isFinite(at) || count <= 0) return null
    return { count: Math.min(Math.floor(count), MAX_PENDING), at }
  } catch {
    return null
  }
}

/** Registra mais uma conclusão. Uma pendência vencida não acumula: começa de novo. */
export function addPending(prev: PendingCelebration | null, now: number): PendingCelebration {
  const vivo = prev && now - prev.at <= CELEBRATION_TTL_MS ? prev.count : 0
  return { count: Math.min(vivo + 1, MAX_PENDING), at: now }
}

/** Consome o que está pendente: quantas comemorações tocar agora (0 = nenhuma). */
export function takePending(prev: PendingCelebration | null, now: number): number {
  if (!prev || prev.count <= 0) return 0
  if (now - prev.at > CELEBRATION_TTL_MS) return 0
  return Math.min(prev.count, MAX_PENDING)
}

// ---- Animação (progresso p ∈ [0,1] dentro de CELEBRATION_MS) ----

/** Altura do pulo do boneco, em metros da sala. Dois pulos, o segundo menor. */
export function jumpHeight(p: number): number {
  if (p <= 0 || p >= 1) return 0
  const s = p * 2
  const hop = Math.floor(s)
  const local = s - hop
  const amp = hop === 0 ? 0.34 : 0.19
  return Math.sin(local * Math.PI) * amp
}

/** Balanço de empolgação do corpo, em radianos. Morre junto com a festa. */
export function bodyWiggle(p: number): number {
  if (p <= 0 || p >= 1) return 0
  return Math.sin(p * Math.PI * 5) * 0.16 * (1 - p)
}

export const CONFETTI_COLORS = [
  "#f2b544", "#e8615c", "#5aa9e6", "#6bc47d", "#b98ae0", "#f28fb0",
]

export interface ConfettiPiece {
  /** Posição de largada, em coordenadas da sala (x lateral, y profundidade, z altura). */
  x: number
  y: number
  z: number
  /** Espera antes de cair (fração do progresso) — o confete não sai todo junto. */
  delay: number
  /** Deriva lateral e rotação, para nenhum papelzinho cair igual ao outro. */
  drift: number
  spin: number
  color: string
}

// Pseudoaleatório determinístico: a mesma cena renderiza o mesmo confete a cada
// quadro. Math.random aqui faria os papéis pularem de lugar a cada re-render.
function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function buildConfetti(n: number, spread = 1.3): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = []
  for (let i = 0; i < n; i++) {
    pieces.push({
      x: (rnd(i, 1) * 2 - 1) * spread,
      y: 0.3 + rnd(i, 2) * 1.5,
      z: 2.3 + rnd(i, 3) * 0.9,
      delay: rnd(i, 4) * 0.3,
      drift: (rnd(i, 5) * 2 - 1) * 0.16,
      spin: 3 + rnd(i, 6) * 7,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })
  }
  return pieces
}

export interface ConfettiAt {
  x: number
  y: number
  z: number
  rot: number
}

/** Onde um papelzinho está no instante p. Cai, deriva, gira e para no chão. */
export function confettiAt(piece: ConfettiPiece, p: number): ConfettiAt {
  const t = Math.max(0, Math.min(1, (p - piece.delay) / Math.max(0.001, 1 - piece.delay)))
  const queda = piece.z * t * t * 1.15 // acelera, como confete de verdade
  return {
    x: piece.x + Math.sin(t * 6 + piece.spin) * piece.drift,
    y: piece.y,
    z: Math.max(0.02, piece.z - queda),
    rot: t * piece.spin,
  }
}

/** Some no fim para a festa não terminar num corte seco. */
export function confettiOpacity(p: number): number {
  if (p <= 0) return 0
  if (p >= 1) return 0
  if (p < 0.06) return p / 0.06
  if (p > 0.75) return (1 - p) / 0.25
  return 1
}
