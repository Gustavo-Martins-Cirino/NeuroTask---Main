"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Loader2 } from "lucide-react"
import type { AuthError } from "@supabase/supabase-js"

function translateLoginError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email ou senha incorretos."
    case "email_not_confirmed":
      return "Confirme seu email antes de entrar. Verifique sua caixa de entrada."
    case "over_request_rate_limit":
      return "Muitas tentativas. Aguarde um momento e tente de novo."
    case "user_banned":
      return "Esta conta está suspensa."
    default:
      return error.message || "Não foi possível entrar. Tente novamente."
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
      setError(translateLoginError(error))
      setUnconfirmed(error.code === "email_not_confirmed")
      setResent(false)
      setLoading(false)
      return
    }

    router.push("/app")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">NeuroTask</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas tarefas com inteligência
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
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
              Olhe também a caixa de <strong>spam</strong>.{" "}
              {resent ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Link reenviado! ✓</span>
              ) : (
                <button type="button" onClick={handleResend} className="font-medium text-primary hover:underline">
                  Reenviar link de confirmação
                </button>
              )}
            </p>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
