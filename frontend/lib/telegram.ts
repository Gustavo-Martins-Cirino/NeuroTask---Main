import { createClient } from "@/lib/supabase/client"

// Pareamento do bot do Telegram: o app gera um código de 6 dígitos (sessão do
// usuário, RLS garante o user_id certo) e o bot troca esse código pelo vínculo
// no webhook. Mesmo desenho da extensão de navegador.

export interface TelegramLink {
  id: string
  username: string | null
  created_at: string
  last_seen_at: string | null
}

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function generateTelegramCode(): Promise<{ code: string; expiresAt: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const code = randomCode()
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()

  const { error } = await supabase.from("telegram_pairing_codes").insert({
    user_id: user.id,
    code,
    expires_at: expiresAt,
  })
  if (error) return null

  return { code, expiresAt }
}

export async function fetchTelegramLinks(): Promise<TelegramLink[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("telegram_links")
    .select("id, username, created_at, last_seen_at")
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function unlinkTelegram(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("telegram_links").delete().eq("id", id)
}
