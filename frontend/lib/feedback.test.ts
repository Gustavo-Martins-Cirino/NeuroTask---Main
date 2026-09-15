import { describe, it, expect } from "vitest"
import { colunaFaltante, envioSemColuna, explicaErro, MAX_TENTATIVAS, type TextosDeErroDoFeedback } from "./feedback"
import { pt, en } from "./i18n"

const ENVIO = {
  user_id: "u1",
  message: "travou ao salvar",
  kind: "bug",
  route: "/app/tasks",
  commit: "abc123",
  user_agent: "Mozilla/5.0",
}

describe("colunaFaltante", () => {
  it("lê o nome da coluna na mensagem do PostgREST", () => {
    expect(
      colunaFaltante({
        code: "PGRST204",
        message: "Could not find the 'commit' column of 'feedback' in the schema cache",
      })
    ).toBe("commit")
  })

  it("só reage ao código certo — RLS e tabela ausente não são coluna faltando", () => {
    expect(colunaFaltante({ code: "42501", message: "new row violates row-level security" })).toBeNull()
    expect(colunaFaltante({ code: "PGRST205", message: "Could not find the table" })).toBeNull()
    expect(colunaFaltante(null)).toBeNull()
    expect(colunaFaltante({})).toBeNull()
  })

  it("código certo com mensagem em outro formato não inventa coluna", () => {
    expect(colunaFaltante({ code: "PGRST204", message: "algo totalmente diferente" })).toBeNull()
    expect(colunaFaltante({ code: "PGRST204" })).toBeNull()
  })
})

describe("envioSemColuna", () => {
  it("tira o metadado e preserva a mensagem da pessoa", () => {
    const menor = envioSemColuna(ENVIO, "commit")
    expect(menor).not.toBeNull()
    expect(menor).not.toHaveProperty("commit")
    expect(menor!.message).toBe("travou ao salvar")
    expect(menor!.route).toBe("/app/tasks")
  })

  it("não modifica o envio original", () => {
    envioSemColuna(ENVIO, "commit")
    expect(ENVIO.commit).toBe("abc123")
  })

  it("desiste quando o que falta é essencial — feedback sem mensagem não serve", () => {
    expect(envioSemColuna(ENVIO, "message")).toBeNull()
    expect(envioSemColuna(ENVIO, "kind")).toBeNull()
    expect(envioSemColuna(ENVIO, "user_id")).toBeNull()
  })

  it("desiste se a coluna nem estava no envio — senão o retry vira laço infinito", () => {
    expect(envioSemColuna(ENVIO, "coluna_que_nao_mandamos")).toBeNull()
  })

  it("descasca uma de cada vez até sobrar o essencial, dentro do teto de tentativas", () => {
    let envio: Record<string, unknown> | null = { ...ENVIO }
    const opcionais = ["commit", "route", "user_agent"]
    let voltas = 0
    for (const c of opcionais) {
      envio = envioSemColuna(envio!, c)
      voltas++
      expect(envio).not.toBeNull()
    }
    expect(voltas).toBeLessThanOrEqual(MAX_TENTATIVAS)
    expect(Object.keys(envio!).sort()).toEqual(["kind", "message", "user_id"])
  })
})

// Os textos de mentira marcam qual motivo saiu, sem amarrar o teste da REGRA a
// um idioma. Os textos de verdade são conferidos logo abaixo, nos dois.
const TEXTOS: TextosDeErroDoFeedback = {
  tabelaAusente: "[tabelaAusente]",
  cacheDoSchema: "[cacheDoSchema]",
  colunaFaltando: "[colunaFaltando]",
  semPermissao: "[semPermissao]",
  checkAntigo: "[checkAntigo]",
  generico: "[generico]",
}

describe("explicaErro", () => {
  it("cada código vira um motivo diferente — RLS não é tabela ausente", () => {
    expect(explicaErro({ code: "42501", message: 'new row violates policy for table "feedback"' }, TEXTOS)).toBe("[semPermissao]")
    expect(explicaErro({ code: "42P01", message: "relation does not exist" }, TEXTOS)).toBe("[tabelaAusente]")
    expect(explicaErro({ code: "PGRST204", message: "..." }, TEXTOS)).toBe("[colunaFaltando]")
    expect(explicaErro({ code: "PGRST205", message: "..." }, TEXTOS)).toBe("[cacheDoSchema]")
  })

  it("CHECK do kind vira instrução, não o texto cru do Postgres", () => {
    const t = explicaErro(
      { code: "23514", message: 'new row for relation "feedback" violates check constraint "feedback_kind_check"' },
      TEXTOS
    )
    expect(t).toBe("[checkAntigo]")
  })

  it("erro desconhecido mostra a mensagem crua, e sem mensagem cai no genérico", () => {
    expect(explicaErro({ code: "XX000", message: "falha exótica" }, TEXTOS)).toBe("falha exótica")
    expect(explicaErro({}, TEXTOS)).toBe("[generico]")
  })
})

describe("os textos de erro do feedback, nos dois idiomas", () => {
  for (const [nome, d] of [["pt", pt], ["en", en]] as const) {
    const t = d.moldura.feedback.erros

    it(`${nome}: cada motivo diz uma coisa diferente`, () => {
      const valores = Object.values(t)
      expect(new Set(valores).size).toBe(valores.length)
    })

    it(`${nome}: o CHECK antigo manda rodar o feedback.sql, e não repete o erro cru`, () => {
      expect(t.checkAntigo).toMatch(/feedback\.sql/)
      expect(t.checkAntigo).not.toMatch(/violates check constraint/)
    })

    // Nenhuma instrução manda rodar SQL à toa: cache do schema se resolve
    // esperando, e rodar o arquivo de novo não muda nada.
    it(`${nome}: cache do schema não manda rodar SQL`, () => {
      expect(t.cacheDoSchema).not.toMatch(/\.sql/)
    })
  }

  it("as instruções mudam de idioma", () => {
    expect(en.moldura.feedback.erros.semPermissao).not.toBe(pt.moldura.feedback.erros.semPermissao)
    expect(en.moldura.feedback.erros.generico).not.toBe(pt.moldura.feedback.erros.generico)
  })
})
