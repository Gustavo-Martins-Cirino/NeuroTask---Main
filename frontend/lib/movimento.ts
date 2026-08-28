// Quanto tempo uma animação dura quando o sistema pede menos movimento.
//
// `prefers-reduced-motion` existe contra movimento que embrulha o estômago:
// parallax, giro, zoom, coisa grande atravessando a tela. A recomendação é
// REDUZIR, não apagar — e apagar foi o que este app vinha fazendo.
//
// O preço apareceu na prática. O Gustavo passou dias achando que o gráfico não
// tinha animação e que a borda da conversa estava congelada: o Windows dele
// estava com "Mostrar animações" desligado, e o app obedecia apagando tudo. Uma
// pessoa que nunca mexeu nessa opção veria o app inteiro parado sem entender por
// quê — e "Mostrar animações" também cai sozinho em quem escolhe "Ajustar para
// melhor desempenho" nas opções de desempenho do Windows.
//
// A separação abaixo é a régua: o que a animação FAZ decide se ela pode sumir.

export type ClasseDeMovimento =
  /** Mostra um dado: o gráfico se desenhando, um número subindo até o valor.
   *  Some, e a pessoa perde informação — some, e o clique parece não ter feito
   *  nada. É pequeno, local e não desloca a tela: não é gatilho vestibular. */
  | "informativo"
  /** Enfeite: fundo que respira, luz que gira, deslize de página. Ninguém perde
   *  dado nenhum se parar, e é justo aqui que mora o desconforto. */
  | "ambiente"

/** O quanto o informativo encurta quando o sistema pede menos movimento. Não é
 *  zero: encurtar mantém a leitura e tira a insistência. */
export const FATOR_REDUZIDO = 0.55

export function duracaoDoMovimento(
  base: number,
  classe: ClasseDeMovimento,
  reduzido: boolean | null
): number {
  if (!reduzido) return base
  return classe === "ambiente" ? 0 : base * FATOR_REDUZIDO
}
