import { describe, it, expect } from "vitest"
import { saudacaoPorHora, staggerDasLetras, DURACAO_MAXIMA_S, STAGGER_BASE_S } from "./saudacao"

describe("saudacaoPorHora", () => {
  it("cobre as três faixas do dia", () => {
    expect(saudacaoPorHora(0)).toBe("bomDia")
    expect(saudacaoPorHora(11)).toBe("bomDia")
    expect(saudacaoPorHora(12)).toBe("boaTarde")
    expect(saudacaoPorHora(17)).toBe("boaTarde")
    expect(saudacaoPorHora(18)).toBe("boaNoite")
    expect(saudacaoPorHora(23)).toBe("boaNoite")
  })

  it("a virada é no ponto certo, não uma hora depois", () => {
    expect(saudacaoPorHora(11.9)).toBe("bomDia")
    expect(saudacaoPorHora(12.1)).toBe("boaTarde")
  })

  it("hora impossível não quebra a tela — cai num cumprimento neutro", () => {
    for (const h of [-1, 24, 99, NaN, Infinity]) {
      expect(saudacaoPorHora(h)).toBe("ola")
    }
  })
})

describe("staggerDasLetras", () => {
  it("texto curto usa o ritmo base", () => {
    expect(staggerDasLetras(7)).toBe(STAGGER_BASE_S)
  })

  it("texto comprido aperta o ritmo para caber no teto de duração", () => {
    const letras = 60
    const stagger = staggerDasLetras(letras)
    expect(stagger).toBeLessThan(STAGGER_BASE_S)
    expect(stagger * letras).toBeLessThanOrEqual(DURACAO_MAXIMA_S)
  })

  it("nunca passa do teto, por mais comprido que seja o nome", () => {
    for (const n of [10, 25, 40, 80, 200]) {
      expect(staggerDasLetras(n) * n).toBeLessThanOrEqual(DURACAO_MAXIMA_S + 1e-9)
    }
  })

  it("uma letra (ou nenhuma) não tem o que escalonar", () => {
    expect(staggerDasLetras(1)).toBe(0)
    expect(staggerDasLetras(0)).toBe(0)
    expect(staggerDasLetras(NaN)).toBe(0)
  })
})
