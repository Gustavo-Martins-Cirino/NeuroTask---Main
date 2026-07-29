// Interpretação das mensagens do bot do Telegram — determinística, sem LLM
// (princípio do projeto: o que dá para resolver por regra não usa IA).
// Módulo PURO de propósito: não toca Supabase nem rede, então dá para testar
// o parser sozinho.

export type TelegramCommand =
  | { kind: "start"; code?: string }
  | { kind: "help" }
  | { kind: "today" }
  | { kind: "unlink" }
  | { kind: "task"; title: string; description: string | null }
  | { kind: "empty" }

const TITULO_MAX = 200

// Primeira linha vira título; o resto (se houver) vira descrição. Mensagem de
// uma linha só continua sendo uma tarefa simples.
export function textoParaTarefa(texto: string): { title: string; description: string | null } | null {
  const linhas = texto.split("\n").map((l) => l.trim())
  const primeira = linhas.findIndex((l) => l.length > 0)
  if (primeira === -1) return null
  const title = linhas[primeira].replace(/\s+/g, " ").slice(0, TITULO_MAX)
  const resto = linhas.slice(primeira + 1).join("\n").trim()
  return { title, description: resto.length > 0 ? resto : null }
}

export function parseCommand(raw: string | undefined | null): TelegramCommand {
  const texto = (raw ?? "").trim()
  if (texto.length === 0) return { kind: "empty" }

  if (!texto.startsWith("/")) {
    const t = textoParaTarefa(texto)
    return t ? { kind: "task", ...t } : { kind: "empty" }
  }

  // "/tarefa@MeuBot algo" → comando "tarefa", argumento "algo"
  const espaco = texto.search(/\s/)
  const cabeca = (espaco === -1 ? texto : texto.slice(0, espaco)).slice(1).toLowerCase()
  const comando = cabeca.split("@")[0]
  const arg = espaco === -1 ? "" : texto.slice(espaco + 1).trim()

  switch (comando) {
    case "start":
      return { kind: "start", code: arg.length > 0 ? arg.split(/\s+/)[0] : undefined }
    case "ajuda":
    case "help":
      return { kind: "help" }
    case "hoje":
      return { kind: "today" }
    case "sair":
    case "stop":
    case "desconectar":
      return { kind: "unlink" }
    case "tarefa":
    case "task":
    case "nova": {
      const t = textoParaTarefa(arg)
      return t ? { kind: "task", ...t } : { kind: "help" }
    }
    default:
      return { kind: "help" }
  }
}

export const AJUDA = [
  "🧠 NeuroTask — o que eu entendo:",
  "",
  "• Qualquer mensagem vira uma tarefa.",
  "  (primeira linha = título, o resto = descrição)",
  "• /tarefa <texto> — mesma coisa, explícito",
  "• /hoje — o que você tem para hoje",
  "• /ajuda — esta mensagem",
  "• /sair — desconecta esta conversa da sua conta",
].join("\n")
