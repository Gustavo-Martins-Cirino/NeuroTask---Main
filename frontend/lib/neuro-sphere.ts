// A esfera de partículas que é a presença da Neuro IA no chat. Aqui mora só o
// que É decisão nossa: onde cada partícula nasce, com que força o cursor a
// empurra e com que rapidez ela volta ao lugar. A conta de raio/projeção fica
// com o three (Ray), que já sabe fazê-la — reimplementar seria copiar sem ganho.
//
// Referência visual: o "Particle Sphere" do Originkit. Reescrito, não copiado —
// o original abre o próprio requestAnimationFrame e fala com o WebGLRenderer na
// mão, que é o oposto do que o resto do app faz. Aqui a esfera roda dentro do
// R3F e no mesmo ticker de todo mundo (ver lib/frame-clock.ts).

export interface Vetor3 {
  x: number
  y: number
  z: number
}

/**
 * Pontos espalhados por igual na casca da esfera, pelo ângulo dourado.
 * Espalhar "aleatoriamente" agrupa nos polos — a espiral de Fibonacci é o que
 * dá espaçamento parecido em toda a superfície, sem sorteio e sem repetição.
 */
export function pontosDaEsfera(quantidade: number, raio = 1): Float32Array {
  const total = Number.isFinite(quantidade) ? Math.max(0, Math.floor(quantidade)) : 0
  const pos = new Float32Array(total * 3)
  if (total === 0) return pos

  const anguloDourado = Math.PI * (3 - Math.sqrt(5))
  const r = Number.isFinite(raio) ? raio : 1

  for (let i = 0; i < total; i++) {
    // De +1 a −1. Com uma partícula só, a divisão por (total−1) estouraria em
    // NaN — nesse caso ela fica no equador, que é o meio de qualquer jeito.
    const y = total === 1 ? 0 : 1 - (i / (total - 1)) * 2
    // Raio da fatia naquela altura. O max() protege o sqrt do −0 do ponto flutuante.
    const fatia = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = anguloDourado * i
    pos[i * 3] = Math.cos(theta) * fatia * r
    pos[i * 3 + 1] = y * r
    pos[i * 3 + 2] = Math.sin(theta) * fatia * r
  }

  return pos
}

/**
 * Quanto o cursor empurra uma partícula que está a `distancia` dele: 1 em cima,
 * 0 na borda do alcance e nada além. Linear de propósito — um falloff mais
 * dramático faz a nuvem "estalar" ao entrar no raio em vez de abrir.
 */
export function intensidadeDaRepulsao(distancia: number, alcance: number): number {
  if (!Number.isFinite(distancia) || !Number.isFinite(alcance) || alcance <= 0) return 0
  if (distancia >= alcance) return 0
  if (distancia <= 0) return 1
  return (alcance - distancia) / alcance
}

/** Quanto do deslocamento sobrevive a um quadro de 1/60 s. */
export const ATRITO_POR_QUADRO = 0.9

/**
 * Fator que devolve a partícula ao lugar dela. Elevado ao número de quadros que
 * cabem no delta, e não multiplicado por ele: assim a volta leva o mesmo TEMPO
 * a 30, 60 ou 144 fps. Multiplicar faria a esfera se recompor no dobro da
 * velocidade num monitor de 120 Hz — o tipo de erro que só aparece na máquina
 * de outra pessoa.
 */
export function fatorDeRetorno(delta: number, atrito = ATRITO_POR_QUADRO): number {
  if (!Number.isFinite(delta) || delta <= 0) return 1
  const a = Number.isFinite(atrito) && atrito > 0 && atrito < 1 ? atrito : ATRITO_POR_QUADRO
  return Math.pow(a, delta * 60)
}

/** Respiração parada: a esfera nunca fica morta, mesmo sem ninguém por perto. */
export const RITMO_DA_RESPIRACAO = 0.9
export const AMPLITUDE_DA_RESPIRACAO = 0.035

