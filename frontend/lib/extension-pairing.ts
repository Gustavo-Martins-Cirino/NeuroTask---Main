import { createClient } from "@/lib/supabase/client"

// Pareamento da extensão de navegador: a própria extensão inicia o vínculo
// (Passo 2 do popup) e o usuário autoriza numa aba autenticada
// (app/extension/connect) — ver extension_pairing_codes no SQL. Aqui só fica
// a leitura/gestão dos dispositivos já pareados.

export interface PairedDevice {
  id: string
  label: string
  created_at: string
  last_seen_at: string | null
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
