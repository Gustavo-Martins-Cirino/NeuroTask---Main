// Faixa do Dashboard: a paleta do gradiente enriquece conforme o nível sobe.
//
// Por que CSS e não ShaderGradient (como o resto da camada visual): esta é a
// PRIMEIRA tela do app. Um canvas WebGL aqui custaria a cópia do R3F que o
// ShaderGradient carrega, no caminho crítico de quem só quer ver as tarefas do
// dia. Blobs radiais com blur dão o mesmo efeito de mesh gradient por
// praticamente nada — e o Modo Foco, que é onde a pessoa fica parada olhando,
// segue com o shader de verdade.

export interface PaletaFaixa {
  /** Nome da faixa de nível, para o selo. */
  nome: string
  /** Três cores do mesh gradient, do fundo para o destaque. */
  cores: [string, string, string]
}

// Cada degrau ganha uma cor a mais de "vida": começa quase monocromático e vai
// abrindo em cores — o progresso tem de se VER, não só sair num número.
const FAIXAS: { min: number; paleta: PaletaFaixa }[] = [
  { min: 1, paleta: { nome: "Começando", cores: ["#5b6b8c", "#7d8bab", "#9aa6c2"] } },
  { min: 3, paleta: { nome: "Em ritmo", cores: ["#3f6fa8", "#4e9bc4", "#86c7d8"] } },
  { min: 5, paleta: { nome: "Constante", cores: ["#2f6f78", "#3f9e8c", "#8ed0a8"] } },
  { min: 8, paleta: { nome: "Avançado", cores: ["#5b3f9e", "#8a52c4", "#c98ad6"] } },
  { min: 12, paleta: { nome: "Veterano", cores: ["#9e4a2f", "#d07a34", "#efc25c"] } },
  { min: 18, paleta: { nome: "Lendário", cores: ["#7a2f6b", "#c2418c", "#f2a03d"] } },
]

export function paletaDoNivel(nivel: number): PaletaFaixa {
  const n = Number.isFinite(nivel) ? nivel : 1
  let atual = FAIXAS[0].paleta
  for (const f of FAIXAS) if (n >= f.min) atual = f.paleta
  return atual
}

/**
 * Duração de uma volta da animação, em segundos. Sobe com o nível: quanto mais
 * rica a paleta, mais lento o movimento — cor demais andando rápido vira
 * distração, e esta faixa fica atrás de texto que se precisa ler.
 *
 * `reduzido` (prefers-reduced-motion) devolve 0 = sem animação.
 */
export function duracaoDaFaixa(nivel: number, reduzido = false): number {
  if (reduzido) return 0
  const n = Math.min(20, Math.max(1, Number.isFinite(nivel) ? nivel : 1))
  return 26 + n * 1.6
}
