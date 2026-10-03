import { describe, expect, it } from "vitest"
import { NOTAS_DO_SINO, duracaoDoSino, fimDoTimer, restanteAte } from "./sino-foco"

describe("sino do Modo Foco", () => {
  it("é discreto: nenhuma nota passa de 0,25 de volume", () => {
    for (const n of NOTAS_DO_SINO) expect(n.pico).toBeLessThanOrEqual(0.25)
  })

  it("se faz ouvir: bate mais de uma vez", () => {
    const ataques = NOTAS_DO_SINO.filter((n) => n.frequencia === 880).length
    expect(ataques).toBeGreaterThanOrEqual(2)
  })

  it("é curto: some em poucos segundos", () => {
    expect(duracaoDoSino()).toBeGreaterThan(1)
    expect(duracaoDoSino()).toBeLessThanOrEqual(3.5)
  })

  it("fica numa faixa audível e não estridente", () => {
    for (const n of NOTAS_DO_SINO) {
      expect(n.frequencia).toBeGreaterThanOrEqual(400)
      expect(n.frequencia).toBeLessThanOrEqual(2000)
    }
  })
})

describe("relógio do timer", () => {
  it("o fim é agora mais o que resta", () => {
    expect(fimDoTimer(1_000, 25 * 60)).toBe(1_000 + 25 * 60 * 1000)
  })

  it("restante negativo não empurra o fim para trás", () => {
    expect(fimDoTimer(5_000, -3)).toBe(5_000)
  })

  it("arredonda para cima: 00:00 só quando acabou", () => {
    expect(restanteAte(10_000, 9_600)).toBe(1)
    expect(restanteAte(10_000, 10_000)).toBe(0)
  })

  it("não depende de quantos tiques rodaram: a aba parada um minuto volta certa", () => {
    const fim = fimDoTimer(0, 25 * 60)
    // Aba em segundo plano: o próximo tique só chega 61s depois.
    expect(restanteAte(fim, 61_000)).toBe(25 * 60 - 61)
  })

  it("passou do fim é zero, nunca negativo", () => {
    expect(restanteAte(1_000, 90_000)).toBe(0)
  })
})
