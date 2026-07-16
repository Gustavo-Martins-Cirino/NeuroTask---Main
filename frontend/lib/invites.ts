import { createClient } from "@/lib/supabase/client"

// Convites de compromisso entre amigos (Amigos v2 — friends_agenda.sql).
// Aceitar cria o bloco no calendário DOS DOIS (RPC no servidor).

export interface MeetingInvite {
  id: string
  direction: "sent" | "received"
  other_username: string
  other_display_name: string | null
  title: string
  starts_at: string
  ends_at: string
  meeting_url: string | null
  location: string | null
  status: "pending" | "accepted" | "declined"
}

const INVITE_ERRORS: Record<string, string> = {
  NAO_SAO_AMIGOS: "Vocês ainda não são amigos.",
  CONVITE_INVALIDO: "Preencha o título e um horário válido.",
  CONVITE_INEXISTENTE: "Convite não encontrado (já respondido?).",
}

function translate(msg: string): string {
  const known = Object.keys(INVITE_ERRORS).find((k) => msg.includes(k))
  return known ? INVITE_ERRORS[known] : msg
}

export async function sendMeetingInvite(input: {
  toUserId: string
  title: string
  startsAt: Date
  endsAt: Date
  meetingUrl?: string
  location?: string
}): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.rpc("send_meeting_invite", {
    p_to: input.toUserId,
    p_title: input.title,
    p_starts: input.startsAt.toISOString(),
    p_ends: input.endsAt.toISOString(),
    p_url: input.meetingUrl ?? null,
    p_location: input.location ?? null,
  })
  return error ? { error: translate(error.message) } : {}
}

export async function fetchMyInvites(): Promise<MeetingInvite[]> {
  const supabase = createClient()
  const { data } = await supabase.rpc("my_invites")
  return data ?? []
}

export async function respondMeetingInvite(
  inviteId: string,
  accept: boolean
): Promise<{ status?: "accepted" | "declined"; error?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("respond_meeting_invite", {
    p_invite: inviteId,
    p_accept: accept,
  })
  if (error) return { error: translate(error.message) }
  return { status: data as "accepted" | "declined" }
}

export async function cancelMeetingInvite(inviteId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("meeting_invites").delete().eq("id", inviteId)
}
