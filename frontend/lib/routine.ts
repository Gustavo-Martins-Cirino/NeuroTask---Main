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

// ---- Atividades de rotina (biblioteca nomeada com duração) ----

export type ActivityCategory = "preparo" | "deslocamento" | "refeicao" | "outro"

export interface RoutineActivity {
  id: string
  name: string
  category: ActivityCategory
  duration_minutes: number
}

export const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string; color: string }[] = [
  { value: "preparo", label: "Preparo", color: "#8b5cf6" },
  { value: "deslocamento", label: "Deslocamento", color: "#06b6d4" },
  { value: "refeicao", label: "Refeição", color: "#f97316" },
  { value: "outro", label: "Outro", color: "#6366f1" },
]

export function categoryColor(category: string): string {
  return ACTIVITY_CATEGORIES.find((c) => c.value === category)?.color ?? "#6366f1"
}

export async function fetchActivities(): Promise<RoutineActivity[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("routine_activities")
    .select("id, name, category, duration_minutes")
    .order("created_at", { ascending: true })
  return (data as RoutineActivity[]) ?? []
}

export async function addActivity(
  a: Omit<RoutineActivity, "id">
): Promise<{ activity?: RoutineActivity; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Você precisa estar logado" }
  const { data, error } = await supabase
    .from("routine_activities")
    .insert({ user_id: user.id, ...a })
    .select("id, name, category, duration_minutes")
    .single()
  if (error) return { error: error.message }
  return { activity: data as RoutineActivity }
}

export async function updateActivityDuration(id: string, duration_minutes: number): Promise<void> {
  const supabase = createClient()
  await supabase.from("routine_activities").update({ duration_minutes }).eq("id", id)
}

export async function deleteActivity(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("routine_activities").delete().eq("id", id)
}
