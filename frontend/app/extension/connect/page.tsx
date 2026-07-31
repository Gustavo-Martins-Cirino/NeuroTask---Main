"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Puzzle, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

type Status = "loading" | "needs-login" | "ready" | "authorizing" | "done" | "error"

export default function ExtensionConnectPage() {
  return (
    <Suspense fallback={null}>
      <ExtensionConnectContent />
    </Suspense>
  )
}

function ExtensionConnectContent() {
  const searchParams = useSearchParams()
  const state = searchParams.get("state")
  const [status, setStatus] = useState<Status>("loading")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStatus(user ? "ready" : "needs-login")
    })
  }, [])

  const authorize = async () => {
    if (!state) {
      setStatus("error")
      return
    }
    setStatus("authorizing")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus("needs-login")
      return
    }
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    const { error } = await supabase.from("extension_pairing_codes").insert({
      user_id: user.id,
      code: state,
      expires_at: expiresAt,
    })
    setStatus(error ? "error" : "done")
  }

  const loginHref = `/login?redirect=${encodeURIComponent(
    `/extension/connect?state=${state ?? ""}`
  )}`

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Puzzle className="h-7 w-7" />
        </div>

        {!state && (
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Link incompleto</h1>
            <p className="text-sm text-muted-foreground">
              Abra esta página a partir da extensão do NeuroTask.
            </p>
          </div>
        )}

        {state && status === "loading" && (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        )}

        {state && status === "needs-login" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Entre para conectar a extensão</h1>
              <p className="text-sm text-muted-foreground">
                Você precisa estar logado no NeuroTask para autorizar a extensão do navegador.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href={loginHref}>Entrar</Link>
            </Button>
          </div>
        )}

        {state && (status === "ready" || status === "authorizing") && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Autorizar extensão</h1>
              <p className="text-sm text-muted-foreground">
                A extensão do navegador vai poder mandar o tempo estimado em redes sociais
                pro seu dashboard do NeuroTask.
              </p>
            </div>
            <Button onClick={authorize} disabled={status === "authorizing"} className="w-full">
              {status === "authorizing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autorizando...
                </>
              ) : (
                "Autorizar esta extensão"
              )}
            </Button>
          </div>
        )}

        {state && status === "done" && (
          <div className="space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="text-xl font-semibold">Autorizado!</h1>
            <p className="text-sm text-muted-foreground">
              Pode fechar esta aba e voltar para o ícone da extensão — ela confirma sozinha.
            </p>
          </div>
        )}

        {state && status === "error" && (
          <div className="space-y-2">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-xl font-semibold">Não deu para autorizar</h1>
            <p className="text-sm text-muted-foreground">
              O link pode ter expirado. Volte na extensão e tente conectar de novo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
