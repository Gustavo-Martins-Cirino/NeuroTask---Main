// Mãos no teclado: o boneco DIGITA quando há tarefa em andamento (o mesmo
// `working` que já acende o monitor, vindo de lib/office-stats). Antes ele só
// respirava, e a sala parecia um diorama — um boneco parado numa mesa bonita.
//
// Este módulo é puro: só a matemática do movimento. Quem acha as malhas e chama
// a cada quadro é components/office-scene-3d.
//
// O antebraço e a mão giram em torno do COTOVELO, então o que sai daqui é um
// ÂNGULO em radianos — não uma altura. A mão desenha um arco, como a de gente.

/** Ângulo máximo de uma tecladinha (radianos). Com o antebraço que o modelo
 *  usa, isso dá ~2 cm de sobe-e-desce na mão: ela paira sobre as teclas e
 *  encosta no fundo do movimento. Mais que isso e ela atravessa o teclado. */
export const TECLA_AMPLITUDE = 0.075

/** Segundos para as mãos entrarem ou saírem do ritmo. Sem essa rampa elas
 *  congelam no meio de uma tecladinha quando a tarefa termina — a mão fica
 *  parada no ar, torta. */
export const TECLA_RAMPA_S = 0.35

/**
 * Ângulo do antebraço no instante `t` (segundos). `lado` +1 = direito.
 *
 * Duas ondas de frequências que não fecham conta uma com a outra: sozinha, a
 * senoide vira metrônomo, e ninguém digita no compasso. A soma anda e
 * desanda, que é como teclado de verdade soa.
 */
export function typingTap(t: number, lado: 1 | -1): number {
  // Contratempo, não oposição exata (π seria as duas mãos em espelho perfeito,
  // de novo mecânico demais).
  const fase = lado > 0 ? 0 : 1.9
  const rapido = Math.sin(t * 9.4 + fase)
  const lento = Math.sin(t * 3.1 + fase * 1.7) * 0.4
  return ((rapido + lento) / 1.4) * TECLA_AMPLITUDE
}

/**
 * Avança a intensidade (0 = mãos paradas, 1 = digitando a pleno) rumo ao alvo.
 * Recebe o valor de agora e devolve o do próximo quadro — puro, o estado mora
 * num ref da cena.
 */
export function typingRamp(atual: number, trabalhando: boolean, dt: number): number {
  const alvo = trabalhando ? 1 : 0
  // Passo CONSTANTE, não interpolação exponencial: assim TECLA_RAMPA_S é mesmo
  // o tempo de entrar/sair, e não uma constante de tempo que nunca chega lá.
  const passo = Math.max(0, dt) / TECLA_RAMPA_S
  const proximo = atual < alvo ? Math.min(alvo, atual + passo) : Math.max(alvo, atual - passo)
  return Math.min(1, Math.max(0, proximo))
}
