// O sino do fim do Modo Foco e o relógio que decide quando ele toca.
//
// O tempo restante sai de um INSTANTE DE FIM, e não de "menos um a cada tique".
// Contando tiques, o timer dependia do setInterval rodar em dia — e com a aba em
// segundo plano o Chrome o segura para uma vez por minuto: 25 minutos de foco
// com a pessoa em outra aba terminavam bem depois, e o sino junto.

export interface NotaDoSino {
  /** Hz. */
  frequencia: number
  /** Segundos depois do início do sino. */
  inicio: number
  /** Segundos até o som sumir. */
  duracao: number
  /** Volume no pico (0–1). Baixo de propósito: é aviso, não alarme. */
  pico: number
}

// Duas notas de sino, uma quinta acima da outra (Lá5 → Mi6), com cauda longa,
// e o par batendo DUAS vezes. Senoide pura e ataque de 15 ms: sem estalo no
// começo e sem aspereza.
//
// A primeira versão (02/10) era um par só, com pico 0,12: o Gustavo testou e não
// ouviu. Uma batida isolada some fácil debaixo de uma música do mixer ou com o
// volume do sistema baixo; a repetição é o que faz o ouvido perceber "isso é um
// aviso". Continua discreto: menos de 3,5 s e longe do volume cheio.
const PAR = (atraso: number, ganho: number): NotaDoSino[] => [
  { frequencia: 880, inicio: atraso, duracao: 1.6, pico: 0.22 * ganho },
  { frequencia: 1318.51, inicio: atraso + 0.22, duracao: 2, pico: 0.16 * ganho },
]
export const NOTAS_DO_SINO: readonly NotaDoSino[] = [...PAR(0, 1), ...PAR(1.2, 0.85)]

export const ATAQUE_DO_SINO = 0.015

/** Quanto o sino dura do primeiro som ao silêncio, em segundos. */
export function duracaoDoSino(notas: readonly NotaDoSino[] = NOTAS_DO_SINO): number {
  return notas.reduce((fim, n) => Math.max(fim, n.inicio + n.duracao), 0)
}

/** O instante (ms) em que o timer acaba, se rodar a partir de `agora`. */
export function fimDoTimer(agora: number, restanteSegundos: number): number {
  return agora + Math.max(0, restanteSegundos) * 1000
}

/**
 * Segundos que faltam até `fimEm`, arredondados PARA CIMA: com 0,4s faltando a
 * tela ainda mostra 00:01, e o 00:00 só aparece quando acabou de verdade.
 */
export function restanteAte(fimEm: number, agora: number): number {
  return Math.max(0, Math.ceil((fimEm - agora) / 1000))
}
