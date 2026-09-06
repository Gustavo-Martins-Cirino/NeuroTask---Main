// De onde sai o nome que o app mostra.
//
// São DUAS chaves no `user_metadata`, e ninguém escolheu isso: o cadastro por
// e-mail grava `name` (é o que o formulário manda), e Google e GitHub gravam
// `full_name` (é o padrão deles). Quem entrou por um provedor não tem `name`.
//
// O estrago aparecia em quem usava login social: a saudação do dashboard lia só
// `name`, não achava, e caía no pedaço do e-mail — "Boa tarde, pai" para alguém
// chamado Carlos. No mesmo instante, o avatar do cabeçalho mostrava "CC", porque
// ELE lia as duas chaves. Duas respostas para a mesma pergunta, na mesma tela.
//
// A ordem abaixo é a decisão: o nome que a PESSOA escolheu vence o que o
// provedor mandou. Se ela editou nas Configurações, é porque quer aquele — e
// gravar `name` sem ler `name` primeiro faria a edição não surtir efeito nenhum.

export interface MetadataDeNome {
  name?: unknown
  full_name?: unknown
}

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

/**
 * O nome de exibição, ou "" quando não há nenhum.
 *
 * O e-mail entra como último recurso e só o pedaço antes do @ — melhor um
 * apelido esquisito que um endereço inteiro no meio de uma saudação.
 */
export function nomeDeExibicao(
  metadata: MetadataDeNome | null | undefined,
  email?: string | null
): string {
  const escolhido = texto(metadata?.name)
  if (escolhido) return escolhido
  const doProvedor = texto(metadata?.full_name)
  if (doProvedor) return doProvedor
  const local = texto(email).split("@")[0]
  return local
}

/** Só o primeiro nome — é o que cabe numa saudação. */
export function primeiroNome(
  metadata: MetadataDeNome | null | undefined,
  email?: string | null
): string {
  return nomeDeExibicao(metadata, email).split(/\s+/)[0] ?? ""
}
