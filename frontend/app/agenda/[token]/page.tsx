import { createClient as createServiceClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { AgendaPublicaView } from "@/components/agenda-publica-view"
import type { BlocoBruto } from "@/lib/faixas-ocupadas"

// Agenda compartilhada com quem NÃO usa o NeuroTask (/agenda/<token>).
//
// Pública de propósito — o proxy libera este caminho (lib/supabase/middleware),
// senão o link cairia na tela de login e o compartilhamento viraria cadastro.
// A credencial é o token secreto da URL, como o feed .ics do Google.
//
// O que sai daqui é SÓ HORÁRIO. A consulta nem pede título, descrição, local ou
// link: o que não é lido não vaza por engano, nem se alguém mexer no componente
// de exibição depois. Ver supabase/agenda_publica.sql.

export const dynamic = "force-dynamic"

const DIA_MS = 86_400_000

export default async function AgendaPublicaPage(ctx: { params: Promise<{ token: string }> }) {
  const { token: bruto } = await ctx.params
  const token = (bruto ?? "").trim()
  if (!token) notFound()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) notFound()

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: share } = await db
    .from("agenda_shares")
    .select("user_id, dias")
    .eq("token", token)
    .maybeSingle()
  // Link revogado (linha apagada) e link que nunca existiu dão a MESMA resposta:
  // um 404 que não conta se o token já foi válido.
  if (!share) notFound()

  const dias = Math.max(1, Math.min(60, share.dias ?? 14))

  // Janela generosa nas pontas: um bloco que começou ontem à noite pode ocupar
  // a madrugada de hoje, e os recorrentes precisam do mestre antigo para serem
  // expandidos. O corte fino por dia é feito em lib/faixas-ocupadas.
  const agora = Date.now()
  const { data: blocos } = await db
    .from("time_blocks")
    .select("start_time, end_time, is_recurring, recurrence_rule")
    .eq("user_id", share.user_id)
    .lte("start_time", new Date(agora + (dias + 1) * DIA_MS).toISOString())
    .or(`is_recurring.eq.true,end_time.gte.${new Date(agora - DIA_MS).toISOString()}`)

  const { data: perfil } = await db
    .from("profiles")
    .select("display_name, username")
    .eq("user_id", share.user_id)
    .maybeSingle()

  const nome = perfil?.display_name?.trim() || (perfil?.username ? `@${perfil.username}` : null)

  return (
    <AgendaPublicaView
      nome={nome}
      dias={dias}
      blocos={(blocos ?? []) as BlocoBruto[]}
    />
  )
}
