"use client"

import Link from "next/link"
import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"
import { dicionario } from "@/lib/i18n"

// Componente de CLIENTE agora: o idioma mora no navegador (a região guardada no
// localStorage), e esta tela fica fora do AppShell, que é quem sincroniza o `lang`.
export default function NotFound() {
  const idioma = useIdioma()
  useSincronizarLangDoDocumento(idioma)
  const t = dicionario(idioma).erro

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-bold text-foreground">{t.naoEncontrada.titulo}</h1>
      <p className="max-w-sm text-muted-foreground">{t.naoEncontrada.texto}</p>
      <Link
        href="/app"
        className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t.voltarAoInicio}
      </Link>
    </div>
  )
}
