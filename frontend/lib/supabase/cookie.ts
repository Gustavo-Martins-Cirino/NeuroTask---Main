import type { CookieOptionsWithName } from "@supabase/ssr"

// Como o cookie da sessão é gravado — o MESMO nos três clientes (navegador,
// servidor e proxy). Sem `name`: o cookie continua `sb-<ref>-auth-token`, e
// quem já está logado segue logado.
//
// `secure` em produção: o cookie recusa viajar por HTTP. Hoje o HSTS da Vercel
// já impede isso, mas é a plataforma segurando, não o cookie — e um domínio
// próprio novo começa sem HSTS. Em `next dev` (http://localhost) fica desligado.
//
// `httpOnly` continua FALSO, e é de propósito: o cliente do navegador lê a
// sessão do cookie. Fechá-lo derrubaria o login do lado do navegador inteiro.
export const OPCOES_DO_COOKIE: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
}