export function respiracao(tempo: number, amplitude = AMPLITUDE_DA_RESPIRACAO): number {
  if (!Number.isFinite(tempo)) return 1
  const a = Number.isFinite(amplitude) ? Math.abs(amplitude) : AMPLITUDE_DA_RESPIRACAO
  return 1 + Math.sin(tempo * RITMO_DA_RESPIRACAO) * a
}

/**
 * Giro de repouso. Devagar de propósito: a esfera é presença, não animação de
 * carregamento — quem sinaliza "estou pensando" é o spinner da bolha vazia.
 *
 * Movimento reduzido zera o giro. Fica aqui, e não no componente, porque é a
 * regra do projeto para efeito pesado e vale ter um teste cobrando.
 */
export const GIRO_PARADO = 0.16

export function velocidadeDoGiro(reduzido: boolean): number {
  return reduzido ? 0 : GIRO_PARADO
}

// ---- O que faz a esfera ler como 3D ----
//
// Girar uma casca de pontos espalhados por igual em torno do próprio eixo é um
// movimento invisível: todo ângulo tem a mesma silhueta e o mesmo desenho, então
// o giro não tem detalhe para o olho seguir — o mesmo defeito que derrubou a
// primeira borda da conversa ao vivo (anel uniforme girando lê como moldura, não
// como giro). O que faltava não era velocidade, eram duas coisas: profundidade e
// um eixo que não fica parado.

/** O quanto a partícula do fundo é mais apagada que a da frente. */
export const BRILHO_DO_FUNDO = 0.3

/**
 * Brilho de uma partícula pela profundidade dela: 1 na frente da casca, e
 * `BRILHO_DO_FUNDO` no fundo.
 *
 * É o que dá VOLUME. Sem isso a nuvem tem o mesmo brilho da frente ao fundo e
 * lê como um disco de pontos; com isso, cada partícula acende ao passar pela
 * frente e apaga ao dar a volta — e é aí que o giro aparece.
 *
 * Linear de propósito: uma curva mais dramática cria uma "casca acesa" com
 * borda visível, que é justamente o desenho chapado que se quer evitar.
 */
export function brilhoPorProfundidade(z: number, raio = 1): number {
  const r = Number.isFinite(raio) && raio > 0 ? raio : 1
  if (!Number.isFinite(z)) return 1
  const t = (z / r + 1) / 2
  const limitado = t < 0 ? 0 : t > 1 ? 1 : t
  return BRILHO_DO_FUNDO + (1 - BRILHO_DO_FUNDO) * limitado
}

/** Quanto o eixo do giro balança, em radianos (≈ 15°). */
export const AMPLITUDE_DA_INCLINACAO = 0.26

/**
 * Períodos do balanço, em segundos. Primos entre si de propósito: com tempos que
 * se dividem, o eixo voltaria à mesma pose num ciclo curto e o movimento ganharia
 * ar de brinquedo de corda — o mesmo cuidado da respiração do beagle e das três
 * manchas da onda sonora.
 */
export const PERIODO_DA_INCLINACAO_X = 23
export const PERIODO_DA_INCLINACAO_Z = 17

/**
 * A inclinação do eixo no instante `tempo`. Ela é o segundo cuidado: com o eixo
 * cravado no y, a esfera gira sempre do mesmo jeito e o olho não tem como saber
 * que existe um eixo. Balançando devagar, os polos passeiam e a mesma volta
 * passa a mostrar partes diferentes da casca.
 */
export function inclinacaoDoEixo(
  tempo: number,
  amplitude = AMPLITUDE_DA_INCLINACAO
): { x: number; z: number } {
  if (!Number.isFinite(tempo)) return { x: 0, z: 0 }
  const a = Number.isFinite(amplitude) ? amplitude : AMPLITUDE_DA_INCLINACAO
  return {
    x: Math.sin((tempo * 2 * Math.PI) / PERIODO_DA_INCLINACAO_X) * a,
    z: Math.cos((tempo * 2 * Math.PI) / PERIODO_DA_INCLINACAO_Z) * a * 0.6,
  }
}
