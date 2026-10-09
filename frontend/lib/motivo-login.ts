// Por que o login falhou, como CÓDIGO — nunca a mensagem.
//
// O callback mandava o `error.message` do Supabase na URL, e a tela de erro
// mostrava o que viesse ali como "Detalhe técnico". Duas coisas erradas nisso:
// a mensagem crua (em inglês, com jargão do Supabase) ia para quem só queria
// entrar, e a tela mostrava QUALQUER texto que alguém pusesse num link —
// dentro do site de verdade, com cara de aviso oficial. Agora a URL leva um
// motivo de uma lista fechada, a frase sai do dicionário, e a mensagem crua
// fica no log do servidor, onde ajuda quem conserta.

export const MOTIVOS_LOGIN = ["linkVencido", "outroNavegador", "cancelado", "muitasTentativas"] as const
export type MotivoLogin = (typeof MOTIVOS_LOGIN)[number]

// Os códigos do Supabase Auth (`AuthError.code`) e o `error` que o provedor
// OAuth devolve quando a pessoa desiste na tela do Google ou do GitHub.
const PELO_CODIGO = new Map<string, MotivoLogin>([
  ["otp_expired", "linkVencido"],
  ["flow_state_expired", "linkVencido"],
  ["flow_state_not_found", "linkVencido"],
  ["pkce_code_verifier_not_found", "outroNavegador"],
  ["bad_code_verifier", "outroNavegador"],
  ["access_denied", "cancelado"],
  ["over_request_rate_limit", "muitasTentativas"],
  ["over_email_send_rate_limit", "muitasTentativas"],
])

/** O motivo de um código de erro, ou `null` quando ninguém previu esse código. */
export function motivoDoCodigo(codigo: string | null | undefined): MotivoLogin | null {
  return (codigo && PELO_CODIGO.get(codigo)) || null
}

/** Lido da URL pela tela de erro: só um motivo da lista passa. */
export function motivoDaUrl(valor: string | null | undefined): MotivoLogin | null {
  return MOTIVOS_LOGIN.find((m) => m === valor) ?? null
}
