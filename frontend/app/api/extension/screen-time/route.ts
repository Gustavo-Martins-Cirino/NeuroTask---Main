import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

export const runtime = "nodejs"

// Ingestão de tempo de tela mandada pela extensão (sem sessão Supabase —
// autentica pelo token de dispositivo). Service role pra escrever
// screen_time_log, que não tem policy de insert pro cliente.

const MAX_SECONDS_PER_ENTRY = 120

interface Entry {
  domain: string
  seconds: number
  date: string // YYYY-MM-DD, calculado no cliente (fuso local do usuário)
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response("config incompleta (service key)", { status: 500 })
  }

  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!token) return new Response("token ausente", { status: 401 })

  let entries: Entry[] = []
  try {
    const body = await req.json()
    entries = Array.isArray(body?.entries) ? body.entries : []
  } catch {
    return new Response("body inválido", { status: 400 })
  }
  if (entries.length === 0) return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } })

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: deviceToken } = await db
    .from("extension_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle()
  if (!deviceToken) return new Response("token inválido", { status: 401 })

  for (const entry of entries) {
    const domain = typeof entry.domain === "string" ? entry.domain.trim().toLowerCase() : ""
    const date = typeof entry.date === "string" ? entry.date : ""
    const seconds = Math.max(0, Math.min(MAX_SECONDS_PER_ENTRY, Math.round(entry.seconds || 0)))
    if (!domain || !date || seconds === 0) continue

    const { data: existing } = await db
      .from("screen_time_log")
      .select("id, seconds")
      .eq("user_id", deviceToken.user_id)
      .eq("domain", domain)
      .eq("log_date", date)
      .maybeSingle()

    if (existing) {
      await db
        .from("screen_time_log")
        .update({ seconds: existing.seconds + seconds, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    } else {
      await db.from("screen_time_log").insert({
        user_id: deviceToken.user_id,
        domain,
        log_date: date,
        seconds,
      })
    }
  }

  await db.from("extension_tokens").update({ last_seen_at: new Date().toISOString() }).eq("id", deviceToken.id)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  })
}
