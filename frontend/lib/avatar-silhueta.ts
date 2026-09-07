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

// ─────────────────────────────────────────────────────────────────────────
// O MESMO tronco, em metros, para o boneco 3D da sala
// ─────────────────────────────────────────────────────────────────────────
//
// O boneco da sala não tinha tipo de corpo NENHUM: o tronco era um `box` reto
// de 32 cm por 24, igual para todo mundo. Quem escolhia o corpo feminino no
// editor via o masculino sentado na cadeira — a mesma incoerência que o cabelo
// e os fones já tiveram.
//
// E não bastava dar uma silhueta ao feminino: o masculino também não tinha
// nenhuma. Uma caixa reta não é um V, é uma caixa. Por isso os DOIS passam a
// sair daqui, das mesmas três relações que o bonequinho 2D usa — ombro contra
// quadril, a cintura, e a linha do ombro.
//
// A âncora é o PEITO MASCULINO: ele vale exatamente a meia-largura que o tronco
// da sala já tinha (0,16 m). Assim o ponto mais largo do boneco não se mexe, e
// com ele ficam parados a cabeça, a cadeira e o alcance do braço até o teclado.

/** Meia-largura do tronco masculino no peito, em metros — o que a sala já tinha. */
export const PEITO_M_METROS = 0.16

/** Metros por unidade do `viewBox` do bonequinho 2D. */
export const METRO_POR_UNIDADE = PEITO_M_METROS / SILHUETAS.m.peitoL

/**
 * A folga entre a lateral do peito e o centro da bola do ombro.
 *
 * Hoje o ombro está em 0,175 e o peito em 0,16. A folga é o que sobra, e ela
 * tem de ser mantida: é ela que faz a bola do ombro encostar no tronco em vez
 * de flutuar ao lado dele quando o peito for mais estreito.
 */
export const FOLGA_DO_OMBRO = 0.015

/** Fundo do tronco dividido pela largura, no peito. Mantém a proporção de hoje. */
const FUNDO_POR_LARGURA = 0.12 / PEITO_M_METROS

export interface NivelDoTronco {
  /** Altura em z, no espaço do boneco. */
  z: number
  /** Meia-largura (eixo X). */
  meiaLargura: number
  /** Meia-profundidade (eixo Y). */
  meioFundo: number
}

export interface TroncoTresD {
  /** Do quadril ao ombro, de baixo para cima. */
  niveis: [NivelDoTronco, NivelDoTronco, NivelDoTronco, NivelDoTronco]
  /** X do centro da bola do ombro. */
  xDoOmbro: number
}

/** Base e topo do tronco em z — o envelope não muda com o tipo de corpo. */
export const TRONCO_Z_BASE = 0.65
export const TRONCO_Z_TOPO = 1.07

function nivel(z: number, meiaLargura: number): NivelDoTronco {
  return { z, meiaLargura, meioFundo: meiaLargura * FUNDO_POR_LARGURA }
}

/**
 * O tronco 3D do tipo de corpo pedido.
 *
 * As alturas saem das mesmas coordenadas do 2D, reescaladas para caber entre
 * `TRONCO_Z_BASE` e `TRONCO_Z_TOPO`. O corpo feminino tem a linha do ombro um
 * pouco mais baixa que o masculino, e é essa reescala que preserva isso: a
 * distância entre ombro e quadril não é a mesma nos dois desenhos.
 *
 * O fundo acompanha a largura em cada nível. Um tronco que afina de frente e
 * continua com a mesma espessura de lado vira uma tábua de perfil — e é
 * justamente de perfil que a câmera olha o boneco.
 */
export function troncoTresD(corpo: unknown): TroncoTresD {
  const s = silhuetaDe(corpo)
  const alcance = s.quadrilY - s.ombroY
  const altura = TRONCO_Z_TOPO - TRONCO_Z_BASE
  const zDe = (y: number) => TRONCO_Z_TOPO - ((y - s.ombroY) / alcance) * altura
  const m = (u: number) => u * METRO_POR_UNIDADE
  return {
    niveis: [
      nivel(zDe(s.quadrilY), m(s.quadrilL)),
      nivel(zDe(s.cinturaY), m(s.cinturaL)),
      nivel(zDe(s.peitoY), m(s.peitoL)),
      nivel(zDe(s.ombroY), m(s.ombroL)),
    ],
    xDoOmbro: m(s.peitoL) + FOLGA_DO_OMBRO,
  }
}
