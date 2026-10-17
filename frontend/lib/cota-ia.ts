import type { SupabaseClient } from "@supabase/supabase-js"

// Limite diário por pessoa na Neuro e na transcrição (supabase/limite_ia.sql).
//
// As duas gastam a cota do Groq, que é uma só para o app inteiro. O teto mora
// na env, não no SQL nem aqui: trocar de plano no Groq muda um número na Vercel,
// sem deploy de banco.
//
// Falha ABERTA: sem o SQL rodado, ou com o banco respondendo erro, o pedido
// passa e o log avisa. É um limite de custo e de partilha, não uma trava de
// segurança — e a Neuro parada por um contador quebrado seria pior que um dia
// sem contador.

export type TipoDeCota = "neuro" | "transcricao"

export const LIMITE_PADRAO: Record<TipoDeCota, number> = { neuro: 30, transcricao: 40 }

const ENV: Record<TipoDeCota, string> = {
  neuro: "NEURO_LIMITE_DIARIO",
  transcricao: "TRANSCRICAO_LIMITE_DIARIO",
}

/** Teto do dia: da env quando ela é um inteiro de 1 a 10.000; senão, o padrão. */
export function limiteDoDia(tipo: TipoDeCota, env: Record<string, string | undefined> = process.env): number {
  const bruto = env[ENV[tipo]]?.trim()
  if (!bruto || !/^\d+$/.test(bruto)) return LIMITE_PADRAO[tipo]
  const n = Number(bruto)
  return n >= 1 && n <= 10_000 ? n : LIMITE_PADRAO[tipo]
}

export type ResultadoDaCota =
  | { permitido: true; usos: number | null; aviso?: "sem-sql" | "erro" }
  | { permitido: false; usos: number }

/** Lê a resposta do RPC. Função ausente e erro do banco deixam passar, com aviso. */
export function leResultadoDaCota(
  data: unknown,
  error: { code?: string; message?: string } | null
): ResultadoDaCota {
  if (error) {
    // PGRST202: o PostgREST não acha a função (SQL não rodado ou cache de schema
    // velho). 42883: o Postgres não acha. Os dois querem dizer "ainda não existe".
    const semSql = error.code === "PGRST202" || error.code === "42883"
    return { permitido: true, usos: null, aviso: semSql ? "sem-sql" : "erro" }
  }
  const r = data as { ok?: unknown; usos?: unknown } | null
  if (!r || typeof r.ok !== "boolean") return { permitido: true, usos: null, aviso: "erro" }
  const usos = typeof r.usos === "number" ? r.usos : 0
  return r.ok ? { permitido: true, usos } : { permitido: false, usos }
}

/** Soma um uso de quem está logado (o id sai da sessão, dentro da função). */
export async function consomeCotaDeIa(supabase: SupabaseClient, tipo: TipoDeCota): Promise<ResultadoDaCota> {
  const { data, error } = await supabase.rpc("consumir_cota_ia", { p_tipo: tipo, p_limite: limiteDoDia(tipo) })
  const resultado = leResultadoDaCota(data, error)
  if ("aviso" in resultado && resultado.aviso) {
    console.warn(
      `[cota-ia] ${tipo}: ${resultado.aviso === "sem-sql" ? "supabase/limite_ia.sql não rodado" : error?.message ?? "resposta inesperada"} — passando sem contar`
    )
  }
  return resultado
}
