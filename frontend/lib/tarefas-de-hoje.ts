import type { TaskPriority } from "@/lib/types"

// O card "Tarefas de hoje" do dashboard, com a MESMA definição de "Hoje" que a
// tela de Tarefas já usa: vence hoje, está atrasada ou não tem data — tudo o que
// fica no radar do dia (ver isUpcoming em app/app/tasks/page.tsx).
//
// Antes o card só via o que vencia hoje. Uma tarefa de ontem que ficou para
// trás sumia do dashboard, e o card ainda comemorava com "Nada com prazo para
// hoje. 🎉". E quem anota sem data — o jeito mais comum de anotar — via o card
// vazio com a lista cheia (relato do Ray: "esperava aparecer minha lista").

export type GrupoDoDia = "atrasada" | "hoje" | "semData"

export interface TarefaParaHoje {
  id: string
  title: string
  status: string
  priority: TaskPriority | string
  due_date: string | null
}

export type TarefaDoDia<T extends TarefaParaHoje = TarefaParaHoje> = T & { grupo: GrupoDoDia }

const PESO_DA_PRIORIDADE: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const ORDEM_DO_GRUPO: Record<GrupoDoDia, number> = { atrasada: 0, hoje: 1, semData: 2 }

const pendente = (status: string) => status === "pending" || status === "in_progress"

/** Em que grupo do dia a tarefa cai, ou `null` se ela não é do dia (feita, ou vence depois). */
export function grupoDoDia(t: TarefaParaHoje, agora: Date): GrupoDoDia | null {
  if (!pendente(t.status)) return null
  if (!t.due_date) return "semData"
  const prazo = new Date(t.due_date).getTime()
  if (!Number.isFinite(prazo)) return "semData"
  const inicioDeHoje = new Date(agora)
  inicioDeHoje.setHours(0, 0, 0, 0)
  const fimDeHoje = new Date(agora)
  fimDeHoje.setHours(23, 59, 59, 999)
  if (prazo > fimDeHoje.getTime()) return null
  return prazo < inicioDeHoje.getTime() ? "atrasada" : "hoje"
}

/**
 * As tarefas do dia, na ordem em que importam: atrasadas, depois as de hoje,
 * depois as sem data. Dentro de cada grupo, prioridade mais alta primeiro e,
 * empatando, o prazo mais antigo. Devolve também o total, para quem mostra
 * saber se cortou.
 */
export function tarefasDeHoje<T extends TarefaParaHoje>(
  tarefas: readonly T[],
  agora: Date,
  limite = 5
): { itens: TarefaDoDia<T>[]; total: number } {
  const doDia: TarefaDoDia<T>[] = []
  for (const t of tarefas) {
    const grupo = grupoDoDia(t, agora)
    if (grupo) doDia.push({ ...t, grupo })
  }
  doDia.sort(
    (a, b) =>
      ORDEM_DO_GRUPO[a.grupo] - ORDEM_DO_GRUPO[b.grupo] ||
      (PESO_DA_PRIORIDADE[a.priority] ?? 2) - (PESO_DA_PRIORIDADE[b.priority] ?? 2) ||
      (a.due_date ?? "").localeCompare(b.due_date ?? "") ||
      a.title.localeCompare(b.title)
  )
  return { itens: doDia.slice(0, Math.max(0, limite)), total: doDia.length }
}
