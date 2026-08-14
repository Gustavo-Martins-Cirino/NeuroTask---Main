// Ambientes ANIMADOS do Modo Foco (ShaderGradient). Os estáticos continuam
// existindo ao lado destes — quem achar o movimento distraente escolhe um deles
// e pronto. Aqui mora só o que é determinístico: os presets e a regra de
// velocidade. O canvas em si vive em components/focus-gradient.tsx.

export interface GradientPreset {
  id: string
  name: string
  /** Cor de fundo enquanto o canvas carrega (e o fallback sem animação). */
  fallback: string
  type: "plane" | "sphere" | "waterPlane"
  color1: string
  color2: string
  color3: string
  /** Velocidade no início da sessão; cai conforme o timer avança. */
  speed: number
  density: number
  strength: number
  /** Claro ou escuro — decide a cor do texto por cima. */
  mode: "light" | "dark"
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "aurora", name: "Aurora", fallback: "#0b1026", type: "waterPlane",
    color1: "#1a2a6c", color2: "#3ba9c9", color3: "#7b2ff7",
    speed: 0.4, density: 1.3, strength: 3.4, mode: "dark",
  },
  {
    id: "brasa", name: "Brasa", fallback: "#2a1208", type: "plane",
    color1: "#3a1206", color2: "#e0632a", color3: "#f2b035",
    speed: 0.32, density: 1.1, strength: 3.0, mode: "dark",
  },
  {
    id: "mare", name: "Maré", fallback: "#062a33", type: "waterPlane",
    color1: "#04303b", color2: "#0f8b8d", color3: "#8fd9c4",
    speed: 0.28, density: 1.4, strength: 3.2, mode: "dark",
  },
  {
    id: "algodao", name: "Algodão", fallback: "#f3e8f7", type: "sphere",
    color1: "#ffd9e8", color2: "#cfe3ff", color3: "#f6f0d8",
    speed: 0.24, density: 0.9, strength: 2.4, mode: "light",
  },
]

/**
 * Velocidade da animação em função do quanto da sessão já passou (0 → 1).
 *
 * Cai com o tempo de propósito: no começo o movimento chama para a tela, e
 * depois vira ruído em quem está tentando se concentrar. No fim da sessão anda
 * a 25% do inicial — vivo, mas quase imperceptível.
 *
 * Com `reduzido` (prefers-reduced-motion) devolve 0: a cena congela num quadro,
 * que é o que a preferência do sistema pede.
 */
export function velocidadeDoGradiente(base: number, progresso: number, reduzido = false): number {
  if (reduzido) return 0
  const p = Math.min(1, Math.max(0, progresso))
  return Number((base * (1 - 0.75 * p)).toFixed(4))
}

/** Progresso 0→1 de uma sessão, tolerante a durações zeradas/negativas. */
export function progressoDaSessao(restanteSeg: number, totalSeg: number): number {
  if (!Number.isFinite(totalSeg) || totalSeg <= 0) return 0
  const decorrido = totalSeg - Math.max(0, restanteSeg)
  return Math.min(1, Math.max(0, decorrido / totalSeg))
}
