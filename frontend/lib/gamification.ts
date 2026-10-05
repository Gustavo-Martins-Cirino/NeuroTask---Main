import { createClient } from "@/lib/supabase/client"
import { queueOfficeCelebration } from "@/hooks/use-office-celebration"
import { funcaoAusente, leRespostaDoFoco } from "@/lib/foco-pontos"
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

// ---- Anti-farm (Fase 3) ----
// 1. Tarefa criada e concluída em menos de 10 min não vale XP (farm óbvio).
// 2. Tarefa sem prazo E sem duração estimada vale metade (baixo compromisso).
// 3. Teto diário de 150 XP — aplicado no SERVIDOR (função award_xp).
export const MIN_TASK_AGE_MIN = 10
export const DAILY_XP_CAP = 150

export function taskXpAmount(task: {
  priority: TaskPriority
  created_at: string
  due_date?: string | null
  estimated_minutes?: number | null
}): number {
  const ageMin = (Date.now() - new Date(task.created_at).getTime()) / 60_000
  if (ageMin < MIN_TASK_AGE_MIN) return 0
  let amount = xpForTask(task.priority)
  if (!task.due_date && !task.estimated_minutes) amount = Math.ceil(amount / 2)
  return amount
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
  /** XP do Modo Foco: a barra sobe, mas sem o toast genérico e sem festa no
   *  Escritório — a tela do foco já mostra o que entrou, e um aviso a cada 5
   *  minutos seria o oposto de foco. */
  silencioso?: boolean
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

export async function awardXp(amount: number, silencioso = false): Promise<Gamification | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("award_xp", { p_amount: amount })
  if (error) {
    console.error("Falha ao conceder XP:", error.message)
    return null
  }
  const result = computeGamification(typeof data === "number" ? data : 0)
  if (typeof window !== "undefined") {
    // XP positivo = trabalho real (o anti-farm acima já filtrou): o Escritório
    // deve comemorar, mesmo que a sala só seja aberta daqui a pouco.
    if (amount > 0 && !silencioso) queueOfficeCelebration()
    window.dispatchEvent(
      new CustomEvent<XpUpdateDetail>(XP_UPDATED_EVENT, {
        detail: { gamification: result, amount, silencioso },
      })
    )
  }
  return result
}

/**
 * XP do Modo Foco (tempo focado e o bônus da tarefa dobrada — lib/foco-pontos),
 * pela cota própria do foco. Devolve quanto o servidor de fato concedeu, ou null
 * quando não dá para saber. Sempre silencioso: quem mostra é a tela do foco.
 *
 * Sem `foco_xp.sql` rodado, a função não existe: o mesmo XP vai pelo award_xp
 * comum, dentro do teto de 150. Vale menos, mas o foco não deixa de pagar.
 */
export async function awardFocusXp(amount: number): Promise<number | null> {
  if (amount <= 0) return 0
  const silencioso = true
  const supabase = createClient()
  const { data, error } = await supabase.rpc("award_focus_xp", { p_amount: amount })
  if (error) {
    if (funcaoAusente(error)) {
      await awardXp(amount, silencioso)
      return null
    }
    console.error("Falha ao conceder XP do foco:", error.message)
    return null
  }
  const resposta = leRespostaDoFoco(data)
  if (!resposta) return null
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<XpUpdateDetail>(XP_UPDATED_EVENT, {
        detail: { gamification: computeGamification(resposta.total), amount: resposta.concedido, silencioso },
      })
    )
  }
  return resposta.concedido
}
