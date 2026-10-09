import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { destinoSeguro } from '@/lib/destino-seguro'
import { motivoDoCodigo } from '@/lib/motivo-login'

// A URL de erro leva um MOTIVO de lista fechada, nunca a mensagem do Supabase:
// a tela mostra o que vier ali (ver lib/motivo-login.ts). A mensagem crua vai
// para o log da Vercel, onde ajuda quem conserta.
function paraErro(origin: string, codigo?: string | null) {
  const motivo = motivoDoCodigo(codigo)
  return NextResponse.redirect(`${origin}/auth/error${motivo ? `?reason=${motivo}` : ''}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // O `next` vem da URL, ou seja, de quem montou o link: só caminho do próprio
  // site passa (ver lib/destino-seguro.ts).
  const next = destinoSeguro(searchParams.get('next'))

  const supabase = await createClient()

  // Recovery: NÃO verifica no GET — scanners de e-mail corporativo
  // (Outlook SafeLinks etc.) abrem o link antes do usuário e consumiriam
  // o token de uso único. O token segue para a página, que só o consome
  // quando o usuário ENVIA a nova senha.
  if (tokenHash && type === 'recovery') {
    return NextResponse.redirect(
      `${origin}/reset-password?token_hash=${encodeURIComponent(tokenHash)}`
    )
  }

  // Fluxo por token (link de e-mail) — funciona em qualquer dispositivo,
  // inclusive abrir no celular um cadastro feito no PC
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.warn('[auth/callback]', error.code, error.message)
    return paraErro(origin, error.code)
  }

  // Fluxo PKCE (OAuth / mesmo navegador)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.warn('[auth/callback]', error.code, error.message)
    return paraErro(origin, error.code)
  }

  // Sem code nem token: o provedor devolveu erro (ex.: a pessoa desistiu na
  // tela do Google), em `error` ou `error_code`.
  return paraErro(origin, searchParams.get('error_code') ?? searchParams.get('error'))
}
