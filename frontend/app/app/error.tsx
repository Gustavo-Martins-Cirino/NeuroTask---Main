"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { RotateCw, House, TriangleAlert } from "lucide-react"
import { reportarErro } from "@/lib/error-report"

// Erro dentro do app logado. Fica DENTRO do AppShell, então o dock continua na
// tela: a pessoa sai andando pra outra rota em vez de ficar presa. Sem isso,
// qualquer erro de render virava a tela branca "Application error" do Next.

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app] erro não tratado:", error)
    reportarErro(error, "boundary-app", error.digest)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-8 text-center shadow-sm"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
          <TriangleAlert className="h-5 w-5 text-destructive" />
        </span>

        <h1 className="text-lg font-semibold">Essa parte quebrou</h1>
        <p className="text-sm text-muted-foreground">
          O erro é nosso, não seu — e o resto do app continua funcionando. Tente de novo;
          se persistir, me conte o que você estava fazendo aqui.
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
            className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Tentar de novo
          </button>
          <Link
            href="/app"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border/50 px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <House className="h-3.5 w-3.5" />
            Ir para o início
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
