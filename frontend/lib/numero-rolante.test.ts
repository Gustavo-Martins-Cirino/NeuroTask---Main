import { describe, expect, it } from "vitest"
import { comChaveDaDireita, formataInteiro, glifosDe } from "./numero-rolante"

describe("glifosDe", () => {
  it("separa dígitos de caracteres fixos", () => {
    expect(glifosDe("04:35")).toEqual([
      { tipo: "digito", valor: 0 },
      { tipo: "digito", valor: 4 },
      { tipo: "fixo", char: ":" },
      { tipo: "digito", valor: 3 },
      { tipo: "digito", valor: 5 },
    ])
  })

  it("trata o sinal e o separador como fixos", () => {
    expect(glifosDe("-1.234")).toEqual([
      { tipo: "fixo", char: "-" },
      { tipo: "digito", valor: 1 },
      { tipo: "fixo", char: "." },
      { tipo: "digito", valor: 2 },
      { tipo: "digito", valor: 3 },
      { tipo: "digito", valor: 4 },
    ])
  })

  it("texto vazio vira lista vazia", () => {
    expect(glifosDe("")).toEqual([])
  })
})

describe("formataInteiro", () => {
  it("preenche com zeros até as casas mínimas", () => {
    expect(formataInteiro(4, { minCasas: 2 })).toBe("04")
    expect(formataInteiro(0, { minCasas: 2 })).toBe("00")
  })

  it("não corta números maiores que as casas mínimas", () => {
    expect(formataInteiro(123, { minCasas: 2 })).toBe("123")
  })

  it("agrupa milhares", () => {
    expect(formataInteiro(1234567, { agrupar: true })).toBe("1.234.567")
    expect(formataInteiro(999, { agrupar: true })).toBe("999")
  })

  it("preserva o sinal negativo antes dos zeros e do agrupamento", () => {
    expect(formataInteiro(-5, { minCasas: 3 })).toBe("-005")
    expect(formataInteiro(-1234, { agrupar: true })).toBe("-1.234")
  })

  it("trunca a parte fracionária", () => {
    expect(formataInteiro(3.9)).toBe("3")
    expect(formataInteiro(-3.9)).toBe("-3")
  })
})

describe("comChaveDaDireita", () => {
  it("numera a partir da direita para a casa das unidades ficar estável", () => {
    expect(comChaveDaDireita(["9"]).map((g) => g.chave)).toEqual([0])
    expect(comChaveDaDireita(["1", "0"]).map((g) => g.chave)).toEqual([1, 0])
    expect(comChaveDaDireita(["1", "0", "0"]).map((g) => g.chave)).toEqual([2, 1, 0])
  })

  it("mantém o glifo junto da chave", () => {
    expect(comChaveDaDireita([{ v: 7 }])).toEqual([{ glifo: { v: 7 }, chave: 0 }])
  })
})
