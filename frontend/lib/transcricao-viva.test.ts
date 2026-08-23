import { describe, it, expect } from "vitest"
import { CHARS_POR_SEGUNDO, charsRevelados, fatiar, fecharMarcacao } from "./transcricao-viva"

describe("charsRevelados", () => {
  it("começa em zero e avança com o tempo", () => {
    expect(charsRevelados(0)).toBe(0)
    expect(charsRevelados(1000)).toBe(CHARS_POR_SEGUNDO)
    expect(charsRevelados(2000)).toBe(CHARS_POR_SEGUNDO * 2)
  })

  it("não anda para trás com tempo negativo ou inválido", () => {
    expect(charsRevelados(-500)).toBe(0)
    expect(charsRevelados(Number.NaN)).toBe(0)
    expect(charsRevelados(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe("fatiar", () => {
  it("nada no começo, tudo no fim", () => {
    expect(fatiar("bom dia", 0)).toBe("")
    expect(fatiar("bom dia", 999)).toBe("bom dia")
  })

  it("corta na palavra inteira, nunca no meio dela", () => {
    // 5 caracteres cairiam em "bom d" — para no espaço anterior
    expect(fatiar("bom dia, Gustavo", 5)).toBe("bom")
    expect(fatiar("bom dia, Gustavo", 8)).toBe("bom dia,")
  })

  it("segura a primeira palavra até ela ficar pronta", () => {
    expect(fatiar("Gustavo, bom dia", 4)).toBe("")
  })

  it("trata quebra de linha como fim de palavra", () => {
    expect(fatiar("uma\nduas tres", 6)).toBe("uma")
  })
})

describe("fecharMarcacao", () => {
  it("deixa o texto em paz quando o negrito está fechado", () => {
    expect(fecharMarcacao("tem **três** tarefas")).toBe("tem **três** tarefas")
    expect(fecharMarcacao("sem marcação")).toBe("sem marcação")
  })

  it("remove o ** que ficou sozinho no corte", () => {
    expect(fecharMarcacao("tem **três")).toBe("tem três")
    expect(fecharMarcacao("**a** e **b")).toBe("**a** e b")
  })
})
