"use client"

import { useEffect } from "react"
import { reportarErro } from "@/lib/error-report"

// Último recurso: só dispara quando o PRÓPRIO layout raiz quebra. Substitui o
// <html>/<body> inteiro, então não há ThemeProvider, fonte nem globals.css aqui
// — o estilo vai inline de propósito, senão a tela de erro também quebraria.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global] layout raiz quebrou:", error)
    reportarErro(error, "boundary-global", error.digest)
  }, [error])

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#17191e",
          color: "#e8eaed",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <p style={{ fontSize: "2.5rem", margin: 0 }}>😵‍💫</p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          O NeuroTask travou feio
        </h1>
        <p style={{ maxWidth: "26rem", margin: 0, color: "#9aa0a6", lineHeight: 1.5 }}>
          Não foi você — foi um erro nosso. Recarregar costuma resolver; se insistir,
          me avise o que você estava fazendo.
        </p>
        {error.digest && (
          <code style={{ fontSize: "0.75rem", color: "#5f6368" }}>#{error.digest}</code>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            border: 0,
            borderRadius: "0.75rem",
            padding: "0.7rem 1.4rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            background: "#7c5cff",
            color: "#fff",
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  )
}
