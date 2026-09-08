"use client"

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
