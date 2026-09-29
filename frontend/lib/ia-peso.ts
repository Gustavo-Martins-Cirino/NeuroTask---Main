// Quanto cada chamada pesa — para poder decidir o que cortar, em vez de achar.
//
// **O que deu origem a isto**: o teto de 8.000 tokens/minuto da chave gratuita
// do Groq é o gargalo do app, e até aqui ninguém sabia para ONDE os tokens iam.
// A rodada Z mediu esperas de 13s, esperou 150s e foi recusada de novo — o que
// não é contradição com um teto por minuto, se uma mensagem sozinha for capaz
// de esvaziar o balde dentro do próprio pedido.
//
// Esta é a conta que permite verificar isso: o schema das ferramentas ia junto
// em TODAS as voltas do laço, e ele sozinho é o pedaço maior da chamada.
//
// A estimativa é por bytes, e é estimativa mesmo: quem tokeniza é o provedor, e
// não há tokenizador do Llama aqui. Serve para comparar chamadas entre si e
// para cruzar com o `Used`/`Requested` que o próprio 429 informa — não para
// prever se a próxima passa.

/** Bytes por token, aproximado. JSON de schema é denso em pontuação, que tokeniza mal. */
const BYTES_POR_TOKEN = 3.6

export interface PesoDaChamada {
  /** O corpo inteiro, como vai pela rede. */
  bytes: number
  /** Estimativa do total. */
  tokens: number
  /** Só o schema das ferramentas — o pedaço que se repete a cada volta. */
  tokensDeFerramentas: number
  /** A conversa: system, mensagens e resultados de ferramenta. */
  tokensDeConversa: number
}

function emTokens(valor: unknown): number {
  if (valor === undefined) return 0
  return Math.round(JSON.stringify(valor).length / BYTES_POR_TOKEN)
}

/**
 * Separa o que se repete do que cresce.
 *
 * A separação é o ponto: `tokensDeConversa` cresce ao longo do laço (cada volta
 * empilha a resposta do modelo e os resultados das ferramentas), enquanto
 * `tokensDeFerramentas` é **constante e idêntico** em toda volta que o leve.
 * Ver os dois lado a lado no log é o que mostra qual dos dois vale atacar.
 */
export function pesoDaChamada(payload: Record<string, unknown>): PesoDaChamada {
  const corpo = payload ?? {}
  const tokensDeFerramentas = emTokens(corpo.tools)
  const tokensDeConversa = emTokens(corpo.messages)
  return {
    bytes: JSON.stringify(corpo).length,
    tokens: tokensDeFerramentas + tokensDeConversa,
    tokensDeFerramentas,
    tokensDeConversa,
  }
}

/**
 * A linha do log.
 *
 * `max_tokens` entra porque é a hipótese em aberto: se o Groq contar o teto de
 * saída no orçamento do minuto — e não só o que foi gerado —, então 4.096 são
 * mais de metade dos 8.000 antes de o modelo escrever a primeira palavra. O
 * `Requested` do 429 confirma ou derruba, e só dá para cruzar os dois se este
 * número estiver escrito.
 */
export function linhaDePeso(volta: number, p: PesoDaChamada, maxTokens: number): string {
  return (
    `[neuro-ia] chamada: volta=${volta} tokens~=${p.tokens} ` +
    `(ferramentas ${p.tokensDeFerramentas} + conversa ${p.tokensDeConversa}) ` +
    `max_tokens=${maxTokens} bytes=${p.bytes}`
  )
}
