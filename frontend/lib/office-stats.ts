import { createClient } from "@/lib/supabase/client"

// Estatísticas que dão VIDA ao escritório — sempre derivadas de trabalho
// real (princípio anti-farm): tarefa em andamento, conclusões e streak.

export interface OfficeStats {
  working: boolean // há tarefa "em andamento" agora
  completed: number // total de tarefas concluídas
  streak: number // dias seguidos com ao menos 1 conclusão
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function computeStreak(completedAt: string[]): number {
  const days = new Set(completedAt.map((iso) => dayKey(new Date(iso))))
  const cur = new Date()
  // Hoje ainda sem conclusão não quebra o streak — começa de ontem
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cur))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

export async function fetchOfficeStats(): Promise<OfficeStats> {
  const supabase = createClient()
  const since = new Date(Date.now() - 90 * 24 * 3_600_000).toISOString()
  const [inProgR, completedR, recentR] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase
      .from("tasks")
      .select("completed_at")
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte("completed_at", since)
      .limit(1000),
  ])
  return {
    working: (inProgR.count ?? 0) > 0,
    completed: completedR.count ?? 0,
    streak: computeStreak((recentR.data ?? []).map((r) => r.completed_at as string)),
  }
}
