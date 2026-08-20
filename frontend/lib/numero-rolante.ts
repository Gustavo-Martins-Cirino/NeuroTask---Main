// Decompõe um número já formatado nos "glifos" que o componente NumeroRolante
// desenha: dígitos, que rolam numa coluna 0–9, e caracteres fixos (separador de
// milhar, sinal, os dois-pontos do relógio), que ficam parados. Puro e
// testável — a animação por quadro mora no componente.

export type Glifo =
  | { tipo: "digito"; valor: number }
  | { tipo: "fixo"; char: string }

const EH_DIGITO = /[0-9]/

export function glifosDe(texto: string): Glifo[] {
  return Array.from(texto, (char) =>
    EH_DIGITO.test(char)
      ? { tipo: "digito", valor: Number(char) }
      : { tipo: "fixo", char }
  )
}

/**
 * Número inteiro em texto, com casas mínimas (zeros à esquerda) e agrupamento
 * de milhar opcional. Trunca a parte fracionária — o rolador é para contadores,
 * não para decimais.
 */
export function formataInteiro(
  n: number,
  { minCasas = 1, agrupar = false, sepMilhar = "." }: {
    minCasas?: number
    agrupar?: boolean
    sepMilhar?: string
  } = {}
): string {
  const negativo = n < 0
  const abs = Math.abs(Math.trunc(n))
  let corpo = String(abs).padStart(Math.max(1, minCasas), "0")
  if (agrupar) corpo = agrupaMilhares(corpo, sepMilhar)
  return (negativo ? "-" : "") + corpo
}

function agrupaMilhares(digitos: string, sep: string): string {
  let saida = ""
  for (let i = 0; i < digitos.length; i++) {
    if (i > 0 && (digitos.length - i) % 3 === 0) saida += sep
    saida += digitos[i]
  }
  return saida
}

/**
 * Numera os glifos a partir da DIREITA. É o que faz o React manter a mesma
 * coluna quando o número muda de largura (99 → 100): a casa das unidades
 * continua sendo a de chave 0, então ela rola em vez de ser remontada.
 */
export function comChaveDaDireita<T>(glifos: T[]): { glifo: T; chave: number }[] {
  const n = glifos.length
  return glifos.map((glifo, i) => ({ glifo, chave: n - 1 - i }))
}
