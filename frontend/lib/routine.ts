import { createClient } from "@/lib/supabase/client"

// Perfil de rotina — tempos pessoais do usuário (Fase 2 · copiloto).
// Usado pelo planejamento retroativo e pelos avisos do calendário.
export interface RoutineProfile {
  get_ready_minutes: number
  meal_minutes: number
  commute_minutes: number
  sleep_hours: number
  calendar_warnings: boolean
}

export const DEFAULT_ROUTINE: RoutineProfile = {
  get_ready_minutes: 45,
  meal_minutes: 20,
  commute_minutes: 30,
  sleep_hours: 8,
  calendar_warnings: true,
}

export async function fetchRoutine(): Promise<RoutineProfile> {
  const supabase = createClient()
  const { data } = await supabase.from("routine_profile").select("*").maybeSingle()
  if (!data) return { ...DEFAULT_ROUTINE }
  return {
    get_ready_minutes: data.get_ready_minutes ?? DEFAULT_ROUTINE.get_ready_minutes,
    meal_minutes: data.meal_minutes ?? DEFAULT_ROUTINE.meal_minutes,
    commute_minutes: data.commute_minutes ?? DEFAULT_ROUTINE.commute_minutes,
    sleep_hours: Number(data.sleep_hours ?? DEFAULT_ROUTINE.sleep_hours),
    calendar_warnings: data.calendar_warnings ?? DEFAULT_ROUTINE.calendar_warnings,
  }
}

export async function saveRoutine(profile: RoutineProfile): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return "Você precisa estar logado"
  const { error } = await supabase
    .from("routine_profile")
    .upsert({ user_id: user.id, ...profile, updated_at: new Date().toISOString() })
  return error?.message ?? null
}
