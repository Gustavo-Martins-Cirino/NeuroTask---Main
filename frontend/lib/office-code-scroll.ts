// Rolagem do código na tela do monitor.
//
// As linhas são GEOMETRIA (barrinhas), não textura — então rolar é mover cada
// barra e trazê-la de volta por cima quando ela sai por baixo. Um shader daria
// o mesmo resultado e custaria uma malha só, mas aqui a tela tem poucas dezenas
// de barras e este caminho é testável: a conta de wrap é uma função pura.
//
// A rolagem é lenta parada e acelera quando a pessoa está trabalhando — é mais
// um sinal de "tem trabalho acontecendo", como o brilho da tela e as mãos no
// teclado.

/** Velocidade em unidades de tela por segundo. */
export const VEL_PARADO = 0.012
export const VEL_TRABALHANDO = 0.075

/**
 * Posição vertical de uma barra em `t` segundos, dada a posição original.
 *
 * O intervalo é [-alt/2, alt/2]; quem passa do fundo reaparece no topo. Sem o
 * wrap as barras iriam embora e a tela ficaria vazia em meio minuto.
 */
export function rolagemDoCodigo(base: number, alt: number, deslocamento: number): number {
  if (!(alt > 0)) return base
  // Traz para [0, alt) contando a partir do topo, aplica o deslocamento e volta.
  const doTopo = alt / 2 - base
  const rolado = ((doTopo + deslocamento) % alt + alt) % alt
  return alt / 2 - rolado
}

/** Deslocamento acumulado até `t`, conforme esteja trabalhando ou não. */
export function deslocamentoEm(t: number, trabalhando: boolean): number {
  return t * (trabalhando ? VEL_TRABALHANDO : VEL_PARADO)
}
