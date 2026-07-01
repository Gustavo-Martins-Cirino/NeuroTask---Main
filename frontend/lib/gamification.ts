import { createClient } from "@/lib/supabase/client"
import type { TaskPriority } from "@/lib/types"

export const XP_PER_LEVEL = 100

export const XP_BY_PRIORITY: Record<TaskPriority, number> = {
  low: 5,
  medium: 10,
  high: 20,
  urgent: 30,
}

export function xpForTask(priority: TaskPriority): number {
  return XP_BY_PRIORITY[priority] ?? 10
}

export interface Gamification {
  totalXp: number
  level: number
  currentXp: number
  xpForNextLevel: number
}

export interface XpUpdateDetail {
  gamification: Gamification
  amount: number
}

export function computeGamification(totalXp: number): Gamification {
  const safe = Math.max(0, totalXp)
  return {
    totalXp: safe,
    level: Math.floor(safe / XP_PER_LEVEL) + 1,
    currentXp: safe % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
  }
}

export async function fetchGamification(): Promise<Gamification> {
  const supabase = createClient()
  const { data } = await supabase
    .from("user_stats")
    .select("total_xp")
    .maybeSingle()
  return computeGamification(data?.total_xp ?? 0)
}

export const XP_UPDATED_EVENT = "neurotask:xp-updated"

export async function awardXp(amount: number): Promise<Gamification | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("award_xp", { p_amount: amount })
  if (error) {
    console.error("Falha ao conceder XP:", error.message)
    return null
  }
  const result = computeGamification(typeof data === "number" ? data : 0)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<XpUpdateDetail>(XP_UPDATED_EVENT, {
        detail: { gamification: result, amount },
      })
    )
  }
  return result
}
