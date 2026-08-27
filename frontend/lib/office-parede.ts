// Vagas na parede do fundo.
//
// O relógio nasceu em x=-1,15 e o quadro em x=-0,95: os dois na parede do
// fundo, sobrepostos de -1,23 a -1,00. Com os dois comprados, um atravessava o
// outro.
//
// Mover o relógio resolveria hoje e quebraria de novo na próxima decoração de
// parede — janela, quadro, neon e relógio disputam o mesmo pano, e cada item
// novo é mais uma chance de colidir. O que resolve é ninguém escolher o próprio
// x: as peças entram numa fileira e recebem a vaga.

/** Folga entre peças vizinhas. Encostadas, duas molduras lêem como uma só. */
export const FOLGA_PADRAO = 0.14

/** A folga não desce disto: abaixo daqui a fileira lê como uma peça só. */
const FOLGA_MINIMA = 0.04

/**
 * Distribui as peças numa fileira centrada no vão, da esquerda para a direita.
 *
 * Devolve o x do CENTRO de cada uma, na ordem em que entraram. Centrar (em vez
 * de encostar à esquerda) é o que mantém a parede equilibrada com uma, duas ou
 * quatro peças penduradas — e o que se vê muda conforme a pessoa compra.
 */
export function distribuirNaParede(
  larguras: readonly number[],
  esquerda: number,
  direita: number,
  folga: number = FOLGA_PADRAO
): number[] {
  if (larguras.length === 0) return []
  const vao = direita - esquerda
  const somaDasPecas = larguras.reduce((a, b) => a + b, 0)
  const vaos = larguras.length - 1

  // Não coube com a folga cheia: aperta até o mínimo antes de deixar transbordar.
  let usada = folga
  if (vaos > 0 && somaDasPecas + folga * vaos > vao) {
    usada = Math.max(FOLGA_MINIMA, (vao - somaDasPecas) / vaos)
  }

  const total = somaDasPecas + usada * vaos
  let cursor = (esquerda + direita) / 2 - total / 2
  return larguras.map((largura) => {
    const centro = cursor + largura / 2
    cursor += largura + usada
    return centro
  })
}
