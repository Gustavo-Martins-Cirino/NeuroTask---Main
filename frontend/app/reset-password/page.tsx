"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2, CheckCircle } from "lucide-react"

// Três caminhos:
// 1. Sem sessão e sem token → pede o e-mail e envia o link de redefinição.
// 2. Com token na URL (veio do link do e-mail) → formulário de nova senha;
//    o token de uso único só é consumido (verifyOtp) no ENVIO — imune a
//    scanners de e-mail corporativo que abrem links antes do usuário.
// 3. Com sessão → formulário de nova senha direto.
export default function ResetPasswordPage() {
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
    const t = params.get("token_hash")
    if (t) {
      setTokenHash(t)
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(
        error.code === "over_email_send_rate_limit"
          ? "Muitas tentativas. Aguarde um momento e tente de novo."
          : error.message
      )
      return
    }
    setSent(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    setLoading(true)
    // Consome o token de uso único agora (não no clique do link do e-mail)
    if (!hasSession && tokenHash) {
      const { error: otpError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
      if (otpError) {
        setLoading(false)
        setTokenHash(null)
        setError("Este link já foi usado ou expirou. Peça um novo abaixo.")
        return
      }
      setHasSession(true)
    }
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : error.code === "weak_password"
            ? "Senha muito fraca. Use ao menos 6 caracteres."
            : error.message
      )
      return
    }
    router.push("/app")
    router.refresh()
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 shadow-lg">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Verifique seu email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Se existir uma conta para <strong>{email}</strong>, enviamos um link para
                redefinir a senha. Olhe também o <strong>spam</strong> e as abas{" "}
                <strong>Promoções/Atualizações</strong> (Gmail) ou <strong>Outros</strong> (Outlook).
              </p>
            </div>
          </div>
          <Link href="/login">
            <Button variant="outline" className="h-11 w-full">Voltar para o login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {hasSession || tokenHash ? "Nova senha" : "Redefinir senha"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {hasSession || tokenHash
                ? "Escolha a nova senha da sua conta"
                : "Enviaremos um link de redefinição para o seu e-mail"}
            </p>
          </div>
        </div>

        {hasSession || tokenHash ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repita a senha"
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
                  Salvando...
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
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
                  Enviando...
                </>
              ) : (
                "Enviar link de redefinição"
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
