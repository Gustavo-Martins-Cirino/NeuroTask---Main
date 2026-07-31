"use client"

import { useEffect } from "react"
import { reportarErro } from "@/lib/error-report"

// Os error boundaries só pegam erro de RENDER. A maior parte do que quebra na
// prática não passa por eles: falha dentro de um onClick, promise rejeitada,
// chamada ao Supabase que morre. Isso some no console de quem está usando e
// não chega em ninguém. Aqui é onde esse tipo de falha vira registro.
//
// Montado no layout raiz: vale nas rotas públicas também, porque quebrar no
// login é o primeiro contato de quem estamos convidando.

export function ErrorListener() {
  useEffect(() => {
    const onErro = (e: ErrorEvent) => {
      // Falha ao carregar imagem/script também dispara 'error', mas sem
      // e.error. Não é exceção de código e só faria ruído.
      if (!e.error) return
      reportarErro(e.error, "window")
    }

    const onPromise = (e: PromiseRejectionEvent) => {
      reportarErro(e.reason, "promise")
    }

    window.addEventListener("error", onErro)
    window.addEventListener("unhandledrejection", onPromise)
    return () => {
      window.removeEventListener("error", onErro)
      window.removeEventListener("unhandledrejection", onPromise)
    }
  }, [])

  return null
}
