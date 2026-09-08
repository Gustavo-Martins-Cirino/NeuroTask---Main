"use client"

import { useEffect } from "react"
import { useTimeFormat } from "@/hooks/use-time-format"
import { dicionario, idiomaDoFormato, LOCALE, type Dicionario, type Idioma } from "@/lib/i18n"

// O idioma DENTRO do app. Não guarda nada: pendura-se no formato de hora, que
// já mora no localStorage e já vira região (lib/regiao.ts explica por quê).
// Assim não existe o estado em que a bandeira diz "Estados Unidos" e o texto
// discorda — não há duas fontes para discordarem.
//
// Fora do app, em /agenda/<token>, a regra é outra: lá o idioma vem do
// navegador de quem abre o link, e não da preferência de quem compartilhou.

export function useIdioma(): Idioma {
  return idiomaDoFormato(useTimeFormat())
}

export function useDicionario(): Dicionario {
  return dicionario(useIdioma())
}

/** O locale de data/hora do idioma atual — para toLocaleDateString e Intl. */
export function useLocale(): string {
  return LOCALE[useIdioma()]
}

/**
 * Mantém o `lang` do documento igual ao idioma da interface.
 *
 * O `<html lang="pt-BR">` do layout é fixo — e tem de ser: o servidor não sabe
 * a escolha de quem vai abrir. Quando ela troca para inglês e ninguém corrige o
 * atributo, o documento passa a MENTIR: o Chrome oferece traduzir uma página
 * que já está em inglês, e o leitor de tela lê inglês com fonética portuguesa.
 *
 * Recebe o idioma em vez de chamar `useIdioma()` porque as duas pontas do app
 * o descobrem de jeitos diferentes: dentro, pela região; em /agenda/<token>,
 * pelo navegador de quem abre.
 */
export function useSincronizarLangDoDocumento(idioma: Idioma) {
  useEffect(() => {
    document.documentElement.lang = LOCALE[idioma]
  }, [idioma])
}
