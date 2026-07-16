import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/app'

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
    return NextResponse.redirect(`${origin}/auth/error?reason=${encodeURIComponent(error.message)}`)
  }

  // Fluxo PKCE (OAuth / mesmo navegador)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    return NextResponse.redirect(`${origin}/auth/error?reason=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
