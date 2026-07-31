// Envia falhas do navegador para /api/errors. Regra de ouro: reportar erro
// NUNCA pode gerar erro — toda falha aqui é engolida de propósito. Se o
// relatório quebrar, o usuário não pode perceber.

export type OrigemErro =
  | "boundary-app"
  | "boundary-publico"
  | "boundary-global"
  | "window"
  | "promise"

// Erro em loop de render dispara o mesmo relatório sem parar. A assinatura
// corta a repetição na origem, antes de virar tráfego.
const jaEnviados = new Set<string>()
const TETO_ASSINATURAS = 50

function assinatura(mensagem: string, origem: string, rota: string): string {
  return `${origem}|${rota}|${mensagem.slice(0, 120)}`
}

export function reportarErro(
  erro: unknown,
  origem: OrigemErro,
  digest?: string
): void {
  try {
    if (typeof window === "undefined") return

    const mensagem =
      erro instanceof Error
        ? erro.message
        : typeof erro === "string"
          ? erro
          : "Erro desconhecido"
    if (!mensagem) return

    const rota = window.location?.pathname ?? ""
    const chave = assinatura(mensagem, origem, rota)
    if (jaEnviados.has(chave)) return
    // Set sem teto vira vazamento numa sessão longa; ao encher, recomeça.
    if (jaEnviados.size >= TETO_ASSINATURAS) jaEnviados.clear()
    jaEnviados.add(chave)

    const corpo = JSON.stringify({
      mensagem,
      stack: erro instanceof Error ? erro.stack : undefined,
      digest,
      rota,
      origem,
    })

    // keepalive: o envio sobrevive se a pessoa navegar ou fechar a aba logo
    // depois de quebrar — exatamente o que ela faz quando algo dá errado.
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: corpo,
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
