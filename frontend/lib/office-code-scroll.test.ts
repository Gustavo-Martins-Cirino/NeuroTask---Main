import { describe, it, expect } from "vitest"
import { rolagemDoCodigo, deslocamentoEm, VEL_PARADO, VEL_TRABALHANDO } from "./office-code-scroll"

// Sem o wrap as barras saem da tela e o monitor fica em branco depois de meio
// minuto — o tipo de bug que só aparece em quem deixa a aba aberta.

const ALT = 0.3

describe("rolagemDoCodigo", () => {
  it("sem deslocamento, a barra fica onde estava", () => {
    expect(rolagemDoCodigo(0.1, ALT, 0)).toBeCloseTo(0.1, 6)
    expect(rolagemDoCodigo(-0.12, ALT, 0)).toBeCloseTo(-0.12, 6)
  })

  it("desloca para BAIXO conforme o tempo passa", () => {
    expect(rolagemDoCodigo(0.1, ALT, 0.05)).toBeLessThan(0.1)
  })

  it("nunca sai da tela, por maior que seja o deslocamento", () => {
    for (const d of [0, 0.5, 7, 123.4, 99999]) {
      for (const base of [-0.15, -0.02, 0, 0.09, 0.15]) {
        const v = rolagemDoCodigo(base, ALT, d)
        expect(v).toBeGreaterThanOrEqual(-ALT / 2 - 1e-9)
        expect(v).toBeLessThanOrEqual(ALT / 2 + 1e-9)
      }
    }
  })

  it("dá a volta: uma tela inteira de deslocamento devolve a posição original", () => {
    expect(rolagemDoCodigo(0.07, ALT, ALT)).toBeCloseTo(0.07, 6)
    expect(rolagemDoCodigo(0.07, ALT, ALT * 3)).toBeCloseTo(0.07, 6)
  })

  it("quem passa do fundo reaparece no topo", () => {
    const base = -ALT / 2 + 0.01 // quase no fundo
    const v = rolagemDoCodigo(base, ALT, 0.02) // empurra além do fundo
    expect(v).toBeGreaterThan(0) // voltou lá em cima
  })

  it("altura inválida não quebra nem manda a barra para NaN", () => {
    for (const alt of [0, -1, NaN]) expect(rolagemDoCodigo(0.05, alt, 3)).toBe(0.05)
  })
})

describe("deslocamentoEm", () => {
  it("trabalhando rola bem mais rápido que parado", () => {
    expect(deslocamentoEm(10, true)).toBeGreaterThan(deslocamentoEm(10, false) * 3)
  })

  it("é sempre crescente — o código não anda para trás", () => {
    for (const trab of [true, false]) {
      let ant = -Infinity
      for (let t = 0; t < 20; t += 1.5) {
        const d = deslocamentoEm(t, trab)
        expect(d).toBeGreaterThanOrEqual(ant)
        ant = d
      }
    }
  })

  it("parado ainda anda: a tela nunca fica congelada", () => {
    expect(VEL_PARADO).toBeGreaterThan(0)
    expect(VEL_TRABALHANDO).toBeGreaterThan(VEL_PARADO)
  })
})
