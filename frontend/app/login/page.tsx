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
import { Sparkles, Loader2 } from "lucide-react"
import { SocialLogin, SeloUltimoUso, useUltimoMetodo } from "@/components/social-login"
import { lembrarMetodo } from "@/lib/auth-metodos"
import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"
import { dicionario, type Dicionario } from "@/lib/i18n"
import { enfatizar } from "@/lib/enfase"
import type { AuthError } from "@supabase/supabase-js"

// O erro do Supabase vem pelo CÓDIGO; a frase é do idioma. Sem código
// conhecido, a mensagem crua do Supabase ainda diz mais que um "tente de novo".
function textoDoErroDeLogin(error: AuthError, t: Dicionario["entrada"]): string {
  switch (error.code) {
    case "invalid_credentials":
      return t.login.erros.credenciaisInvalidas
    case "email_not_confirmed":
      return t.login.erros.emailNaoConfirmado
    case "over_request_rate_limit":
      return t.muitasTentativas
    case "user_banned":
      return t.login.erros.contaSuspensa
    default:
      return error.message || t.login.erros.generico
  }
}

export default function LoginPage() {
  // Fora do AppShell: esta página cuida sozinha do `lang` do documento.
  const idioma = useIdioma()
  useSincronizarLangDoDocumento(idioma)
  const t = dicionario(idioma).entrada
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const ultimoMetodo = useUltimoMetodo()

  const handleResend = async () => {
    setResent(true)
    await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUnconfirmed(false)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(textoDoErroDeLogin(error, t))
      setUnconfirmed(error.code === "email_not_confirmed")
      setResent(false)
      setLoading(false)
      return
    }

    // Aqui dá para guardar DEPOIS de dar certo — diferente do OAuth, que leva a
    // pessoa para fora da página antes de haver resposta.
    lembrarMetodo("senha")
    router.push("/app")
    router.refresh()
  }

  return (
    <AuthBackdrop>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">NeuroTask</h1>
            <p className="text-sm text-muted-foreground">
              {t.login.subtitulo}
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t.senha}</Label>
              <Link href="/reset-password" className="text-xs font-medium text-primary hover:underline">
                {t.login.esqueceuSenha}
              </Link>
            </div>
            <CampoSenha
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {unconfirmed && (
            <p className="text-sm text-muted-foreground">
              {enfatizar(t.login.olheOSpam)}{" "}
              {resent ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{t.login.linkReenviado}</span>
              ) : (
                <button type="button" onClick={handleResend} className="font-medium text-primary hover:underline">
                  {t.login.reenviarConfirmacao}
                </button>
              )}
            </p>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.login.entrando}
              </>
            ) : (
              <>
                {t.entrar}
                {ultimoMetodo === "senha" && (
                  <SeloUltimoUso className="ml-2 bg-primary-foreground/20 text-primary-foreground/90" />
                )}
              </>
            )}
          </Button>
        </form>

        <SocialLogin modo="entrar" mostrarSelo />

        <p className="text-center text-sm text-muted-foreground">
          {t.login.naoTemConta}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t.criarConta}
          </Link>
        </p>
      </div>
    </AuthBackdrop>
  )
}
