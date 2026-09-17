import { createClient } from "@/lib/supabase/client"
import { falhaPelaMensagem, type Falha as FalhaDe } from "@/lib/falha"
import { faixasDoDia, fundir, type BlocoBruto, type FaixaOcupada } from "@/lib/faixas-ocupadas"

// Apelidos históricos: friends-section e invite-dialog importam BusyRange daqui.
export type BusyRange = FaixaOcupada
type ScheduleRow = BlocoBruto

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
  city: string | null
  city_key: string | null
}

export interface UserSearchResult {
  user_id: string
  username: string
  display_name: string | null
}

// Sugestão de amizade — same_region é um booleano derivado da cidade;
// a cidade do outro usuário nunca chega ao cliente (friends_v3.sql).
export interface SuggestedUser extends UserSearchResult {
  same_region: boolean
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
  /** Aparência do bonequinho na lista. null enquanto a amizade não foi aceita
   *  (ou se o friends_v4.sql ainda não rodou) — cai na inicial do nome. */
  avatar: unknown | null
  /** Ids de chapéu/óculos equipados; mesmo portão do avatar. */
  accessories: string[] | null
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

/**
 * O que pode dar errado em Amigos e nos convites, como ID. Este módulo decide
 * QUAL motivo; o dicionário (`amigos.erros`) decide como ele se diz — a mesma
 * divisão de `lib/feedback.ts`.
 *
 * `desconhecido` é o que sobra: o Postgres respondeu algo que ninguém previu, e
 * aí vale mais mostrar a mensagem crua dele do que uma frase genérica que não
 * ajuda ninguém a entender o que houve.
 */
export type MotivoDeFalha =
  | "precisaLogin"
  | "usuarioCurto"
  | "usuarioEmUso"
  | "jaSaoAmigos"
  | "voceMesmo"
  | "usuarioInexistente"
  | "naoSaoAmigos"
  | "agendaPrivada"
  | "escritorioPrivado"
  | "conviteInvalido"
  | "conviteInexistente"

export type Falha = FalhaDe<MotivoDeFalha>

// Re-exportado para quem mostra o erro não precisar saber que a forma é geral:
// quem lida com Amigos importa tudo de Amigos.
export { explicaFalha } from "@/lib/falha"

export async function claimUsername(username: string, displayName: string | null): Promise<{ profile?: MyProfile; error?: Falha }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { motivo: "precisaLogin" } }
  const clean = normalizeUsername(username)
  if (clean.length < 3) return { error: { motivo: "usuarioCurto" } }
  const { data, error } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, username: clean, display_name: displayName?.trim() || null })
    .select()
    .single()
  if (error) {
    const emUso = error.message.includes("unique") || error.code === "23505"
    return { error: emUso ? { motivo: "usuarioEmUso" } : { motivo: "desconhecido", cru: error.message } }
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

// Perfis abertos (discoverable) fora das suas amizades — mesma região primeiro
export async function fetchSuggestedUsers(): Promise<SuggestedUser[]> {
  const supabase = createClient()
  const { data } = await supabase.rpc("suggested_users")
  return data ?? []
}

// Cidade digitada pelo usuário (Amigos v3). Guardamos o texto original só
// para ele ver, e a chave normalizada é o que casa duas pessoas na mesma região.
export function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export async function updateCity(city: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const clean = city.trim()
  await supabase
    .from("profiles")
    .update({ city: clean || null, city_key: clean ? normalizeCity(clean) : null })
    .eq("user_id", user.id)
}

const REQUEST_ERRORS: Record<string, MotivoDeFalha> = {
  JA_EXISTE: "jaSaoAmigos",
  AUTO_AMIZADE: "voceMesmo",
  USUARIO_INEXISTENTE: "usuarioInexistente",
}

export async function sendFriendRequest(toUserId: string): Promise<{ result?: "pending" | "accepted"; error?: Falha }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("send_friend_request", { p_to: toUserId })
  if (error) return { error: falhaPelaMensagem(error.message, REQUEST_ERRORS) }
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
// A expansão dos blocos em faixas ocupadas mora em lib/faixas-ocupadas.ts:
// a agenda pública usa a MESMA conta, e ela não pode importar este arquivo
// (aqui dentro vive o cliente do navegador).

const SCHEDULE_ERRORS: Record<string, MotivoDeFalha> = {
  NAO_SAO_AMIGOS: "naoSaoAmigos",
  AGENDA_PRIVADA: "agendaPrivada",
}

function startOfDay(day?: string): Date {
  const d = day ? new Date(`${day}T00:00:00`) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function fetchFriendBusyToday(friendId: string): Promise<{ ranges?: BusyRange[]; error?: Falha }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("friend_schedule", { p_friend: friendId })
  if (error) return { error: falhaPelaMensagem(error.message, SCHEDULE_ERRORS) }
  return { ranges: faixasDoDia((data ?? []) as ScheduleRow[], startOfDay()) }
}

// ---- Horários livres dos DOIS (Amigos v3, 100% determinístico) ----
// Cruza a agenda do amigo (RPC friend_schedule — só horários) com os meus
// blocos e devolve as primeiras janelas em que ninguém está ocupado.
export interface FreeSlot {
  start: Date
  end: Date
}

const WINDOW_START_HOUR = 7
const WINDOW_END_HOUR = 23

// Arredonda para a próxima marca de 30 min — proposta de horário "redondo"
function ceilToHalfHour(d: Date): Date {
  const out = new Date(d)
  out.setSeconds(0, 0)
  const m = out.getMinutes()
  if (m !== 0 && m !== 30) out.setMinutes(m < 30 ? 30 : 60)
  return out
}

function freeSlotsForDay(busy: BusyRange[], dayStart: Date, durationMinutes: number, max: number): FreeSlot[] {
  const windowStart = new Date(dayStart)
  windowStart.setHours(WINDOW_START_HOUR, 0, 0, 0)
  const windowEnd = new Date(dayStart)
  windowEnd.setHours(WINDOW_END_HOUR, 0, 0, 0)

  const now = new Date()
  let cursor = now > windowStart ? ceilToHalfHour(now) : new Date(windowStart)
  if (cursor < windowStart) cursor = new Date(windowStart)

  const gaps: FreeSlot[] = []
  for (const b of fundir(busy)) {
    if (b.end <= cursor) continue
    if (b.start > cursor) {
      const end = b.start < windowEnd ? new Date(b.start) : new Date(windowEnd)
      gaps.push({ start: new Date(cursor), end })
    }
    const next = ceilToHalfHour(b.end)
    if (next > cursor) cursor = next
    if (cursor >= windowEnd) break
  }
  if (cursor < windowEnd) gaps.push({ start: new Date(cursor), end: new Date(windowEnd) })

  const durMs = Math.max(15, durationMinutes) * 60_000
  const slots: FreeSlot[] = []
  for (const g of gaps) {
    if (g.end.getTime() - g.start.getTime() < durMs) continue
    slots.push({ start: g.start, end: new Date(g.start.getTime() + durMs) })
    if (slots.length >= max) break
  }
  return slots
}

async function fetchMyBusyForDay(dayStart: Date): Promise<BusyRange[]> {
  const supabase = createClient()
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)
  const { data } = await supabase
    .from("time_blocks")
    .select("start_time, end_time, is_recurring, recurrence_rule")
    .or(`is_recurring.eq.true,end_time.gte.${dayStart.toISOString()}`)
    .lte("start_time", dayEnd.toISOString())
  return faixasDoDia((data ?? []) as ScheduleRow[], dayStart)
}

export async function suggestCommonFreeSlots(
  friendId: string,
  day: string, // YYYY-MM-DD
  durationMinutes: number,
  max = 4
): Promise<{ slots?: FreeSlot[]; error?: Falha }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("friend_schedule", { p_friend: friendId })
  if (error) return { error: falhaPelaMensagem(error.message, SCHEDULE_ERRORS) }
  const dayStart = startOfDay(day)
  const friendBusy = faixasDoDia((data ?? []) as ScheduleRow[], dayStart)
  const myBusy = await fetchMyBusyForDay(dayStart)
  return { slots: freeSlotsForDay([...friendBusy, ...myBusy], dayStart, durationMinutes, max) }
}

const OFFICE_ERRORS: Record<string, MotivoDeFalha> = {
  NAO_SAO_AMIGOS: "naoSaoAmigos",
  ESCRITORIO_PRIVADO: "escritorioPrivado",
}

export async function fetchFriendOffice(friendId: string): Promise<{ office?: FriendOffice; error?: Falha }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("friend_office", { p_friend: friendId })
  if (error) return { error: falhaPelaMensagem(error.message, OFFICE_ERRORS) }
  return { office: data as FriendOffice }
}
