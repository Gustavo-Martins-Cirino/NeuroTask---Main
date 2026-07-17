import { createClient as createServiceClient } from "@supabase/supabase-js"
import { randomBytes, createHash } from "crypto"

export const runtime = "nodejs"

// Troca um código de pareamento (gerado em Configurações, sessão do usuário)
// por um token de longa duração pra extensão. Chamado sem sessão Supabase —
// usa a service role, igual api/push/dispatch. O token só existe em texto
// puro nesta resposta; no banco fica só o hash.

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response("config incompleta (service key)", { status: 500 })
  }

  let code: string | undefined
  try {
    const body = await req.json()
    code = typeof body?.code === "string" ? body.code.trim() : undefined
  } catch {
    return new Response("body inválido", { status: 400 })
  }
  if (!code) return new Response("código ausente", { status: 400 })

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: pairing } = await db
    .from("extension_pairing_codes")
    .select("id, user_id, expires_at")
    .eq("code", code)
    .maybeSingle()

  if (!pairing || new Date(pairing.expires_at).getTime() < Date.now()) {
    return new Response("código inválido ou expirado", { status: 404 })
  }

  const token = randomBytes(32).toString("hex")
  const { error: insertError } = await db.from("extension_tokens").insert({
    user_id: pairing.user_id,
    token_hash: hashToken(token),
    label: "Chrome",
  })
  if (insertError) {
    return new Response("falha ao criar token", { status: 500 })
  }

  await db.from("extension_pairing_codes").delete().eq("id", pairing.id)

  return new Response(JSON.stringify({ token }), {
    headers: { "Content-Type": "application/json" },
  })
}
