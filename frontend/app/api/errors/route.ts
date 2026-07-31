import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// Recebe as falhas que os boundaries e os listeners globais capturam no
// navegador. Sem isso, o app se recupera bonito de um erro e NINGUÉM fica
// sabendo que ele aconteceu — que é o pior resultado quando o app está na mão
// de outra pessoa: ela some e você não descobre o motivo.
//
// A rota é pública de propósito (erro na tela de login não tem sessão), então
// ela é escrita defensivamente: campos truncados, corpo limitado e teto por
// minuto. Insere pela service role — o cliente não escreve na tabela.

const LIMITE_CORPO = 16_000 // bytes
const MAX_MENSAGEM = 500
const MAX_STACK = 4_000
const MAX_CURTO = 200

// Um erro em loop de render dispara sem parar. O cliente já faz dedupe, mas o
// servidor não confia nele. Em memória mesmo: reinicia junto com a lambda e
// serve só pra cortar rajada.
const JANELA_MS = 60_000
const MAX_POR_JANELA = 20
const vistos = new Map<string, { contagem: number; desde: number }>()

function estourouOTeto(chave: string): boolean {
  const agora = Date.now()
  const atual = vistos.get(chave)
  if (!atual || agora - atual.desde > JANELA_MS) {
    vistos.set(chave, { contagem: 1, desde: agora })
    return false
  }
  atual.contagem += 1
  return atual.contagem > MAX_POR_JANELA
}

function corta(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null
  const limpo = valor.trim()
  return limpo ? limpo.slice(0, max) : null
}

const ORIGENS = new Set([
  "boundary-app",
  "boundary-publico",
  "boundary-global",
  "window",
  "promise",
])

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Sem service role não dá pra gravar. Responde 204 assim mesmo: o relatório
  // de erro nunca pode virar um segundo erro na tela de quem já quebrou.
  if (!supabaseUrl || !serviceKey) return new Response(null, { status: 204 })

  const bruto = await req.text()
  if (bruto.length > LIMITE_CORPO) return new Response(null, { status: 204 })

  let corpo: Record<string, unknown>
  try {
    corpo = JSON.parse(bruto)
  } catch {
    return new Response(null, { status: 204 })
  }

  const mensagem = corta(corpo.mensagem, MAX_MENSAGEM)
  if (!mensagem) return new Response(null, { status: 204 })

  const origem = corta(corpo.origem, MAX_CURTO)
  if (!origem || !ORIGENS.has(origem)) return new Response(null, { status: 204 })

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido"
  if (estourouOTeto(ip)) return new Response(null, { status: 204 })

  // Quem está logado a gente identifica; quem não está entra como null (erro
  // na tela de login importa tanto quanto os outros).
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id ?? null
  } catch {}

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  await db.from("error_log").insert({
    user_id: userId,
    mensagem,
    stack: corta(corpo.stack, MAX_STACK),
    digest: corta(corpo.digest, MAX_CURTO),
    rota: corta(corpo.rota, MAX_CURTO),
    origem,
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    user_agent: corta(req.headers.get("user-agent"), MAX_CURTO),
  })

  return new Response(null, { status: 204 })
}
