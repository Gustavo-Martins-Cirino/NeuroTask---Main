// A silhueta do bonequinho por tipo de corpo.
//
// **A queixa que deu origem a isto**: "o corpo masculino e o feminino são quase
// o mesmo — a feminina só está mais magra". Era verdade e dá para medir: os dois
// troncos eram o MESMO desenho em V (largo na axila, estreito no quadril), um
// com 24 de largura e outro com 20. Escalar não muda silhueta, muda tamanho.
//
// O que separa as duas de longe não é largura, são três relações:
//
// 1. **Ombro contra quadril.** No masculino o ombro é o ponto mais largo — a
//    silhueta é um V. No feminino o quadril alcança ou passa o ombro, e o V vira
//    ampulheta.
// 2. **A cintura.** No masculino ela quase não existe: o lado desce reto. No
//    feminino ela é o aperto que faz a forma ser lida como forma.
// 3. **A linha do ombro.** Quadrada e alta no masculino, mais estreita e um
//    pouco mais baixa no feminino.
//
// Tudo em unidades do `viewBox` do bonequinho, com o centro do corpo em x = 1.

export type TipoDeCorpo = "m" | "f"

export interface Silhueta {
  /** Meia-largura e altura da linha do ombro (o topo do tronco). */
  ombroL: number
  ombroY: number
  /** O ponto mais largo do tronco — é dele que o braço sai. */
  peitoL: number
  peitoY: number
  /** O aperto do meio. */
  cinturaL: number
  cinturaY: number
  /** A base do tronco. */
  quadrilL: number
  quadrilY: number
  /** Meia-largura do pescoço. */
  pescocoL: number
  /** Altura do centro da cabeça. */
  cabecaY: number
}

export const SILHUETAS: Record<TipoDeCorpo, Silhueta> = {
  // V: ombro é o mais largo, lado quase reto, quadril mais estreito.
  m: {
    ombroL: 7, ombroY: -33,
    peitoL: 12, peitoY: -27.5,
    cinturaL: 10.8, cinturaY: -14,
    quadrilL: 9.6, quadrilY: 1,
    pescocoL: 3.5,
    cabecaY: -40,
  },
  // Ampulheta: quadril passa o ombro, e a cintura aperta de verdade.
  f: {
    ombroL: 5.6, ombroY: -32.5,
    peitoL: 9.6, peitoY: -26.5,
    cinturaL: 6.9, cinturaY: -15,
    quadrilL: 10.6, quadrilY: 1,
    pescocoL: 2.9,
    cabecaY: -39,
  },
}

export function silhuetaDe(corpo: unknown): Silhueta {
  return corpo === "f" ? SILHUETAS.f : SILHUETAS.m
}

/**
 * O ponto de controle de uma curva quadrática que PASSA por `meio`.
 *
 * Numa quadrática, o ponto do meio da curva não é o de controle: ele fica em
 * (P0 + 2C + P2) / 4. Usar a cintura como controle direto deixaria o aperto
 * pela metade — a curva chegaria só até o meio do caminho, e a forma voltaria a
 * ser um V de lado reto. Esta conta é o que faz a cintura ser a cintura.
 */
export function controleQuePassaPor(p0: number, p2: number, meio: number): number {
  return (4 * meio - p0 - p2) / 2
}

/** Onde a quadrática está em t (só para conferir a conta acima). */
export function pontoDaQuadratica(p0: number, c: number, p2: number, t: number): number {
  const u = 1 - t
  return u * u * p0 + 2 * u * t * c + t * t * p2
}

/** O contorno do tronco visto de costas, do ombro ao quadril. */
export function caminhoDoTronco(s: Silhueta, cx = 1): string {
  const dir = controleQuePassaPor(cx + s.peitoL, cx + s.quadrilL, cx + s.cinturaL)
  const esq = controleQuePassaPor(cx - s.quadrilL, cx - s.peitoL, cx - s.cinturaL)
  return [
    `M ${cx - s.peitoL} ${s.peitoY}`,
    // Canto do ombro: o tronco sobe da axila e vira na linha do ombro.
    `Q ${cx - s.peitoL} ${s.ombroY} ${cx - s.ombroL} ${s.ombroY}`,
    `L ${cx + s.ombroL} ${s.ombroY}`,
    `Q ${cx + s.peitoL} ${s.ombroY} ${cx + s.peitoL} ${s.peitoY}`,
    // Lado direito descendo, apertando na cintura.
    `Q ${dir} ${s.cinturaY} ${cx + s.quadrilL} ${s.quadrilY}`,
    `L ${cx - s.quadrilL} ${s.quadrilY}`,
    // E o lado esquerdo de volta.
    `Q ${esq} ${s.cinturaY} ${cx - s.peitoL} ${s.peitoY}`,
    "Z",
  ].join(" ")
}

/**
 * O quadril do boneco sentado — o pedaço entre a base do tronco e a almofada.
 *
 * Sai da mesma medida do tronco: sem isso, o quadril largo do corpo feminino
 * terminaria num bumbum de outra largura, e a emenda apareceria.
 */
export function caminhoDoQuadrilSentado(s: Silhueta, cx = 1, ateY = 15): string {
  const L = s.quadrilL
  return [
    `M ${cx - L} ${s.quadrilY}`,
    `Q ${cx - L - 1} 8 ${cx - L + 1} ${ateY}`,
    `L ${cx + L - 1} ${ateY}`,
    `Q ${cx + L + 1} 8 ${cx + L} ${s.quadrilY}`,
    "Z",
  ].join(" ")
}
