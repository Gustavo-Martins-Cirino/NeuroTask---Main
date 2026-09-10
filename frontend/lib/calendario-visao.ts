// As quatro visões do calendário.
//
// O tipo mora aqui, e não na página, por um motivo pequeno e chato: o
// dicionário (lib/i18n) precisa dele para exigir um nome por visão, e a página
// é um componente de cliente — importar dela para o dicionário arrastaria o
// React inteiro para dentro de um módulo de dados.
//
// O VALOR continua em português ("mes", sem acento) porque é o que já está
// gravado no localStorage de quem usa. Traduzir o valor renomearia a chave e
// jogaria fora a visão preferida de todo mundo; o que se traduz é o NOME.

export type VisaoDoCalendario = "dia" | "semana" | "mes" | "ano"

export const VISOES: readonly VisaoDoCalendario[] = ["dia", "semana", "mes", "ano"]

export function ehVisao(v: unknown): v is VisaoDoCalendario {
  return typeof v === "string" && (VISOES as readonly string[]).includes(v)
}
