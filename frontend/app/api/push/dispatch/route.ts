import { createClient as createServiceClient } from "@supabase/supabase-js"
import webpush from "web-push"
import { FUSO_PADRAO_MIN, agruparPorFuso, paredeEm } from "@/lib/push-fusos"

export const runtime = "nodejs"

// Dispatcher de push — chamado a cada minuto pelo pg_cron do Supabase.
// Envia: (1) lembretes com hora que acabaram de vencer; (2) check-in de
// blocos que acabaram de terminar. Usa a service role (bypassa RLS) para
// atender TODOS os usuários; protegido por CRON_SECRET.

// Fuso de quem ainda não contou o próprio (inscrição anterior ao push_tz.sql).
// Brasil = UTC-3 → 180. Ajustável por env.
const TZ_PADRAO = Number(process.env.DEFAULT_TZ_OFFSET_MIN ?? FUSO_PADRAO_MIN)

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

  // Quem tem push, e em que fuso. Antes daqui o dispatcher assumia que toda
  // parede era a do Brasil — quem estivesse fora recebia na hora errada.
  const { data: inscritos } = await db
    .from("push_subscriptions")
    .select("user_id, tz_offset_min")
  const porFuso = agruparPorFuso(inscritos ?? [], TZ_PADRAO)
  const agora = Date.now()

  // Fuso de cada usuário, para escrever horas nas mensagens. Quem tem aparelhos
  // em fusos diferentes fica com o primeiro; a hora escrita erra por pouco e só
  // para quem está viajando com dois aparelhos.
  const fusoDoUsuario = new Map<string, number>()
  for (const [fuso, usuarios] of porFuso) {
    for (const u of usuarios) if (!fusoDoUsuario.has(u)) fusoDoUsuario.set(u, fuso)
  }

  // 1) Lembretes de hoje com hora vencida nos últimos 10 min, ainda não enviados.
  //    Um grupo por fuso, em sequência: quem tem aparelho em dois lugares está
  //    nos dois grupos, e é a trava `pushed` — gravada antes do próximo grupo —
  //    que garante um push só.
  for (const [fuso, usuarios] of porFuso) {
    const parede = paredeEm(agora, fuso)
    const { data: dueReminders } = await db
      .from("reminders")
      .select("id, user_id, content, remind_time")
      .in("user_id", usuarios)
      .eq("remind_date", parede.dataChave)
      .eq("pushed", false)
      .not("remind_time", "is", null)
      .lte("remind_time", parede.hm)
      .gte("remind_time", parede.hmAtras(10))
    for (const r of dueReminders ?? []) {
      await sendToUser(r.user_id, { title: "🔔 Lembrete", body: r.content, url: "/app" })
      await db.from("reminders").update({ pushed: true }).eq("id", r.id)
    }
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

  // 3) Convites de compromisso recebidos nos últimos 10 minutos (Amigos v3)
  const { data: newInvites } = await db
    .from("meeting_invites")
    .select("id, from_user, to_user, title, starts_at")
    .eq("status", "pending")
    .eq("pushed", false)
    .gte("created_at", new Date(now.getTime() - 10 * 60_000).toISOString())
  if (newInvites && newInvites.length > 0) {
    const { data: senders } = await db
      .from("profiles")
      .select("user_id, username")
      .in("user_id", [...new Set(newInvites.map((i) => i.from_user))])
    const usernameOf = new Map((senders ?? []).map((s) => [s.user_id, s.username]))

    for (const inv of newInvites) {
      // A hora do convite é escrita na parede de QUEM RECEBE, não na do Brasil.
      const { hm: hhmm } = paredeEm(
        new Date(inv.starts_at).getTime(),
        fusoDoUsuario.get(inv.to_user) ?? TZ_PADRAO
      )
      const from = usernameOf.get(inv.from_user)
      await sendToUser(inv.to_user, {
        title: "📅 Novo convite",
        body: `${from ? `@${from}` : "Um amigo"} te chamou para "${inv.title}" às ${hhmm}.`,
        url: "/app/friends",
      })
      await db.from("meeting_invites").update({ pushed: true }).eq("id", inv.id)
    }
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
