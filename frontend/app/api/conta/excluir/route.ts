import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { confirmaExclusao, mesmaOrigem } from "@/lib/excluir-conta"
import { BUCKET_FOTOS, caminhoDaFoto } from "@/lib/foto-perfil"

export const runtime = "nodejs"

// Exclui a conta de QUEM ESTÁ LOGADO — e só dela: o id sai da sessão verificada
// no servidor, nunca do corpo do pedido.
//
// O banco apaga o resto sozinho: toda tabela com dado de usuário referencia
// auth.users com `on delete cascade` (feedback e error_log ficam anônimos), e
// `lib/excluir-conta.test.ts` quebra se uma tabela nova esquecer disso. A foto
// mora no Storage, fora do alcance do banco, e sai antes.
//
// A resposta de erro é um MOTIVO, não uma mensagem: quem mostra escolhe a frase
// no dicionário, e o detalhe do Supabase fica no log.
export async function POST(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!mesmaOrigem(req.headers.get("origin"), host)) {
    return Response.json({ motivo: "origem" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ motivo: "sessao" }, { status: 401 })

  const corpo = (await req.json().catch(() => ({}))) as { confirmacao?: unknown }
  if (typeof corpo.confirmacao !== "string" || !confirmaExclusao(corpo.confirmacao)) {
    return Response.json({ motivo: "confirmacao" }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chaveDeServico) {
    console.error("[conta/excluir] SUPABASE_SERVICE_ROLE_KEY ausente")
    return Response.json({ motivo: "servidor" }, { status: 503 })
  }
  const admin = createServiceClient(url, chaveDeServico, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const foto = await admin.storage.from(BUCKET_FOTOS).remove([caminhoDaFoto(user.id)])
  if (foto.error) console.warn("[conta/excluir] foto:", foto.error.message)

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error("[conta/excluir]", user.id, error.message)
    return Response.json({ motivo: "servidor" }, { status: 500 })
  }

  // A conta já não existe; isto só apaga o cookie da sessão desta resposta.
  await supabase.auth.signOut({ scope: "local" })
  console.info("[conta/excluir] conta excluída", user.id)
  return Response.json({ ok: true })
}
