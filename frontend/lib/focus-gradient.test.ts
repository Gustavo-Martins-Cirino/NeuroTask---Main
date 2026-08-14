import { describe, it, expect } from "vitest"
import { GRADIENT_PRESETS, velocidadeDoGradiente, progressoDaSessao } from "./focus-gradient"

// O ponto dos ambientes animados é ajudar a concentração, não competir com ela:
// a animação desacelera conforme a sessão avança e para de vez quando o sistema
// pede menos movimento. É isso que estes testes seguram.

describe("velocidadeDoGradiente", () => {
  it("começa na velocidade base e cai até 25% dela no fim", () => {
    expect(velocidadeDoGradiente(0.4, 0)).toBeCloseTo(0.4, 4)
    expect(velocidadeDoGradiente(0.4, 1)).toBeCloseTo(0.1, 4)
    expect(velocidadeDoGradiente(0.4, 0.5)).toBeCloseTo(0.25, 4)
  })

  it("nunca acelera: é monótona decrescente", () => {
    let anterior = Infinity
    for (let i = 0; i <= 10; i++) {
      const v = velocidadeDoGradiente(0.4, i / 10)
      expect(v).toBeLessThanOrEqual(anterior)
      anterior = v
    }
  })

  it("prefers-reduced-motion congela a cena", () => {
    expect(velocidadeDoGradiente(0.4, 0, true)).toBe(0)
    expect(velocidadeDoGradiente(0.4, 0.5, true)).toBe(0)
  })

  it("progresso fora de [0,1] não vira velocidade negativa nem maior que a base", () => {
    expect(velocidadeDoGradiente(0.4, -3)).toBeCloseTo(0.4, 4)
    expect(velocidadeDoGradiente(0.4, 9)).toBeCloseTo(0.1, 4)
  })
})

describe("progressoDaSessao", () => {
  it("mede o quanto já passou, não o que falta", () => {
    expect(progressoDaSessao(1500, 1500)).toBe(0)   // acabou de começar
    expect(progressoDaSessao(750, 1500)).toBe(0.5)
    expect(progressoDaSessao(0, 1500)).toBe(1)
  })

  it("timer sem duração (cronômetro livre) não quebra a conta", () => {
    expect(progressoDaSessao(120, 0)).toBe(0)
    expect(progressoDaSessao(120, -5)).toBe(0)
    expect(progressoDaSessao(120, NaN)).toBe(0)
  })

  it("estouro do tempo satura em 1, não passa disso", () => {
    expect(progressoDaSessao(-90, 1500)).toBe(1)
  })
})

describe("presets", () => {
  it("todo preset tem id único e as três cores", () => {
    const ids = new Set(GRADIENT_PRESETS.map((p) => p.id))
    expect(ids.size).toBe(GRADIENT_PRESETS.length)
    for (const p of GRADIENT_PRESETS) {
      for (const c of [p.color1, p.color2, p.color3, p.fallback]) {
        expect(c).toMatch(/^#[0-9a-f]{6}$/i)
      }
      expect(p.speed).toBeGreaterThan(0)
    }
  })
})
