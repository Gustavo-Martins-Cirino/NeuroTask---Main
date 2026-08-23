// A resposta da Neuro aparecendo enquanto ela fala, na conversa ao vivo.
//
// O texto chega INTEIRO do servidor (a rota responde de uma vez) e só depois é
// falado em pedaços. Jogar tudo na tela de uma vez daria a resposta escrita
// antes de a voz começar — e aí a leitura corre na frente da fala, o que é o
// contrário do que se quer aqui. Por isso a revelação é por tempo.

/** Velocidade da voz da Neuro em pt-BR, medida em caracteres por segundo. */
export const CHARS_POR_SEGUNDO = 16

export function charsRevelados(decorridoMs: number, cps: number = CHARS_POR_SEGUNDO): number {
  if (!Number.isFinite(decorridoMs) || decorridoMs <= 0) return 0
  return Math.floor((decorridoMs / 1000) * cps)
}

/**
 * O pedaço do texto já revelado, sempre terminando em palavra inteira.
 *
 * Cortar no caractere exato faz a última palavra crescer letra a letra, e o
 * olho passa a perseguir a ponta em vez de ler. Parando no último espaço, a
 * palavra aparece pronta.
 */
export function fatiar(texto: string, chars: number): string {
  if (chars <= 0) return ""
  if (chars >= texto.length) return texto
  const corte = texto.slice(0, chars)
  // O corte caiu bem no fim de uma palavra: não há nada pela metade para tirar.
  if (/\s/.test(texto[chars])) return corte
  const parcial = /\s\S*$/.exec(corte)
  return parcial ? corte.slice(0, parcial.index) : ""
}

/**
 * Fecha um `**` que ficou sozinho no corte.
 *
 * Sem isto, o negrito partido ao meio vaza como asterisco na tela até a segunda
 * metade da palavra chegar.
 */
export function fecharMarcacao(texto: string): string {
  const marcas = texto.match(/\*\*/g)?.length ?? 0
  if (marcas % 2 === 0) return texto
  const ultima = texto.lastIndexOf("**")
  return texto.slice(0, ultima) + texto.slice(ultima + 2)
}
