// Cache do briefing da Neuro IA — evita refazer a chamada (e gastar limite)
// a cada vez que o chat ou a conversa por voz é aberto. Reaproveita por 15 min.
const KEY = "neurotask-briefing"
const TTL = 15 * 60 * 1000

export function getCachedBriefing(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { text, ts } = JSON.parse(raw)
    if (typeof text === "string" && text && typeof ts === "number" && Date.now() - ts < TTL) return text
  } catch {
    /* ignora */
  }
  return null
}

export function setCachedBriefing(text: string) {
  if (!text || text === "__RATE_LIMIT__") return
  try {
    localStorage.setItem(KEY, JSON.stringify({ text, ts: Date.now() }))
  } catch {
    /* ignora */
  }
}
