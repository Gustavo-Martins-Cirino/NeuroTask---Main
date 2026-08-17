import { type TimeFormat } from "./time-format"

// Região do usuário — hoje, só Brasil e Estados Unidos.
//
// O nome importa: isto é **região e formato de hora**, nunca "idioma". O app
// inteiro está em português cravado no JSX, e uma bandeira que prometesse
// tradução estaria mentindo. Traduzir de verdade é extrair cada string para um
// dicionário — outro trabalho, muito maior.
//
// **Não há armazenamento próprio de propósito.** A região é DERIVADA do formato
// de hora que já mora no localStorage (hooks/use-time-format): com duas regiões
// e um mapa 1-para-1, guardar as duas coisas só criaria a chance de elas
// discordarem. Quem já escolhera 24h continua no Brasil sem migração nenhuma.
// Se um dia entrar uma terceira região que também use 24h, este arquivo é que
// muda — aí a região vira dado próprio e o formato passa a sair dela.

export type Regiao = "BR" | "US"

export interface RegiaoInfo {
  value: Regiao
  /** O nome que a pessoa entende. É o rótulo do botão — "Brasil", não "24h". */
  nome: string
  formato: TimeFormat
  /** A mesma hora nos dois formatos, para a escolha se explicar sozinha. */
  exemplo: string
}

export const REGIOES: RegiaoInfo[] = [
  { value: "BR", nome: "Brasil", formato: "24h", exemplo: "14:30" },
  { value: "US", nome: "Estados Unidos", formato: "12h", exemplo: "2:30 PM" },
]

export const REGIAO_DEFAULT: Regiao = "BR"

export function infoDaRegiao(regiao: Regiao): RegiaoInfo {
  return REGIOES.find((r) => r.value === regiao) ?? REGIOES[0]
}

export function regiaoDoFormato(formato: TimeFormat): Regiao {
  return REGIOES.find((r) => r.formato === formato)?.value ?? REGIAO_DEFAULT
}

export function formatoDaRegiao(regiao: Regiao): TimeFormat {
  return infoDaRegiao(regiao).formato
}
