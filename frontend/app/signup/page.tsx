"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthBackdrop } from "@/components/auth-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CampoSenha } from "@/components/campo-senha"
import { Label } from "@/components/ui/label"
import { Sparkles, Loader2, CheckCircle } from "lucide-react"
import { SocialLogin } from "@/components/social-login"
import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"
import { dicionario, type Dicionario } from "@/lib/i18n"
import { enfatizar } from "@/lib/enfase"
import type { AuthError } from "@supabase/supabase-js"

function textoDoErroDeCadastro(error: AuthError, t: Dicionario["entrada"]): string {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return t.cadastro.erros.emailEmUso
    case "weak_password":
      return t.senhaFraca
    case "email_address_invalid":
    case "validation_failed":
      return t.cadastro.erros.emailInvalido
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return t.muitasTentativas
    case "signup_disabled":
      return t.cadastro.erros.cadastrosDesativados
    default:
      return error.message || t.cadastro.erros.generico
  }
}

export default function SignupPage() {
  // Fora do AppShell: esta página cuida sozinha do `lang` do documento.
  const idioma = useIdioma()
  useSincronizarLangDoDocumento(idioma)
  const t = dicionario(idioma).entrada
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const handleResend = async () => {
    setResendIn(60)
    const timer = setInterval(() => {
      setResendIn((v) => {
        if (v <= 1) clearInterval(timer)
        return Math.max(0, v - 1)
      })
    }, 1000)
    await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
        data: {
          name,
        },
      },
    })

    if (error) {
      setError(textoDoErroDeCadastro(error, t))
      setLoading(false)
      return
    }

    // Supabase oculta emails já cadastrados por segurança: retorna sucesso
    // mas com identities vazio. Detectamos isso para avisar o usuário.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError(t.cadastro.erros.emailEmUso)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <AuthBackdrop>
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 shadow-lg">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t.verifiqueSeuEmail}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {enfatizar(t.cadastro.enviamosConfirmacao(email))}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {enfatizar(t.cadastro.naoChegou)}{" "}
                {resendIn > 0 ? (
                  <span>{t.cadastro.reenviadoAguarde(resendIn)}</span>
                ) : (
                  <button type="button" onClick={handleResend} className="font-medium text-primary hover:underline">
                    {t.cadastro.reenviarLink}
                  </button>
                )}
              </p>
            </div>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full h-11">
              {t.voltarParaLogin}
            </Button>
          </Link>
        </div>
      </AuthBackdrop>
    )
  }

  return (
    <AuthBackdrop>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">{t.criarConta}</h1>
            <p className="text-sm text-muted-foreground">
              {t.cadastro.subtitulo}
            </p>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.cadastro.nome}</Label>
            <Input
              id="name"
              type="text"
              placeholder={t.cadastro.nomePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.senha}</Label>
            <CampoSenha
              id="password"
              placeholder={t.minimoSeisCaracteres}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.cadastro.criandoConta}
              </>
            ) : (
              t.criarConta
            )}
          </Button>
        </form>

        <SocialLogin modo="criar" />

        <p className="text-center text-sm text-muted-foreground">
          {t.cadastro.jaTemConta}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t.entrar}
          </Link>
        </p>
      </div>
    </AuthBackdrop>
  )
}
