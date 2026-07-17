import { createClient } from "@/lib/supabase/client"

// Insights de tempo de tela (dos check-ins da extensão de navegador).
// Agrega screen_time_log dos últimos 7 dias por domínio.

export interface ScreenTimeInsight {
  domain: string
  minutesToday: number
  minutesWeek: number
}

function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function fetchScreenTimeInsights(max = 5): Promise<ScreenTimeInsight[]> {
  const supabase = createClient()
  const since = new Date()
  since.setDate(since.getDate() - 6)

  const { data } = await supabase
    .from("screen_time_log")
    .select("domain, log_date, seconds")
    .gte("log_date", localDateKey(since))

  if (!data || data.length === 0) return []

  const today = localDateKey()
  const byDomain = new Map<string, { today: number; week: number }>()
  for (const row of data) {
    const entry = byDomain.get(row.domain) ?? { today: 0, week: 0 }
    entry.week += row.seconds
    if (row.log_date === today) entry.today += row.seconds
    byDomain.set(row.domain, entry)
  }

  return [...byDomain.entries()]
    .map(([domain, v]) => ({
      domain,
      minutesToday: Math.round(v.today / 60),
      minutesWeek: Math.round(v.week / 60),
    }))
    .sort((a, b) => b.minutesWeek - a.minutesWeek)
    .slice(0, max)
}
