// Repetição de tarefas — ao concluir uma tarefa recorrente, o prazo avança
// para a próxima ocorrência (estilo Todoist) em vez de encerrar a tarefa.
// Regras: daily | weekly | monthly | yearly | every:N (a cada N dias)

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Não repete" },
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
  { value: "monthly", label: "Mensalmente" },
  { value: "yearly", label: "Anualmente" },
] as const

export function recurrenceLabel(rule: string | null | undefined): string | null {
  if (!rule) return null
  const fixed = RECURRENCE_OPTIONS.find((o) => o.value === rule)
  if (fixed && fixed.value !== "none") return fixed.label
  const m = rule.match(/^every:(\d+)$/)
  if (m) return `A cada ${m[1]} dia${Number(m[1]) > 1 ? "s" : ""}`
  return null
}

export function nextOccurrence(from: Date, rule: string): Date | null {
  const d = new Date(from)
  if (rule === "daily") d.setDate(d.getDate() + 1)
  else if (rule === "weekly") d.setDate(d.getDate() + 7)
  else if (rule === "monthly") d.setMonth(d.getMonth() + 1)
  else if (rule === "yearly") d.setFullYear(d.getFullYear() + 1)
  else {
    const m = rule.match(/^every:(\d+)$/)
    if (!m) return null
    d.setDate(d.getDate() + Math.max(1, Number(m[1])))
  }
  return d
}

// Próxima ocorrência garantidamente no futuro (pula ocorrências já passadas)
export function nextFutureOccurrence(base: Date | null, rule: string): Date | null {
  let next = nextOccurrence(base ?? new Date(), rule)
  let guard = 0
  while (next && next.getTime() <= Date.now() && guard < 1000) {
    next = nextOccurrence(next, rule)
    guard++
  }
  return next
}
