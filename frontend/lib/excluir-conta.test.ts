import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { PALAVRA_DE_EXCLUSAO, confirmaExclusao, mesmaOrigem } from "./excluir-conta"

describe("confirmaExclusao", () => {
  it("na tela, só a palavra do idioma mostrado", () => {
    expect(confirmaExclusao("EXCLUIR", "pt")).toBe(true)
    expect(confirmaExclusao("DELETE", "pt")).toBe(false)
    expect(confirmaExclusao("DELETE", "en")).toBe(true)
  })

  it("maiúsculas e espaços nas pontas não importam", () => {
    expect(confirmaExclusao("  excluir ", "pt")).toBe(true)
    expect(confirmaExclusao("Excluir", "pt")).toBe(true)
  })

  it("quase não é sim", () => {
    for (const quase of ["", "EXCLUI", "EXCLUIR!", "EX CLUIR", "sim", "excluir conta"]) {
      expect(confirmaExclusao(quase, "pt")).toBe(false)
    }
  })

  it("no servidor, sem idioma, vale a palavra de qualquer idioma", () => {
    for (const palavra of Object.values(PALAVRA_DE_EXCLUSAO)) expect(confirmaExclusao(palavra)).toBe(true)
    expect(confirmaExclusao("sim")).toBe(false)
  })
})

describe("mesmaOrigem", () => {
  it("o próprio site passa", () => {
    expect(mesmaOrigem("https://neuro-task-main.vercel.app", "neuro-task-main.vercel.app")).toBe(true)
    expect(mesmaOrigem("http://localhost:3000", "localhost:3000")).toBe(true)
  })

  it("outro site, outra porta ou sem origem não passam", () => {
    expect(mesmaOrigem("https://outro-site.com", "neuro-task-main.vercel.app")).toBe(false)
    expect(mesmaOrigem("https://neuro-task-main.vercel.app.outro-site.com", "neuro-task-main.vercel.app")).toBe(false)
    expect(mesmaOrigem("http://localhost:4000", "localhost:3000")).toBe(false)
    expect(mesmaOrigem(null, "neuro-task-main.vercel.app")).toBe(false)
    expect(mesmaOrigem("null", "neuro-task-main.vercel.app")).toBe(false)
    expect(mesmaOrigem("https://neuro-task-main.vercel.app", null)).toBe(false)
  })
})

// A exclusão apaga a conta no Auth e confia no banco para o resto. Uma
// referência a auth.users sem `on delete cascade` nem `set null` faria o
// Postgres recusar o DELETE — e a pessoa ficaria sem conseguir sair do app.
describe("toda referência a auth.users nos SQLs deixa a conta ser apagada", () => {
  const pasta = join(__dirname, "..", "..", "supabase")
  const referencias = readdirSync(pasta)
    .filter((nome) => nome.endsWith(".sql"))
    .flatMap((nome) =>
      readFileSync(join(pasta, nome), "utf8")
        .split(/\r?\n/)
        .filter((linha) => /references\s+auth\.users/i.test(linha) && !linha.trim().startsWith("--"))
        .map((linha) => ({ nome, linha: linha.trim() }))
    )

  it("acha as referências (o teste não está lendo a pasta errada)", () => {
    expect(referencias.length).toBeGreaterThan(15)
  })

  it.each(referencias.map((r) => [`${r.nome}: ${r.linha}`, r.linha]))("%s", (_rotulo, linha) => {
    expect(linha).toMatch(/on\s+delete\s+(cascade|set\s+null)/i)
  })

  it("só feedback e error_log ficam anônimos (set null) — o que a política de privacidade diz", () => {
    const anonimas = referencias.filter((r) => /set\s+null/i.test(r.linha)).map((r) => r.nome)
    expect([...new Set(anonimas)].sort()).toEqual(["error_log.sql", "feedback.sql"])
  })
})
