"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"
import { dicionario } from "@/lib/i18n"

// A tela para onde o callback do OAuth manda quando algo dá errado. Fica fora do
// AppShell, então cuida sozinha do `lang` do documento.
export function ErroAutenticacao({ motivo }: { motivo?: string }) {
  const idioma = useIdioma()
  useSincronizarLangDoDocumento(idioma)
  const t = dicionario(idioma).entrada

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t.erroAutenticacao.titulo}</h1>
          <p className="text-muted-foreground">{t.erroAutenticacao.texto}</p>
          {motivo && (
            <p className="mx-auto max-w-sm rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {t.erroAutenticacao.detalheTecnico(motivo)}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/login">{t.voltarParaLogin}</Link>
        </Button>
      </div>
    </div>
  )
}
