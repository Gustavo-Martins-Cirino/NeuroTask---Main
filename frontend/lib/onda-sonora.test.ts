import { describe, it, expect } from "vitest"
import { estadoDaOnda } from "./onda-sonora"

describe("estadoDaOnda", () => {
  it("apaga quando ninguém está falando", () => {
    expect(estadoDaOnda("idle", false)).toBe("parado")
    expect(estadoDaOnda("thinking", false)).toBe("parado")
  })

  it("azul (ouvindo) enquanto a pessoa fala", () => {
    expect(estadoDaOnda("listening", false)).toBe("ouvindo")
    expect(estadoDaOnda("idle", true)).toBe("ouvindo")
  })

  it("verde (falando) enquanto a Neuro responde", () => {
    expect(estadoDaOnda("speaking", false)).toBe("falando")
  })

  it("o microfone segurado vence a fala da Neuro — é o barge-in", () => {
    expect(estadoDaOnda("speaking", true)).toBe("ouvindo")
  })
})
