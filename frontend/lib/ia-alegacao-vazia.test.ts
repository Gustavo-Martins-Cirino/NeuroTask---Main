import { describe, it, expect } from "vitest"
import { semAlegacaoVazia } from "./ia-alegacao-vazia"

describe("semAlegacaoVazia", () => {
  it("corta o ✅ da mesma bolha da pergunta quando nada foi escrito", () => {
    // O caso exato do relatório de teste.
    const texto = "Posso criar o [TESTE] U3 dia 21/09 às 16:10? ✅ bloco criado"
    expect(semAlegacaoVazia(texto, false)).toBe("Posso criar o [TESTE] U3 dia 21/09 às 16:10?")
  })

  it("corta a alegação em linha própria e não deixa buraco", () => {
    const texto = "Claro, posso agendar isso.\n✅ Agendei no calendário."
    expect(semAlegacaoVazia(texto, false)).toBe("Claro, posso agendar isso.")
  })

  it("não toca no texto quando a escrita realmente aconteceu", () => {
    // Aí o ✅ é redundante com o recibo, mas não é mentira — deixa como está.
    const texto = "✅ Agendei no calendário."
    expect(semAlegacaoVazia(texto, true)).toBe(texto)
  })

  it("não mexe em texto sem ✅", () => {
    const texto = "Posso criar o bloco às 16h?"
    expect(semAlegacaoVazia(texto, false)).toBe(texto)
  })

  it("se a mensagem era SÓ a alegação falsa, devolve o original (nunca vazio)", () => {
    const texto = "✅ bloco criado"
    expect(semAlegacaoVazia(texto, false)).toBe(texto)
  })

  it("preserva o resto da conversa em volta do corte", () => {
    const texto = "Entendi! ✅ Criei a tarefa.\nQuer que eu avise antes?"
    expect(semAlegacaoVazia(texto, false)).toBe("Entendi!\nQuer que eu avise antes?")
  })

  it("aguenta entrada estranha sem quebrar", () => {
    expect(semAlegacaoVazia("", false)).toBe("")
    expect(semAlegacaoVazia(undefined as unknown as string, false)).toBe(undefined)
  })
})
