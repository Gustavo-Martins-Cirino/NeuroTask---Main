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

  // O fuso pega carona no código: é o ÚNICO momento em que o app fala com o
  // Telegram, e o Telegram não conta de onde a mensagem vem (ver lib/telegram-fuso).
  const base = { user_id: user.id, code, expires_at: expiresAt }
  let { error } = await supabase
    .from("telegram_pairing_codes")
    .insert({ ...base, tz_offset_min: new Date().getTimezoneOffset() })
  // Banco sem o telegram_tz.sql rodado: parear é mais importante que o fuso, e
  // sem a segunda tentativa a tela de Configurações simplesmente pararia de
  // gerar código — um jeito caro de anunciar que falta um ALTER TABLE.
  if (error && error.message.includes("tz_offset_min")) {
    ({ error } = await supabase.from("telegram_pairing_codes").insert(base))
  }
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
