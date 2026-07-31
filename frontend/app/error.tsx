"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RotateCw } from "lucide-react"
import { reportarErro } from "@/lib/error-report"

// Erro nas rotas públicas (landing, login, cadastro). Aqui não há AppShell nem
// dock pra segurar a pessoa, então o caminho de volta é explícito. Quebrar no
// login é o pior lugar possível: é o primeiro contato de quem vamos convidar.

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[público] erro não tratado:", error)
    reportarErro(error, "boundary-publico", error.digest)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="text-5xl">😵‍💫</p>
      <h1 className="text-2xl font-bold text-foreground">Algo deu errado</h1>
      <p className="max-w-sm text-muted-foreground">
        O erro é nosso, não seu. Tentar de novo costuma resolver.
      </p>

      {error.digest && (
        <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          #{error.digest}
        </code>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Tentar de novo
        </button>
        <Link
          href="/"
          className="flex h-10 items-center rounded-xl border border-border/50 px-5 text-sm font-medium transition-colors hover:bg-accent"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
