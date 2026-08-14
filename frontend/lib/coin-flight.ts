// A moeda que voa do card da tarefa concluída até o contador de XP do header.
// Aqui mora só a geometria da curva e a regra de quando o voo vale — quem anima
// (GSAP MotionPath) fica no componente.

export interface Ponto {
  x: number
  y: number
}

export interface Voo {
  /** Pontos RELATIVOS à origem — é o formato que o MotionPath espera. */
  caminho: Ponto[]
  duracaoS: number
}

/** Quanto o arco se afasta da reta, em fração da distância. */
const ABAULAMENTO = 0.28
const ABAULAMENTO_MIN_PX = 30
const ABAULAMENTO_MAX_PX = 140

export function curvaDaMoeda(origem: Ponto, destino: Ponto): Voo {
  const dx = destino.x - origem.x
  const dy = destino.y - origem.y
  const distancia = Math.hypot(dx, dy)

  // Origem e destino no mesmo lugar: reta degenerada, sem curva a calcular.
  if (distancia < 1) {
    return { caminho: [{ x: 0, y: 0 }, { x: dx, y: dy }], duracaoS: duracaoDoVoo(distancia) }
  }

  const desvio = Math.min(
    ABAULAMENTO_MAX_PX,
    Math.max(ABAULAMENTO_MIN_PX, distancia * ABAULAMENTO)
  )

  // Perpendicular à reta, sempre escolhida para o lado de CIMA da tela: a moeda
  // sobe num arco e desce no contador, em vez de mergulhar por baixo do header.
  let nx = -dy / distancia
  let ny = dx / distancia
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }

  const controle = {
    x: dx / 2 + nx * desvio,
    y: dy / 2 + ny * desvio,
  }

  return {
    caminho: [{ x: 0, y: 0 }, controle, { x: dx, y: dy }],
    duracaoS: duracaoDoVoo(distancia),
  }
}

export const DURACAO_MIN_S = 0.5
export const DURACAO_MAX_S = 1.1

export function duracaoDoVoo(distancia: number): number {
  if (!Number.isFinite(distancia)) return DURACAO_MIN_S
  return Math.min(DURACAO_MAX_S, Math.max(DURACAO_MIN_S, 0.42 + distancia / 2200))
}

// ---- Origem do voo ----
// O card sabe DE ONDE a moeda sai; só o award_xp sabe SE ela sai (o anti-farm
// pode zerar o XP). Em vez de acoplar os dois, o card deixa a origem marcada e o
// voo só acontece se o XP chegar logo em seguida — senão não houve prêmio, e
// mostrar moeda seria mentir para o usuário.

export const JANELA_DA_ORIGEM_MS = 4000

let origemMarcada: { ponto: Ponto; em: number } | null = null

export function marcarOrigemDaMoeda(ponto: Ponto, agora = Date.now()) {
  origemMarcada = { ponto, em: agora }
}

export function consumirOrigemDaMoeda(agora = Date.now()): Ponto | null {
  if (!origemMarcada) return null
  const { ponto, em } = origemMarcada
  origemMarcada = null
  if (agora - em > JANELA_DA_ORIGEM_MS) return null
  return ponto
}

/** Só para os testes: não deixa uma origem vazar de um caso para o outro. */
export function limparOrigemDaMoeda() {
  origemMarcada = null
}

/** Atributo que marca o alvo do voo (o selo de nível no header). */
export const ALVO_DA_MOEDA = "data-coin-target"
