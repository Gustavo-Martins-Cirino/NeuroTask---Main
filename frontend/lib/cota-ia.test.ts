import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { LIMITE_PADRAO, leResultadoDaCota, limiteDoDia } from "./cota-ia"

describe("limiteDoDia", () => {
  it("sem env, o padrão", () => {
    expect(limiteDoDia("neuro", {})).toBe(LIMITE_PADRAO.neuro)
    expect(limiteDoDia("transcricao", {})).toBe(LIMITE_PADRAO.transcricao)
  })

  it("a env de cada tipo manda no seu teto", () => {
    expect(limiteDoDia("neuro", { NEURO_LIMITE_DIARIO: "200" })).toBe(200)
    expect(limiteDoDia("transcricao", { NEURO_LIMITE_DIARIO: "200" })).toBe(LIMITE_PADRAO.transcricao)
    expect(limiteDoDia("transcricao", { TRANSCRICAO_LIMITE_DIARIO: " 15 " })).toBe(15)
  })

  it("env estranha cai no padrão em vez de abrir ou fechar tudo", () => {
    for (const ruim of ["0", "-5", "abc", "1e9", "99999", "2.5", ""]) {
      expect(limiteDoDia("neuro", { NEURO_LIMITE_DIARIO: ruim }), ruim).toBe(LIMITE_PADRAO.neuro)
    }
  })
})

describe("leResultadoDaCota", () => {
  it("dentro do teto passa, e o teto batido barra", () => {
    expect(leResultadoDaCota({ ok: true, usos: 3 }, null)).toEqual({ permitido: true, usos: 3 })
    expect(leResultadoDaCota({ ok: false, usos: 30 }, null)).toEqual({ permitido: false, usos: 30 })
  })

  it("sem o SQL rodado, passa avisando (o app não para por falta dele)", () => {
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
    expect(sql).toMatch(/function public\.consumir_cota_ia\(p_tipo text, p_limite integer\)/)
  })

  it("aceita exatamente os tipos que o TS conhece", () => {
    for (const tipo of Object.keys(LIMITE_PADRAO)) expect(sql).toContain(`'${tipo}'`)
  })

  it("nasce chamável por quem está logado e fechado para quem não está", () => {
    expect(sql).toMatch(/revoke execute on function public\.consumir_cota_ia\(text, integer\) from public, anon/)
    expect(sql).toMatch(/grant execute on function public\.consumir_cota_ia\(text, integer\) to authenticated/)
  })
})
