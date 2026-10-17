// O que a rota da Neuro aceita do cliente, em tamanho.
//
// O app manda as últimas 6 mensagens (chat e voz, `slice(-6)`), mas o servidor
// aceitava qualquer coisa: uma chamada direta à API podia mandar mil mensagens
// de 100 mil caracteres e mais "anotações do dia" sem fim, e tudo ia ao Groq.
// No plano gratuito isso só esbarra no teto do provedor; no pago, é conta — e o
// limite diário por pessoa (lib/cota-ia) conta PEDIDOS, não tamanho. Aqui o
// servidor para de confiar no `slice` do cliente.

/** O corpo inteiro, antes do JSON.parse. Folga larga sobre o maior pedido legítimo. */
export const MAX_CORPO_IA = 64_000

/** Uma acima das 6 do cliente: se ele mudar para 7, ninguém perde mensagem calado. */
export const MAX_MENSAGENS_IA = 8

/** Por mensagem. Uma resposta longa da Neuro com recibo fica bem abaixo disto. */
export const MAX_CARACTERES_POR_MENSAGEM = 4_000

export const MAX_ANOTACOES_DO_DIA = 4_000

export interface MensagemDeChat {
  role: "user" | "assistant"
  content: string
}

/** Só papéis válidos, só as últimas, e cada uma cortada no teto. */
export function limitaConversa(bruto: unknown): MensagemDeChat[] {
  if (!Array.isArray(bruto)) return []
  return bruto
    .filter(
      (m): m is MensagemDeChat =>
        !!m && typeof m === "object" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    )
    .slice(-MAX_MENSAGENS_IA)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES_POR_MENSAGEM) }))
}

/**
 * O fuso em minutos (o `getTimezoneOffset` do cliente). Os fusos de verdade vão
 * de -14h a +12h; fora disso, ou se não for número, vale UTC — um "tz" de 10
 * milhões jogava as datas do prompt para outro século.
 */
export function limitaFuso(bruto: unknown): number {
  return typeof bruto === "number" && Number.isFinite(bruto) && Math.abs(bruto) <= 14 * 60 ? Math.round(bruto) : 0
}

export function limitaAnotacoes(bruto: unknown): string {
  return typeof bruto === "string" ? bruto.trim().slice(0, MAX_ANOTACOES_DO_DIA) : ""
}
