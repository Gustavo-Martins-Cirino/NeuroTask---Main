import { createClient } from "@/lib/supabase/client"

// Pareamento da extensão de navegador: o app gera um código de 6 dígitos
// (sessão do usuário, RLS garante o user_id certo) e a extensão troca esse
// código por um token via /api/extension/exchange.

export interface PairedDevice {
  id: string
  label: string
  created_at: string
  last_seen_at: string | null
}

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function generatePairingCode(): Promise<{ code: string; expiresAt: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const code = randomCode()
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()

  const { error } = await supabase.from("extension_pairing_codes").insert({
    user_id: user.id,
    code,
    expires_at: expiresAt,
  })
  if (error) return null

  return { code, expiresAt }
}

export async function fetchPairedDevices(): Promise<PairedDevice[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("extension_tokens")
    .select("id, label, created_at, last_seen_at")
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function revokeDevice(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("extension_tokens").delete().eq("id", id)
}
