import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  NEURO_NO_NIVEL_1,
  NEURO_TETO_PADRAO,
  TRANSCRICAO_POR_DIA_PADRAO,
  consomeCotaDeIa,
  leResultadoDaCota,
  limiteDaNeuro,
  limiteDaTranscricao,
  tetoDaNeuro,
} from "./cota-ia"

describe("limiteDaNeuro: a cota cresce com o nível", () => {
  it("nível 1 começa pequeno, e cada nível libera mais uma", () => {
    expect(limiteDaNeuro(1, {})).toBe(NEURO_NO_NIVEL_1)
    expect(limiteDaNeuro(2, {})).toBe(NEURO_NO_NIVEL_1 + 1)
    expect(limiteDaNeuro(6, {})).toBe(NEURO_NO_NIVEL_1 + 5)
  })

  it("para no teto, por mais alto que seja o nível", () => {
    expect(limiteDaNeuro(23, {})).toBe(NEURO_TETO_PADRAO)
    expect(limiteDaNeuro(500, {})).toBe(NEURO_TETO_PADRAO)
  })

  it("o teto vem da env (trocar de plano no Groq não pede código)", () => {
    expect(tetoDaNeuro({ NEURO_LIMITE_DIARIO: "60" })).toBe(60)
    expect(limiteDaNeuro(500, { NEURO_LIMITE_DIARIO: "60" })).toBe(60)
    // Teto abaixo da base: o nível 1 recebe o teto, não mais que ele.
    expect(limiteDaNeuro(1, { NEURO_LIMITE_DIARIO: "3" })).toBe(3)
  })

  it("nível estranho conta como 1, e env estranha cai no padrão", () => {
    for (const ruim of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) expect(limiteDaNeuro(ruim, {})).toBe(NEURO_NO_NIVEL_1)
    for (const env of ["0", "-5", "abc", "1e9", "99999", "2.5", ""]) {
      expect(tetoDaNeuro({ NEURO_LIMITE_DIARIO: env }), env).toBe(NEURO_TETO_PADRAO)
    }
  })

  it("a transcrição tem teto fixo, da sua própria env", () => {
    expect(limiteDaTranscricao({})).toBe(TRANSCRICAO_POR_DIA_PADRAO)
    expect(limiteDaTranscricao({ TRANSCRICAO_LIMITE_DIARIO: " 15 " })).toBe(15)
  })
})

describe("leResultadoDaCota", () => {
  it("dentro do limite passa; o dia batido barra", () => {
    expect(leResultadoDaCota({ ok: true, usos: 3 }, null)).toEqual({ permitido: true, usos: 3 })
    expect(leResultadoDaCota({ ok: false, usos: 5, motivo: "dia" }, null)).toEqual({ permitido: false, usos: 5, motivo: "dia" })
    // Resposta da versão antiga do SQL (sem motivo): é o dia.
    expect(leResultadoDaCota({ ok: false, usos: 30 }, null)).toEqual({ permitido: false, usos: 30, motivo: "dia" })
  })

  it("o minuto batido diz quanto esperar, nunca mais que um minuto", () => {
    expect(leResultadoDaCota({ ok: false, usos: 4, motivo: "minuto", espera: 37.2 }, null)).toEqual({
      permitido: false,
      usos: 4,
      motivo: "minuto",
      esperaSegundos: 38,
    })
    expect(leResultadoDaCota({ ok: false, usos: 4, motivo: "minuto", espera: 999 }, null)).toMatchObject({ esperaSegundos: 60 })
    expect(leResultadoDaCota({ ok: false, usos: 4, motivo: "minuto" }, null)).toMatchObject({ esperaSegundos: 60 })
  })

  it("sem o SQL rodado (ou com o SQL antigo), passa avisando", () => {
    expect(leResultadoDaCota(null, { code: "PGRST202", message: "not found" })).toEqual({
      permitido: true,
      usos: null,
      aviso: "sem-sql",
    })
    expect(leResultadoDaCota(null, { code: "42883" })).toMatchObject({ permitido: true, aviso: "sem-sql" })
  })

  it("erro do banco ou resposta torta também passa — é limite de custo, não trava", () => {
    expect(leResultadoDaCota(null, { code: "57014", message: "timeout" })).toMatchObject({ permitido: true, aviso: "erro" })
    expect(leResultadoDaCota("lixo", null)).toMatchObject({ permitido: true, aviso: "erro" })
    expect(leResultadoDaCota(null, null)).toMatchObject({ permitido: true, aviso: "erro" })
  })
})

// O SQL e o TS precisam concordar nos nomes: um erro de digitação aqui não
// quebraria nada — a cota falharia aberta, calada, para sempre.
describe("limite_ia.sql", () => {
  const sql = readFileSync(join(__dirname, "..", "..", "supabase", "limite_ia.sql"), "utf8")

  it("a função e os parâmetros têm os nomes que o RPC chama", () => {
    expect(sql).toMatch(/function public\.consumir_cota_ia\(p_tipo text, p_limite integer, p_por_minuto integer default 0\)/)
  })

  it("a versão antiga (dois parâmetros) sai, senão a chamada fica ambígua", () => {
    expect(sql).toMatch(/drop function if exists public\.consumir_cota_ia\(text, integer\);/)
  })

  it("aceita exatamente os tipos que o TS conhece", () => {
    for (const tipo of ["neuro", "transcricao"]) expect(sql).toContain(`'${tipo}'`)
  })

  it("nasce chamável por quem está logado e fechado para quem não está", () => {
    expect(sql).toMatch(/revoke execute on function public\.consumir_cota_ia\(text, integer, integer\) from public, anon/)
    expect(sql).toMatch(/grant execute on function public\.consumir_cota_ia\(text, integer, integer\) to authenticated/)
  })

  it("devolve o motivo que o TS lê", () => {
    expect(sql).toContain("'motivo', 'dia'")
    expect(sql).toContain("'motivo', 'minuto'")
  })
})

describe("consomeCotaDeIa: a ordem SQL × deploy não abre brecha", () => {
  const rpcQue = (respostas: Array<{ data: unknown; error: { code?: string; message?: string } | null }>) => {
    const chamadas: Array<Record<string, unknown>> = []
    const supabase = {
      rpc: async (_nome: string, args: Record<string, unknown>) => {
        chamadas.push(args)
        return respostas[chamadas.length - 1]
      },
    }
    return { supabase: supabase as unknown as Parameters<typeof consomeCotaDeIa>[0], chamadas }
  }

  it("com o SQL novo, uma chamada só, com o teto do minuto", async () => {
    const { supabase, chamadas } = rpcQue([{ data: { ok: true, usos: 1 }, error: null }])
    expect(await consomeCotaDeIa(supabase, "neuro", 5, 3)).toEqual({ permitido: true, usos: 1 })
    expect(chamadas).toEqual([{ p_tipo: "neuro", p_limite: 5, p_por_minuto: 3 }])
  })

  it("com o SQL antigo, cai na versão de dois parâmetros e o teto do DIA continua valendo", async () => {
    const { supabase, chamadas } = rpcQue([
      { data: null, error: { code: "PGRST202", message: "not found" } },
      { data: { ok: false, usos: 5 }, error: null },
    ])
    expect(await consomeCotaDeIa(supabase, "neuro", 5, 3)).toEqual({ permitido: false, usos: 5, motivo: "dia" })
    expect(chamadas[1]).toEqual({ p_tipo: "neuro", p_limite: 5 })
  })
})
