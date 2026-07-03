// Cache do briefing da Neuro IA — evita refazer a chamada (e gastar limite)
// a cada vez que o chat ou a conversa por voz é aberto. Reaproveita por 15 min,
// e nunca atravessa a virada do dia (o briefing é sobre "hoje").
const KEY = "neurotask-briefing"
const TTL = 15 * 60 * 1000

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function getCachedBriefing(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { text, ts, day } = JSON.parse(raw)
    if (
      typeof text === "string" && text &&
      typeof ts === "number" && Date.now() - ts < TTL &&
      day === todayKey()
    ) {
      return text
    }
  } catch {
    /* ignora */
  }
  return null
}

export function setCachedBriefing(text: string) {
  if (!text || text === "__RATE_LIMIT__") return
  try {
    localStorage.setItem(KEY, JSON.stringify({ text, ts: Date.now(), day: todayKey() }))
  } catch {
    /* ignora */
  }
}
