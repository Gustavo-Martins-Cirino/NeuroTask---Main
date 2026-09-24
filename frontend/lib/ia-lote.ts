// Criar vários blocos é UM pedido, não dez.
//
// **O bug que deu origem a isto** (relatório de 22/09/2026): pedidos de 10
// blocos em que só 2 entravam. A causa não era o banco — era o laço: com uma
// ferramenta que cria um bloco por chamada, dez blocos viram dez idas ao
// modelo, e o laço tem quatro voltas (e um teto de uso por minuto antes
// disso). O que sobrava era metade do pedido e uma prosa dizendo "já salvei o
// que você pediu".
//
// Com o array, o pedido inteiro chega numa chamada só: o servidor grava os dez
// sem voltar ao modelo. E o total pedido vira `blocos.length` — dado
// estruturado. É o que deixa a frase do limite dizer "2 de 10" sem ler a frase
// que o modelo escreveu.

export const CRIAR_BLOCOS_EM_LOTE = "create_time_blocks"

/** Os campos que `create_time_block` aceita, copiados um a um. */
const CAMPOS = ["title", "start_time", "end_time", "description", "color", "recurrence_rule"] as const

function texto(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0
}

/**
 * Os blocos de uma chamada em lote, já no formato de `create_time_block`.
 *
 * Devolve só os itens que têm o mínimo para virar bloco (título e os dois
 * horários). Item torto é DESCARTADO, e não corrigido: o que falta aqui é o
 * modelo ter mandado, e inventar horário para completar seria a mesma coisa
 * que o recibo existe para impedir.
 */
export function blocosDoLote(args: Record<string, unknown>): Record<string, unknown>[] {
  const bruto = (args ?? {}).blocos
  if (!Array.isArray(bruto)) return []
  const saida: Record<string, unknown>[] = []
  for (const item of bruto) {
    if (!item || typeof item !== "object") continue
    const b = item as Record<string, unknown>
    if (!texto(b.title) || !texto(b.start_time) || !texto(b.end_time)) continue
    const limpo: Record<string, unknown> = {}
    for (const campo of CAMPOS) if (campo in b) limpo[campo] = b[campo]
    saida.push(limpo)
  }
  return saida
}
