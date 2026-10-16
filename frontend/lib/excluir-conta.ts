import type { Idioma } from "@/lib/i18n"

// Excluir a própria conta: a palavra que a pessoa digita para confirmar e a
// checagem de que o pedido nasceu no próprio site.
//
// O que é apagado não mora aqui: a rota apaga a conta no Supabase Auth, e o
// banco faz o resto — toda tabela com dado de usuário referencia auth.users com
// `on delete cascade`, exceto `feedback` e `error_log`, que ficam com o
// `user_id` nulo (anônimas). O teste irmão lê os SQLs e quebra se uma tabela
// nova esquecer disso. Fora do banco só existe a foto de perfil, no Storage,
// que a rota apaga antes.

/** A palavra de confirmação, no idioma que a tela mostra. */
export const PALAVRA_DE_EXCLUSAO: Record<Idioma, string> = { pt: "EXCLUIR", en: "DELETE" }

/**
 * Se o que foi digitado confirma a exclusão, sem diferenciar maiúsculas nem os
 * espaços das pontas. Com `idioma`, só a palavra que a tela mostrou vale; sem
 * ele (no servidor, que não sabe qual tela foi), vale a de qualquer idioma.
 */
export function confirmaExclusao(digitado: string, idioma?: Idioma): boolean {
  const limpo = digitado.trim().toUpperCase()
  if (idioma) return limpo === PALAVRA_DE_EXCLUSAO[idioma]
  return Object.values(PALAVRA_DE_EXCLUSAO).includes(limpo)
}

/**
 * Se o pedido veio do próprio site: o `Origin` que o navegador manda tem de ser
 * o mesmo host que recebeu o pedido. Ação que não tem volta não aceita pedido
 * montado em outra página (CSRF), nem pedido sem `Origin`.
 */
export function mesmaOrigem(origem: string | null, host: string | null): boolean {
  if (!origem || !host) return false
  try {
    return new URL(origem).host === host
  } catch {
    return false
  }
}
