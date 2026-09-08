"use client"

import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"

// Não desenha nada: só mantém o `lang` do documento acompanhando o idioma
// escolhido. Fica no AppShell para valer em todas as telas de dentro de uma vez.
export function IdiomaDoDocumento() {
  useSincronizarLangDoDocumento(useIdioma())
  return null
}
