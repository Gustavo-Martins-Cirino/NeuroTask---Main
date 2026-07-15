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

export async function updatePrivacy(field: "share_status" | "share_office" | "share_level" | "discoverable", value: boolean): Promise<void> {
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
