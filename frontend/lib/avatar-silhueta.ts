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

// ---- A roupa muda a silhueta, não só a cor ----
//
// As quatro roupas eram o MESMO tronco com um detalhe fino por dentro: uma
// listra de zíper, um V de gola. No tamanho em que o boneco aparece na cena
// esses traços somem, e as quatro viram a mesma blusa em quatro cores.
//
// O que sobrevive ao tamanho é o CONTORNO. Cada roupa mexe nas medidas antes de
// o tronco ser desenhado: o terno tem ombro estruturado, o moletom é folgado no
// corpo inteiro, a jaqueta encorpa o ombro sem alargar o quadril, e a camiseta é
// a régua — ela não mexe em nada, e é contra ela que as outras se leem.

export type RoupaDoCorpo = "camiseta" | "moletom" | "jaqueta" | "terno"

interface AjusteDeRoupa {
  ombro: number
  peito: number
  cintura: number
  quadril: number
}

const AJUSTES: Record<RoupaDoCorpo, AjusteDeRoupa> = {
  camiseta: { ombro: 0, peito: 0, cintura: 0, quadril: 0 },
  // Moletom é folgado: engrossa tudo e some com a cintura, que é justamente o
  // que uma peça larga faz com a silhueta de quem a veste.
  moletom: { ombro: 0.8, peito: 1.4, cintura: 2.2, quadril: 1.2 },
  // Jaqueta encorpa o tronco e para na barra — quadril de fora.
  jaqueta: { ombro: 1.2, peito: 1.2, cintura: 1, quadril: 0.2 },
  // Terno tem ombreira: a linha do ombro é a mais larga e a mais reta das quatro.
  terno: { ombro: 2.2, peito: 1, cintura: 0.6, quadril: 0.4 },
}

export function silhuetaComRoupa(s: Silhueta, roupa: unknown): Silhueta {
  const a = AJUSTES[(roupa as RoupaDoCorpo)] ?? AJUSTES.camiseta
  return {
    ...s,
    ombroL: s.ombroL + a.ombro,
    peitoL: s.peitoL + a.peito,
    cinturaL: s.cinturaL + a.cintura,
    quadrilL: s.quadrilL + a.quadril,
  }
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
 * O capuz caído atrás da nuca — a silhueta que só o moletom tem.
 *
 * Ele sai POR FORA da linha do ombro de propósito. Desenhado por dentro do
 * tronco (como era antes, uma mancha mais escura), some no tamanho da cena: o
 * que se enxerga de longe é o contorno mudar, não a cor mudar.
 */
export function caminhoDoCapuz(s: Silhueta, cx = 1, pescocoY = -34): string {
  const L = s.ombroL + 2.6
  return [
    `M ${cx - L} ${s.ombroY + 1.5}`,
    `Q ${cx - L - 0.8} ${pescocoY - 4} ${cx} ${pescocoY - 5.2}`,
    `Q ${cx + L + 0.8} ${pescocoY - 4} ${cx + L} ${s.ombroY + 1.5}`,
    `Q ${cx} ${s.ombroY + 5} ${cx - L} ${s.ombroY + 1.5}`,
    "Z",
  ].join(" ")
}

/**
 * A gola levantada da jaqueta: dois cantos que passam do ombro, junto ao
 * pescoço. É pouco pano, mas é pano ACIMA da linha do ombro — e é isso que o
 * olho pega antes de qualquer detalhe interno.
 */
export function caminhoDaGolaLevantada(s: Silhueta, cx = 1): string {
  const L = s.ombroL
  return [
    `M ${cx - L} ${s.ombroY + 0.5}`,
    `L ${cx - L * 0.42} ${s.ombroY - 3.4}`,
    `L ${cx - L * 0.3} ${s.ombroY + 0.5}`,
    "Z",
    `M ${cx + L} ${s.ombroY + 0.5}`,
    `L ${cx + L * 0.42} ${s.ombroY - 3.4}`,
    `L ${cx + L * 0.3} ${s.ombroY + 0.5}`,
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
