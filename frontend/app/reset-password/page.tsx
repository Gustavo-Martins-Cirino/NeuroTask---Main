"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthBackdrop } from "@/components/auth-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CampoSenha } from "@/components/campo-senha"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2, CheckCircle } from "lucide-react"
import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"
import { dicionario } from "@/lib/i18n"
import { enfatizar } from "@/lib/enfase"

// Três caminhos:
// 1. Sem sessão e sem token → pede o e-mail e envia o link de redefinição.
// 2. Com token na URL (veio do link do e-mail) → formulário de nova senha;
//    o token de uso único só é consumido (verifyOtp) no ENVIO — imune a
//    scanners de e-mail corporativo que abrem links antes do usuário.
// 3. Com sessão → formulário de nova senha direto.
export default function ResetPasswordPage() {
  // Fora do AppShell: esta página cuida sozinha do `lang` do documento.
  const idioma = useIdioma()
  useSincronizarLangDoDocumento(idioma)
  const t = dicionario(idioma).entrada
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token_hash")
    if (token) {
      setTokenHash(token)
      window.history.replaceState({}, "", "/reset-password") // tira o token da URL
    }
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setChecking(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // API direta (sem PKCE): o token do e-mail vale em QUALQUER navegador/
    // dispositivo — pedir no PC e abrir no celular funciona.
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.trim() }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.status === 429 ? t.senhaNova.erros.muitasTentativasMinuto : t.senhaNova.erros.naoEnviou)
      return
    }
    setSent(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(t.senhaNova.erros.senhasDiferentes)
      return
    }
    setLoading(true)
    // Consome o token de uso único agora (não no clique do link do e-mail)
    if (!hasSession && tokenHash) {
      const { error: otpError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
      if (otpError) {
        setLoading(false)
        setTokenHash(null)
        setError(t.senhaNova.erros.linkExpirado)
        return
      }
      setHasSession(true)
    }
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(
        error.code === "same_password"
          ? t.senhaNova.erros.senhaIgual
          : error.code === "weak_password"
            ? t.senhaFraca
            : error.message
      )
      return
    }
    router.push("/app")
    router.refresh()
  }

  if (checking) {
    return (
      <AuthBackdrop>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </AuthBackdrop>
    )
  }

  if (sent) {
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
                {enfatizar(t.senhaNova.seExistirConta(email))}
                <br />
                <span className="mt-1 inline-block">
                  {enfatizar(t.senhaNova.soOMaisRecente)}
                </span>
              </p>
            </div>
          </div>
          <Link href="/login">
            <Button variant="outline" className="h-11 w-full">{t.voltarParaLogin}</Button>
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
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {hasSession || tokenHash ? t.senhaNova.novaSenha : t.senhaNova.redefinirSenha}
            </h1>
            <p className="text-sm text-muted-foreground">
              {hasSession || tokenHash ? t.senhaNova.subtituloNova : t.senhaNova.subtituloRedefinir}
            </p>
          </div>
        </div>

        {hasSession || tokenHash ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t.senhaNova.novaSenha}</Label>
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
            <div className="space-y-2">
              <Label htmlFor="confirm">{t.senhaNova.confirmarNovaSenha}</Label>
              <CampoSenha
                id="confirm"
                placeholder={t.senhaNova.repitaSenha}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.senhaNova.salvando}
                </>
              ) : (
                t.senhaNova.salvarNovaSenha
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-4">
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.senhaNova.enviando}
                </>
              ) : (
                t.senhaNova.enviarLink
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t.senhaNova.lembrouSenha}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t.entrar}
          </Link>
        </p>
      </div>
    </AuthBackdrop>
  )
}
