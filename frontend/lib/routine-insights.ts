import { createClient } from "@/lib/supabase/client"
import { type ActivityCategory, type RoutineActivity } from "@/lib/routine"

// Rotina aprendida (Fase 2 · determinístico — sem ML/LLM):
// minera os blocos reais dos últimos 30 dias e o histórico de check-ins para
// SUGERIR novas atividades de rotina e ajustes de duração. O usuário confirma.

export type RoutineSuggestion =
  | { kind: "new"; key: string; title: string; category: ActivityCategory; minutes: number; days: number }
  | { kind: "adjust"; key: string; activityId: string; title: string; from: number; to: number; samples: number }

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim()
}

function similar(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  return na.length >= 5 && nb.length >= 5 && (na.includes(nb) || nb.includes(na))
}

function guessCategory(title: string): ActivityCategory {
  const t = norm(title)
  if (/desloc|trajeto|caminho|dirigir|onibus|metro|ida |volta /.test(t)) return "deslocamento"
  if (/almoc|cafe|jantar|lanche|comer|refei/.test(t)) return "refeicao"
  if (/arrumar|banho|preparar|higiene|vestir|lancheira/.test(t)) return "preparo"
  return "outro"
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const IGNORE_KEY = "nt-routine-suggestion-ignored"

export function ignoreSuggestion(key: string) {
  try {
    const cur = JSON.parse(localStorage.getItem(IGNORE_KEY) ?? "[]") as string[]
    localStorage.setItem(IGNORE_KEY, JSON.stringify([...new Set([...cur, key])]))
  } catch {
    /* ignora */
  }
}

function ignoredSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(IGNORE_KEY) ?? "[]") as string[])
  } catch {
    return new Set()
  }
}

export async function fetchRoutineSuggestions(activities: RoutineActivity[]): Promise<RoutineSuggestion[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString()

  const [blocksR, logR] = await Promise.all([
    supabase
      .from("time_blocks")
      .select("title, start_time, end_time")
      .gte("start_time", since)
      .lte("start_time", new Date().toISOString()),
    supabase.from("activity_log").select("title, actual_minutes").gte("done_at", since).limit(300),
  ])

  const ignored = ignoredSet()
  const out: RoutineSuggestion[] = []

  // ---- 1. Novas atividades: título recorrente em ≥ 3 dias distintos ----
  const groups = new Map<string, { title: string; days: Set<string>; durations: number[] }>()
  for (const b of blocksR.data ?? []) {
    const t = norm(b.title)
    if (!t || /dormir|sono|sleep/.test(t)) continue
    if (!groups.has(t)) groups.set(t, { title: b.title, days: new Set(), durations: [] })
    const g = groups.get(t)!
    const start = new Date(b.start_time)
    const end = new Date(b.end_time)
    g.days.add(`${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`)
    const dur = Math.round((end.getTime() - start.getTime()) / 60_000)
    if (dur > 0 && dur <= 240) g.durations.push(dur)
  }
  for (const g of groups.values()) {
    if (g.days.size < 3 || g.durations.length === 0) continue
    if (activities.some((a) => similar(a.name, g.title))) continue
    const key = `new-${norm(g.title)}`
    if (ignored.has(key)) continue
    const minutes = Math.max(5, Math.round(median(g.durations) / 5) * 5)
    out.push({ kind: "new", key, title: g.title, category: guessCategory(g.title), minutes, days: g.days.size })
  }

  // ---- 2. Ajustes de duração: check-ins dizem que a atividade leva outro tempo ----
  const logByTitle = new Map<string, number[]>()
  for (const row of logR.data ?? []) {
    const t = norm(row.title)
    if (!logByTitle.has(t)) logByTitle.set(t, [])
    logByTitle.get(t)!.push(row.actual_minutes)
  }
  for (const a of activities) {
    const samples = [...logByTitle.entries()]
      .filter(([t]) => similar(t, a.name))
      .flatMap(([, v]) => v)
    if (samples.length < 3) continue
    const real = Math.max(5, Math.round(median(samples) / 5) * 5)
    if (Math.abs(real - a.duration_minutes) < 10) continue
    const key = `adjust-${a.id}-${real}`
    if (ignored.has(key)) continue
    out.push({ kind: "adjust", key, activityId: a.id, title: a.name, from: a.duration_minutes, to: real, samples: samples.length })
  }

  return out.slice(0, 4)
}
