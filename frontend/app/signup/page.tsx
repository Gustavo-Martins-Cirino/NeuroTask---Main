"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Loader2, CheckCircle } from "lucide-react"
import type { AuthError } from "@supabase/supabase-js"

function translateSignupError(error: AuthError): string {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "Este email já está em uso. Tente fazer login."
    case "weak_password":
      return "Senha muito fraca. Use ao menos 6 caracteres."
    case "email_address_invalid":
    case "validation_failed":
      return "Email inválido. Verifique e tente novamente."
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas. Aguarde um momento e tente de novo."
    case "signup_disabled":
      return "Os cadastros estão temporariamente desativados."
    default:
      return error.message || "Não foi possível criar a conta. Tente novamente."
  }
}

export default function SignupPage() {
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
      setError(translateSignupError(error))
      setLoading(false)
      return
    }

    // Supabase oculta emails já cadastrados por segurança: retorna sucesso
    // mas com identities vazio. Detectamos isso para avisar o usuário.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Este email já está em uso. Tente fazer login.")
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
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
                Enviamos um link de confirmação para <strong>{email}</strong>.
                Clique no link para ativar sua conta.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Não chegou? Olhe o <strong>spam</strong> e as abas{" "}
                <strong>Promoções/Atualizações</strong> (Gmail) ou <strong>Outros</strong> (Outlook) —{" "}
                {resendIn > 0 ? (
                  <span>reenviado ✓ (aguarde {resendIn}s para reenviar de novo)</span>
                ) : (
                  <button type="button" onClick={handleResend} className="font-medium text-primary hover:underline">
                    reenviar link
                  </button>
                )}
              </p>
            </div>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full h-11">
              Voltar para o login
            </Button>
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
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
            <p className="text-sm text-muted-foreground">
              Comece a organizar suas tarefas hoje
            </p>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11"
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
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
                Criando conta...
              </>
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
