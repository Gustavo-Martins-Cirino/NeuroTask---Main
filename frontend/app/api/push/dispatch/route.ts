import { createClient as createServiceClient } from "@supabase/supabase-js"
import webpush from "web-push"

export const runtime = "nodejs"

// Dispatcher de push — chamado a cada minuto pelo pg_cron do Supabase.
// Envia: (1) lembretes com hora que acabaram de vencer; (2) check-in de
// blocos que acabaram de terminar. Usa a service role (bypassa RLS) para
// atender TODOS os usuários; protegido por CRON_SECRET.

// Fuso padrão dos usuários (lembretes guardam data/hora local sem fuso).
// Brasil = UTC-3 → 180. Ajustável por env.
const TZ_MIN = Number(process.env.DEFAULT_TZ_OFFSET_MIN ?? 180)

function localNowParts() {
  const loc = new Date(Date.now() - TZ_MIN * 60_000)
  const dateKey = `${loc.getUTCFullYear()}-${String(loc.getUTCMonth() + 1).padStart(2, "0")}-${String(loc.getUTCDate()).padStart(2, "0")}`
  const hm = `${String(loc.getUTCHours()).padStart(2, "0")}:${String(loc.getUTCMinutes()).padStart(2, "0")}`
  const hmAgo = (min: number) => {
    const d = new Date(loc.getTime() - min * 60_000)
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
  }
  return { dateKey, hm, hmAgo }
}

async function handle(req: Request) {
  const url = new URL(req.url)
  const secret = req.headers.get("x-cron-secret") ?? url.searchParams.get("secret")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("forbidden", { status: 403 })
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPriv = process.env.VAPID_PRIVATE_KEY
  if (!supabaseUrl || !serviceKey || !vapidPub || !vapidPriv) {
    return new Response("config incompleta (service key / vapid)", { status: 500 })
  }

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  webpush.setVapidDetails("mailto:cirinogustavom@gmail.com", vapidPub, vapidPriv)

  const sent: string[] = []

  const sendToUser = async (userId: string, payload: { title: string; body: string; url?: string }) => {
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId)
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
        sent.push(payload.title)
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id) // inscrição morta
        }
      }
    }
  }

  const { dateKey, hm, hmAgo } = localNowParts()

  // 1) Lembretes de hoje com hora vencida nos últimos 10 min, ainda não enviados
  const { data: dueReminders } = await db
    .from("reminders")
    .select("id, user_id, content, remind_time")
    .eq("remind_date", dateKey)
    .eq("pushed", false)
    .not("remind_time", "is", null)
    .lte("remind_time", hm)
    .gte("remind_time", hmAgo(10))
  for (const r of dueReminders ?? []) {
    await sendToUser(r.user_id, { title: "🔔 Lembrete", body: r.content, url: "/app" })
    await db.from("reminders").update({ pushed: true }).eq("id", r.id)
  }

  // 2) Check-in: blocos que terminaram nos últimos 5 minutos
  const now = new Date()
  const fiveAgo = new Date(now.getTime() - 5 * 60_000)
  const { data: endedBlocks } = await db
    .from("time_blocks")
    .select("id, user_id, title, end_time")
    .eq("checkin_pushed", false)
    .lte("end_time", now.toISOString())
    .gte("end_time", fiveAgo.toISOString())
  for (const b of endedBlocks ?? []) {
    await sendToUser(b.user_id, {
      title: `⏱️ "${b.title}" terminou`,
      body: "Conseguiu fazer? Toque para responder.",
      url: "/app",
    })
    await db.from("time_blocks").update({ checkin_pushed: true }).eq("id", b.id)
  }

  return new Response(JSON.stringify({ ok: true, sent: sent.length }), {
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(req: Request) {
  return handle(req)
}
export async function GET(req: Request) {
  return handle(req)
}
