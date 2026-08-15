import { describe, it, expect } from "vitest"
import { colunaFaltante, envioSemColuna, explicaErro, MAX_TENTATIVAS } from "./feedback"

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

describe("explicaErro", () => {
  it("cada código vira uma instrução diferente, e nenhuma manda rodar SQL à toa", () => {
    const rls = explicaErro({ code: "42501", message: 'new row violates policy for table "feedback"' })
    expect(rls).toMatch(/permissão/i)
    expect(rls).not.toMatch(/ainda não existe/i)

    expect(explicaErro({ code: "42P01", message: "relation does not exist" })).toMatch(/não existe/i)
    expect(explicaErro({ code: "PGRST204", message: "..." })).toMatch(/coluna/i)
    expect(explicaErro({ code: "PGRST205", message: "..." })).toMatch(/cache/i)
  })

  it("erro desconhecido mostra a mensagem crua, e sem mensagem não mostra 'undefined'", () => {
    expect(explicaErro({ code: "XX000", message: "falha exótica" })).toBe("falha exótica")
    expect(explicaErro({})).not.toMatch(/undefined/)
  })
})
