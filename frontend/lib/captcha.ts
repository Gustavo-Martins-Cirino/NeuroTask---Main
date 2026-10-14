// O CAPTCHA (Cloudflare Turnstile) do login, do cadastro e do "esqueci a senha".
//
// Por que existe: aqui o login e o cadastro vão do navegador DIRETO para o
// Supabase — um robô nem passa pela página, chama a API. Nada no formulário
// barra isso; só um CAPTCHA que o PRÓPRIO Supabase confere (Authentication →
// Attack Protection).
//
// Ligar é em duas metades, NESTA ordem: (1) a Site Key na Vercel
// (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) faz o widget aparecer e o token ir junto;
// (2) a Secret Key no painel do Supabase faz ele EXIGIR o token. Na ordem
// inversa ninguém entra: o Supabase pediria um token que a tela ainda não manda.

export function captchaLigado(siteKey: string | undefined): siteKey is string {
  return typeof siteKey === "string" && siteKey.trim().length > 0
}

/**
 * O corpo do `POST /auth/v1/recover`. O "esqueci a senha" chama a API direto
 * (sem supabase-js, para o link valer em qualquer aparelho), então o token vai
 * onde o Supabase procura: `gotrue_meta_security.captcha_token`.
 */
export function corpoDoPedidoDeSenha(email: string, token: string | null): Record<string, unknown> {
  const corpo: Record<string, unknown> = { email: email.trim() }
  if (token) corpo.gotrue_meta_security = { captcha_token: token }
  return corpo
}
