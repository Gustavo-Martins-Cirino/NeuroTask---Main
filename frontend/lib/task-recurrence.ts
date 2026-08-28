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

/**
 * O valor do formulário virando o que vai para o banco.
 *
 * "none" é NULO na coluna, e não a string "none": uma tarefa que não repete não
 * tem regra nenhuma. A conversão morava escrita à mão no diálogo, e passou a
 * valer também para o menu rápido do cartão — duas cópias da mesma regra é
 * como uma delas fica para trás.
 */
export function regraParaBanco(valor: string, aCadaDias = 1): string | null {
  if (valor === "none" || !valor) return null
  if (valor === "every") return `every:${Math.max(1, Math.floor(aCadaDias) || 1)}`
  return valor
}

/**
 * Repetição que o menu rápido do cartão NÃO sabe montar (hoje, "a cada N dias").
 *
 * Ela existe para o menu não mentir: oferecer só as fixas e marcar nenhuma
 * faria uma tarefa que repete a cada 3 dias parecer que não repete. Quem cai
 * aqui é mandado ao diálogo, que é onde o número se escolhe.
 */
export function ehRepeticaoPersonalizada(rule: string | null | undefined): boolean {
  return typeof rule === "string" && /^every:\d+$/.test(rule)
}

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
  const next = nextOccurrence(base ?? new Date(), rule)
  if (!next) return null

  const agora = Date.now()
  if (next.getTime() > agora) return next

  // Regras em dias saltam DIRETO para a próxima ocorrência futura. Avançar de
  // um em um esbarrava no limite do laço: uma tarefa diária largada por mais
  // de ~2,7 anos devolvia data no PASSADO como se fosse o próximo prazo.
  const dias =
    rule === "daily" ? 1 : rule === "weekly" ? 7 : Number(rule.match(/^every:(\d+)$/)?.[1] ?? 0)

  if (dias > 0) {
    const passo = dias * 86_400_000
    const saltos = Math.ceil((agora - next.getTime()) / passo)
    next.setDate(next.getDate() + saltos * dias)
    // O salto é por ms e a aplicação é por dia de calendário: no horário de
    // verão isso pode faltar uma hora. Uma volta resolve.
    while (next.getTime() <= agora) next.setDate(next.getDate() + dias)
    return next
  }

  // monthly/yearly convergem rápido (cada volta é um mês ou um ano).
  let atual: Date | null = next
  let guard = 0
  while (atual && atual.getTime() <= agora && guard < 5000) {
    atual = nextOccurrence(atual, rule)
    guard++
  }
  return atual
}
