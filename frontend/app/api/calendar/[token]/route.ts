import { createClient as createServiceClient } from "@supabase/supabase-js"
import { toIcs, blocksToIcsEvents, type TimeBlockRow } from "@/lib/ics"

export const runtime = "nodejs"
// O feed é dinâmico por natureza (agenda muda); nada de cache estático no build.
export const dynamic = "force-dynamic"

// Feed de calendário assinável (.ics). O token na URL é o SEGREDO — como o
// "endereço secreto em formato iCal" do próprio Google Calendar. Lê os
// time_blocks do dono do token com a service role (bypassa RLS) e devolve um
// .ics só-leitura. Sem sessão: o Google/Outlook buscam essa URL periodicamente
// sem cookies. Ver supabase/calendar_feed.sql.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params
  const token = raw.replace(/\.ics$/i, "").trim()
  if (!token) return new Response("not found", { status: 404 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return new Response("config incompleta (service key)", { status: 500 })

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: feed } = await db
    .from("calendar_feeds")
    .select("user_id")
    .eq("token", token)
    .maybeSingle()
  if (!feed) return new Response("not found", { status: 404 })

  const { data: rows } = await db
    .from("time_blocks")
    .select("id, title, description, start_time, end_time, recurrence_rule")
    .eq("user_id", feed.user_id)

  const ics = toIcs(blocksToIcsEvents((rows ?? []) as TimeBlockRow[]))
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="neurotask.ics"',
      // Google/Outlook reamostram de tempos em tempos; um cache curto alivia o
      // servidor sem atrasar muito a atualização da agenda do lado deles.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  })
}
