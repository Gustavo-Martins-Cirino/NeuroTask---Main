import { createClient as createServiceClient } from "@supabase/supabase-js"
import { leRelatorioCsp } from "@/lib/csp"

export const runtime = "nodejs"

// Recebe o que a CSP só-relatório TERIA bloqueado (lib/csp.ts) e guarda no
// error_log com origem "csp" — o mesmo lugar que o /admin já mostra, apagado em
// 30 dias. É o que diz se a política completa pode virar trava sem quebrar nada.
//
// Pública como a /api/errors (o navegador manda sem sessão), e escrita do mesmo
// jeito defensivo: corpo limitado, teto por IP e a mesma violação guardada uma
// vez só por instância — uma página com 40 imagens bloqueadas mandaria 40.

const LIMITE_CORPO = 32_000
const JANELA_MS = 60_000
const MAX_POR_JANELA = 30
const porIp = new Map<string, { contagem: number; desde: number }>()
const jaGuardadas = new Set<string>()

function estourouOTeto(ip: string): boolean {
  const agora = Date.now()
  const atual = porIp.get(ip)
  if (!atual || agora - atual.desde > JANELA_MS) {
    porIp.set(ip, { contagem: 1, desde: agora })
    return false
  }
  atual.contagem += 1
  return atual.contagem > MAX_POR_JANELA
}

export async function POST(req: Request) {
  const nada = new Response(null, { status: 204 })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return nada

  const bruto = await req.text()
  if (!bruto || bruto.length > LIMITE_CORPO) return nada
  let corpo: unknown
  try {
    corpo = JSON.parse(bruto)
  } catch {
    return nada
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido"
  if (estourouOTeto(ip)) return nada

  const novas = leRelatorioCsp(corpo).filter((v) => {
    const chave = `${v.diretiva}|${v.bloqueado}|${v.pagina}`
    if (jaGuardadas.has(chave)) return false
    if (jaGuardadas.size > 500) jaGuardadas.clear()
    jaGuardadas.add(chave)
    return true
  })
  if (novas.length === 0) return nada

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  await db.from("error_log").insert(
    novas.map((v) => ({
      user_id: null,
      mensagem: `CSP ${v.diretiva} bloquearia ${v.bloqueado}`,
      rota: v.pagina,
      origem: "csp",
      commit_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    }))
  )
  return nada
}
