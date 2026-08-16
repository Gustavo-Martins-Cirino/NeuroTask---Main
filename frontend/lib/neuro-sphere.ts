// A esfera de partículas que é a presença da Neuro IA no chat. Aqui mora só o
// que É decisão nossa: onde cada partícula nasce, com que força o cursor a
// empurra e com que rapidez ela volta ao lugar. A conta de raio/projeção fica
// com o three (Ray), que já sabe fazê-la — reimplementar seria copiar sem ganho.
//
// Referência visual: frontend/inspirações/NeuroIA.txt (Particle Sphere, do
// Originkit). Reescrito, não copiado: o original abre o próprio
// requestAnimationFrame e fala com o WebGLRenderer na mão. Aqui a esfera roda
// dentro do R3F, no mesmo ticker do resto do app (ver lib/frame-clock.ts).

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
 * A esfera acelera enquanto a Neuro pensa — é o único sinal de "estou
 * trabalhando" que sobra quando a resposta demora e não há texto ainda.
 */
export const GIRO_PARADO = 0.16
export const GIRO_PENSANDO = 0.72

export function velocidadeDoGiro(pensando: boolean, reduzido: boolean): number {
  if (reduzido) return 0
  return pensando ? GIRO_PENSANDO : GIRO_PARADO
}
