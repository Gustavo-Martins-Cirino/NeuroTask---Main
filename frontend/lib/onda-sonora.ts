// A luz que respira no rodapé da conversa ao vivo.
//
// Referência: a mancha colorida que o Claude acende embaixo enquanto fala.
// Ela existe porque a conversa ao vivo é a única tela onde a pessoa fica sem
// fazer nada esperando — e áudio, ao contrário de texto, não deixa rastro na
// tela. Sem nada se mexendo não dá para saber se a Neuro está falando, se
// travou, ou se o microfone pegou.
//
// A cor é o que diz de quem é a vez: AZUL quando é você, VERDE quando é ela.

export type EstadoOnda = "parado" | "ouvindo" | "falando"

/**
 * De quem é a vez, a partir do estado da conversa.
 *
 * `segurando` é o botão do microfone pressionado — ele vale mais que o resto
 * porque a fala da pessoa interrompe a da Neuro (barge-in): no instante em que
 * alguém segura o microfone, a vez já é dela, mesmo que o áudio ainda esteja
 * terminando de sair.
 */
export function estadoDaOnda(fase: string, segurando: boolean): EstadoOnda {
  if (segurando || fase === "listening") return "ouvindo"
  if (fase === "speaking") return "falando"
  return "parado"
}
