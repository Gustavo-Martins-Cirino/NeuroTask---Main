import { createClient } from "@/lib/supabase/client"

// Amigos (Fase 3 — social). Toda leitura sensível passa por RPCs no banco
// (friends.sql) que validam amizade aceita + flags de privacidade.

export interface MyProfile {
  user_id: string
  username: string
  display_name: string | null
  share_status: boolean
  share_office: boolean
  share_level: boolean
  discoverable: boolean
  share_schedule: boolean
}

export interface UserSearchResult {
  user_id: string
  username: string
  display_name: string | null
}

export interface FriendEntry {
  friendship_id: string
  friend_id: string
  username: string
  display_name: string | null
  state: "accepted" | "pending_in" | "pending_out"
  busy: boolean | null // null = não compartilha (ou pendente)
  can_visit: boolean
  can_schedule: boolean
}

export interface FriendOffice {
  username: string
  display_name: string | null
  items: string[]
  level: number | null
  avatar: unknown | null
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const supabase = createClient()
  const { data } = await supabase.from("profiles").select("*").maybeSingle()
  return data ?? null
}

export function normalizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20)
}

export async function claimUsername(username: string, displayName: string | null): Promise<{ profile?: MyProfile; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Você precisa estar logado" }
  const clean = normalizeUsername(username)
  if (clean.length < 3) return { error: "Use ao menos 3 caracteres (letras, números e _)" }
  const { data, error } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, username: clean, display_name: displayName?.trim() || null })
    .select()
    .single()
  if (error) {
    return { error: error.message.includes("unique") || error.code === "23505" ? "Esse @usuário já foi escolhido — tente outro" : error.message }
  }
  return { profile: data }
}

export async function updatePrivacy(
  field: "share_status" | "share_office" | "share_level" | "discoverable" | "share_schedule",
  value: boolean
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("profiles").update({ [field]: value }).eq("user_id", user.id)
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const supabase = createClient()
  const { data } = await supabase.rpc("search_users", { p_query: query.trim() })
  return data ?? []
}

// Perfis abertos (discoverable) fora das suas amizades — social_v2.sql
export async function fetchSuggestedUsers(): Promise<UserSearchResult[]> {
  const supabase = createClient()
  const { data } = await supabase.rpc("suggested_users")
  return data ?? []
}

const REQUEST_ERRORS: Record<string, string> = {
  JA_EXISTE: "Vocês já são amigos (ou o pedido já foi enviado).",
  AUTO_AMIZADE: "Esse é você! 😄",
  USUARIO_INEXISTENTE: "Usuário não encontrado.",
}

export async function sendFriendRequest(toUserId: string): Promise<{ result?: "pending" | "accepted"; error?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("send_friend_request", { p_to: toUserId })
  if (error) {
    const known = Object.keys(REQUEST_ERRORS).find((k) => error.message.includes(k))
    return { error: known ? REQUEST_ERRORS[known] : error.message }
  }
  return { result: data as "pending" | "accepted" }
}

export async function fetchMyFriends(): Promise<FriendEntry[]> {
  const supabase = createClient()
  const { data } = await supabase.rpc("my_friends")
  return data ?? []
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId)
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("friendships").delete().eq("id", friendshipId)
}

// ---- Agenda do amigo: só HORÁRIOS (nunca títulos) ----
export interface BusyRange {
  start: Date
  end: Date
}

interface ScheduleRow {
  start_time: string
  end_time: string
  is_recurring: boolean
  recurrence_rule: string | null
}

// Expande os blocos do amigo para as faixas ocupadas de HOJE (fuso local)
function expandBusyToday(rows: ScheduleRow[]): BusyRange[] {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)
  const now = new Date()
  const ranges: BusyRange[] = []

  for (const r of rows) {
    const s = new Date(r.start_time)
    const e = new Date(r.end_time)
    if (!r.is_recurring) {
      if (e > dayStart && s < dayEnd) {
        ranges.push({ start: s < dayStart ? dayStart : s, end: e > dayEnd ? dayEnd : e })
      }
      continue
    }
    // Recorrentes simples (sem cruzar meia-noite): ocorrência de hoje
    if (s > now) continue
    const dow = dayStart.getDay() // 0=dom
    const okToday =
      r.recurrence_rule === "daily" ||
      (r.recurrence_rule === "weekdays" && dow >= 1 && dow <= 5) ||
      (r.recurrence_rule === "weekly" && dow === s.getDay())
    if (!okToday) continue
    const occStart = new Date(dayStart)
    occStart.setHours(s.getHours(), s.getMinutes(), 0, 0)
    const durMs = e.getTime() - s.getTime()
    if (durMs <= 0 || durMs > 24 * 3_600_000) continue
    const occEnd = new Date(Math.min(occStart.getTime() + durMs, dayEnd.getTime()))
    ranges.push({ start: occStart, end: occEnd })
  }

  // Ordena e funde sobreposições
  ranges.sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: BusyRange[] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end) {
      if (r.end > last.end) last.end = r.end
    } else {
      merged.push({ ...r })
    }
  }
  return merged
}

const SCHEDULE_ERRORS: Record<string, string> = {
  NAO_SAO_AMIGOS: "Vocês ainda não são amigos.",
  AGENDA_PRIVADA: "Esse amigo não compartilha a agenda.",
}

export async function fetchFriendBusyToday(friendId: string): Promise<{ ranges?: BusyRange[]; error?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("friend_schedule", { p_friend: friendId })
  if (error) {
    const known = Object.keys(SCHEDULE_ERRORS).find((k) => error.message.includes(k))
    return { error: known ? SCHEDULE_ERRORS[known] : error.message }
  }
  return { ranges: expandBusyToday((data ?? []) as ScheduleRow[]) }
}

const OFFICE_ERRORS: Record<string, string> = {
  NAO_SAO_AMIGOS: "Vocês ainda não são amigos.",
  ESCRITORIO_PRIVADO: "Esse amigo mantém o escritório privado.",
}

export async function fetchFriendOffice(friendId: string): Promise<{ office?: FriendOffice; error?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("friend_office", { p_friend: friendId })
  if (error) {
    const known = Object.keys(OFFICE_ERRORS).find((k) => error.message.includes(k))
    return { error: known ? OFFICE_ERRORS[known] : error.message }
  }
  return { office: data as FriendOffice }
}
