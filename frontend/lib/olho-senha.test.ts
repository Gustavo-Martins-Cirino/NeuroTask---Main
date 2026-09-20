import { describe, it, expect } from "vitest"
import {
  olharPara,
  progressoDoTexto,
  dentroDaOrbita,
  ritmoDaPiscada,
  RAIO_ORBITA,
  OLHAR_PARADO,
  PISCADA_MINIMA_MS,
  PISCADA_MAXIMA_MS,
} from "./olho-senha"

describe("progressoDoTexto", () => {
  it("campo vazio é o começo do olhar", () => {
    expect(progressoDoTexto(0)).toBe(0)
  })

  it("anda junto com o que foi escrito", () => {
    expect(progressoDoTexto(7, 14)).toBeCloseTo(0.5)
  })

  // Sem saturar, senha de 60 caracteres jogaria a pupila para fora do campo.
  it("satura: senha longa não empurra o olhar para sempre", () => {
    expect(progressoDoTexto(14, 14)).toBe(1)
    expect(progressoDoTexto(600, 14)).toBe(1)
  })

  it("entrada estranha não vira NaN na tela", () => {
    expect(progressoDoTexto(NaN)).toBe(0)
    expect(progressoDoTexto(-5)).toBe(0)
  })
})

describe("olharPara", () => {
  it("começa olhando para a esquerda e termina na direita", () => {
    expect(olharPara(0).x).toBeLessThan(0)
    expect(olharPara(1).x).toBeGreaterThan(0)
    expect(olharPara(0.5).x).toBeCloseTo(0)
  })

  // O campo fica abaixo da linha dos olhos: pupila centrada na vertical dá cara
  // de susto, não de quem está espiando.
  it("olha sempre um pouco para baixo", () => {
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      expect(olharPara(p).y, `progresso ${p}`).toBeGreaterThan(0)
    }
  })

  // O teste que justifica o módulo existir: em nenhum ponto a pupila vaza.
  it("a pupila nunca escapa da órbita", () => {
    for (let i = 0; i <= 100; i++) {
      const olhar = olharPara(i / 100)
      expect(dentroDaOrbita(olhar), `progresso ${i / 100} → ${JSON.stringify(olhar)}`).toBe(true)
    }
  })

  it("progresso fora da faixa é preso nas pontas, não extrapolado", () => {
    expect(olharPara(-3)).toEqual(olharPara(0))
    expect(olharPara(9)).toEqual(olharPara(1))
    expect(dentroDaOrbita(olharPara(NaN))).toBe(true)
  })

  it("com raio maior, o olhar continua dentro", () => {
    expect(dentroDaOrbita(olharPara(1, RAIO_ORBITA * 3), RAIO_ORBITA * 3)).toBe(true)
  })

  it("o olhar parado é o centro — é o fallback de quem pediu menos movimento", () => {
    expect(OLHAR_PARADO).toEqual({ x: 0, y: 0 })
    expect(dentroDaOrbita(OLHAR_PARADO)).toBe(true)
  })
})

describe("ritmoDaPiscada", () => {
  it("fica dentro da faixa, nas duas pontas do sorteio", () => {
    expect(ritmoDaPiscada(() => 0)).toBe(PISCADA_MINIMA_MS)
    expect(ritmoDaPiscada(() => 1)).toBe(PISCADA_MAXIMA_MS)
  })

  it("sorteio quebrado não vira intervalo negativo nem eterno", () => {
    expect(ritmoDaPiscada(() => -2)).toBe(PISCADA_MINIMA_MS)
    expect(ritmoDaPiscada(() => 50)).toBe(PISCADA_MAXIMA_MS)
  })

  // Compasso fixo lê como relógio, não como bicho.
  it("sorteios diferentes dão intervalos diferentes", () => {
    expect(ritmoDaPiscada(() => 0.2)).not.toBe(ritmoDaPiscada(() => 0.8))
  })
})
