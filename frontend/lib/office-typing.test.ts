import { describe, it, expect } from "vitest"
import { typingTap, typingRamp, TECLA_AMPLITUDE, TECLA_RAMPA_S } from "./office-typing"

// O risco aqui é a mão atravessar o teclado ou o movimento virar metrônomo —
// as duas coisas denunciam que é um boneco, não alguém trabalhando.

describe("tecladinha", () => {
  it("nunca passa da amplitude (a mão não afunda no teclado)", () => {
    for (const lado of [1, -1] as const) {
      for (let i = 0; i <= 2000; i++) {
        const a = typingTap(i / 100, lado)
        expect(Math.abs(a)).toBeLessThanOrEqual(TECLA_AMPLITUDE + 1e-9)
      }
    }
  })

  it("sobe E desce: oscila em torno do repouso, não empurra pra um lado só", () => {
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i <= 2000; i++) {
      const a = typingTap(i / 100, 1)
      min = Math.min(min, a)
      max = Math.max(max, a)
    }
    expect(max).toBeGreaterThan(TECLA_AMPLITUDE * 0.8)
    expect(min).toBeLessThan(-TECLA_AMPLITUDE * 0.8)
  })

  it("é determinístico: o mesmo instante dá o mesmo ângulo", () => {
    expect(typingTap(3.21, 1)).toBe(typingTap(3.21, 1))
    expect(typingTap(3.21, -1)).toBe(typingTap(3.21, -1))
  })

  it("as duas mãos não andam juntas", () => {
    let iguais = 0
    for (let i = 0; i <= 400; i++) {
      const t = i / 40
      if (Math.abs(typingTap(t, 1) - typingTap(t, -1)) < 1e-3) iguais++
    }
    expect(iguais).toBeLessThan(40) // cruzam de vez em quando, nunca em bloco
  })

  it("não é metrônomo: os picos não vêm todos com a mesma altura", () => {
    const picos: number[] = []
    for (let i = 1; i < 2000; i++) {
      const [a, b, c] = [typingTap((i - 1) / 100, 1), typingTap(i / 100, 1), typingTap((i + 1) / 100, 1)]
      if (b > a && b > c) picos.push(b)
    }
    expect(picos.length).toBeGreaterThan(10)
    expect(Math.max(...picos) - Math.min(...picos)).toBeGreaterThan(TECLA_AMPLITUDE * 0.15)
  })
})

describe("rampa de entrada e saída", () => {
  it("vai a 1 trabalhando e volta a 0 parando", () => {
    let v = 0
    for (let i = 0; i < 60; i++) v = typingRamp(v, true, 1 / 60)
    expect(v).toBe(1)
    for (let i = 0; i < 60; i++) v = typingRamp(v, false, 1 / 60)
    expect(v).toBe(0)
  })

  it("fica no intervalo [0,1] mesmo com um quadro gigante", () => {
    expect(typingRamp(0, true, 999)).toBe(1)
    expect(typingRamp(1, false, 999)).toBe(0)
    expect(typingRamp(0.5, true, -5)).toBe(0.5) // dt negativo não anda pra trás
  })

  it("TECLA_RAMPA_S é mesmo o tempo de completar, não uma assíntota", () => {
    // Meio caminho no meio do tempo: é o que "passo constante" quer dizer.
    let v = 0
    v = typingRamp(v, true, TECLA_RAMPA_S / 2)
    expect(v).toBeCloseTo(0.5, 6)
    v = typingRamp(v, true, TECLA_RAMPA_S / 2)
    expect(v).toBe(1) // e chega em 1 exato, sem sobrar resto
  })
})
