import { createClient } from "@/lib/supabase/client"

// Registro de atividades concluídas (check-in): planejado vs. real.
// Base do autoconhecimento — "você leva em média X min para Y".

export async function logActivity(title: string, plannedMinutes: number, actualMinutes: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("activity_log").insert({
    user_id: user.id,
    title: title.trim(),
    planned_minutes: Math.max(1, Math.round(plannedMinutes)),
    actual_minutes: Math.max(1, Math.round(actualMinutes)),
  })
}

export interface ActivityInsight {
  title: string
  count: number
  avgPlanned: number
  avgActual: number
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
}

// Agrega o histórico por título (normalizado) — médias de planejado vs. real
export async function fetchActivityInsights(max = 4): Promise<ActivityInsight[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("activity_log")
    .select("title, planned_minutes, actual_minutes")
    .order("done_at", { ascending: false })
    .limit(200)
  if (!data || data.length === 0) return []

  const groups = new Map<string, { title: string; planned: number[]; actual: number[] }>()
  for (const row of data) {
    const key = norm(row.title)
    if (!groups.has(key)) groups.set(key, { title: row.title, planned: [], actual: [] })
    const g = groups.get(key)!
    g.planned.push(row.planned_minutes)
    g.actual.push(row.actual_minutes)
  }

  const avg = (a: number[]) => Math.round(a.reduce((s, v) => s + v, 0) / a.length)
  return [...groups.values()]
    .map((g) => ({ title: g.title, count: g.planned.length, avgPlanned: avg(g.planned), avgActual: avg(g.actual) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
}
