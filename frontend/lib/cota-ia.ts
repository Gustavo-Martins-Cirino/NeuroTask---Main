import type { SupabaseClient } from "@supabase/supabase-js"

// Limite por pessoa na Neuro e na transcrição (supabase/limite_ia.sql).
//
// As duas gastam a cota do Groq, que é uma só para o app inteiro — no plano
// gratuito, umas 28 mensagens da Neuro por dia SOMANDO todo mundo. Um teto fixo
// de 30 por pessoa (o que havia) deixava uma conta sozinha gastar o dia de
// todos. Agora:
//
// - a Neuro tem uma cota que CRESCE COM O NÍVEL: 5 por dia no nível 1, +1 por
//   nível, até o teto. Todo mundo usa desde o primeiro dia (é o "uau" do app),
//   ninguém novo come mais que uma fatia pequena do dia, e o XP passa a valer
//   alguma coisa fora do Escritório;
// - e no máximo N mensagens por minuto, que protege o teto POR MINUTO do Groq —
//   também um só para todos.
//
// O teto da Neuro e o da transcrição vêm da env: trocar de plano no Groq muda um
// número na Vercel, sem deploy de banco.
//
// Falha ABERTA: sem o SQL, ou com o banco respondendo erro, o pedido passa e o
// log avisa. É limite de custo e de partilha, não trava de segurança.

export type TipoDeCota = "neuro" | "transcricao"

export const NEURO_NO_NIVEL_1 = 5
export const NEURO_POR_NIVEL = 1
export const NEURO_TETO_PADRAO = 20
export const NEURO_POR_MINUTO = 3
export const TRANSCRICAO_POR_DIA_PADRAO = 40

type Env = Record<string, string | undefined>

/** Inteiro de 1 a 10.000 vindo da env; fora disso, o padrão. */
function numeroDaEnv(env: Env, nome: string, padrao: number): number {
  const bruto = env[nome]?.trim()
  if (!bruto || !/^\d+$/.test(bruto)) return padrao
  const n = Number(bruto)
  return n >= 1 && n <= 10_000 ? n : padrao
}

/** O teto da Neuro (o máximo que o nível alto alcança): env `NEURO_LIMITE_DIARIO`. */
export function tetoDaNeuro(env: Env = process.env): number {
  return numeroDaEnv(env, "NEURO_LIMITE_DIARIO", NEURO_TETO_PADRAO)
}

/** Mensagens por dia com a Neuro no nível dado. Nível inválido conta como 1. */
export function limiteDaNeuro(nivel: number, env: Env = process.env): number {
  const n = Number.isFinite(nivel) && nivel >= 1 ? Math.floor(nivel) : 1
  return Math.min(tetoDaNeuro(env), NEURO_NO_NIVEL_1 + (n - 1) * NEURO_POR_NIVEL)
}

/** Transcrições por dia: fixo (o Whisper tem cota própria, bem mais folgada). */
export function limiteDaTranscricao(env: Env = process.env): number {
  return numeroDaEnv(env, "TRANSCRICAO_LIMITE_DIARIO", TRANSCRICAO_POR_DIA_PADRAO)
}

export type ResultadoDaCota =
  | { permitido: true; usos: number | null; aviso?: "sem-sql" | "erro" }
  | { permitido: false; usos: number; motivo: "dia" }
  | { permitido: false; usos: number; motivo: "minuto"; esperaSegundos: number }

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
  const r = data as { ok?: unknown; usos?: unknown; motivo?: unknown; espera?: unknown } | null
  if (!r || typeof r.ok !== "boolean") return { permitido: true, usos: null, aviso: "erro" }
  const usos = typeof r.usos === "number" ? r.usos : 0
  if (r.ok) return { permitido: true, usos }
  if (r.motivo === "minuto") {
    const espera = typeof r.espera === "number" && r.espera > 0 ? Math.min(60, Math.ceil(r.espera)) : 60
    return { permitido: false, usos, motivo: "minuto", esperaSegundos: espera }
  }
  return { permitido: false, usos, motivo: "dia" }
}

/** Soma um uso de quem está logado (o id sai da sessão, dentro da função). */
export async function consomeCotaDeIa(
  supabase: SupabaseClient,
  tipo: TipoDeCota,
  limite: number,
  porMinuto = 0
): Promise<ResultadoDaCota> {
  let { data, error } = await supabase.rpc("consumir_cota_ia", {
    p_tipo: tipo,
    p_limite: limite,
    p_por_minuto: porMinuto,
  })
  // Banco ainda com a versão antiga do SQL (dois parâmetros): o teto do dia vale
  // por ela, só sem o do minuto — em vez de passar sem limite nenhum até alguém
  // rodar o limite_ia.sql novo.
  if (error?.code === "PGRST202") {
    ;({ data, error } = await supabase.rpc("consumir_cota_ia", { p_tipo: tipo, p_limite: limite }))
  }
  const resultado = leResultadoDaCota(data, error)
  if ("aviso" in resultado && resultado.aviso) {
    console.warn(
      `[cota-ia] ${tipo}: ${resultado.aviso === "sem-sql" ? "supabase/limite_ia.sql não rodado (ou desatualizado)" : error?.message ?? "resposta inesperada"} — passando sem contar`
    )
  }
  return resultado
}
