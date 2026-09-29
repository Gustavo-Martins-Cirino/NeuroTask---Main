import { describe, it, expect } from "vitest"
import { pesoDaChamada, linhaDePeso } from "./ia-peso"

const FERRAMENTA = {
  type: "function",
  function: {
    name: "create_task",
    description: "Cria uma nova tarefa para o usuário.",
    parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
  },
}

describe("pesoDaChamada", () => {
  it("separa o que se repete do que cresce", () => {
    const p = pesoDaChamada({
      messages: [{ role: "user", content: "cria uma tarefa" }],
      tools: [FERRAMENTA],
    })
    expect(p.tokensDeFerramentas).toBeGreaterThan(0)
    expect(p.tokensDeConversa).toBeGreaterThan(0)
    expect(p.tokens).toBe(p.tokensDeFerramentas + p.tokensDeConversa)
  })

  // O motivo de o módulo existir: tirar o schema é a única coisa que muda o
  // peso sem mudar a conversa.
  it("sem ferramentas, o peso do schema é zero", () => {
    const messages = [{ role: "user", content: "oi" }]
    const com = pesoDaChamada({ messages, tools: [FERRAMENTA] })
    const sem = pesoDaChamada({ messages })
    expect(sem.tokensDeFerramentas).toBe(0)
    expect(sem.tokensDeConversa).toBe(com.tokensDeConversa)
    expect(sem.tokens).toBeLessThan(com.tokens)
  })

  it("o schema é idêntico volta a volta, a conversa não", () => {
    const tools = [FERRAMENTA]
    const volta0 = pesoDaChamada({ messages: [{ role: "user", content: "oi" }], tools })
    const volta1 = pesoDaChamada({
      messages: [
        { role: "user", content: "oi" },
        { role: "assistant", content: "criei" },
        { role: "tool", content: '{"ok":true}' },
      ],
      tools,
    })
    expect(volta1.tokensDeFerramentas).toBe(volta0.tokensDeFerramentas)
    expect(volta1.tokensDeConversa).toBeGreaterThan(volta0.tokensDeConversa)
  })

  it("payload vazio não quebra nem inventa peso", () => {
    expect(pesoDaChamada({})).toEqual({
      bytes: 2,
      tokens: 0,
      tokensDeFerramentas: 0,
      tokensDeConversa: 0,
    })
  })
})

describe("linhaDePeso", () => {
  // Ela existe para ser CRUZADA com o `Used`/`Requested` do 429 — se algum
  // desses números sumir da linha, o cruzamento deixa de ser possível.
  it("escreve os números que o diagnóstico precisa", () => {
    const linha = linhaDePeso(
      2,
      { bytes: 9000, tokens: 2500, tokensDeFerramentas: 1831, tokensDeConversa: 669 },
      4096
    )
    expect(linha).toContain("volta=2")
    expect(linha).toContain("tokens~=2500")
    expect(linha).toContain("ferramentas 1831")
    expect(linha).toContain("conversa 669")
    expect(linha).toContain("max_tokens=4096")
  })

  it("cabe numa linha só", () => {
    const linha = linhaDePeso(0, pesoDaChamada({ tools: [FERRAMENTA] }), 1024)
    expect(linha).not.toMatch(/[\r\n]/)
  })
})
