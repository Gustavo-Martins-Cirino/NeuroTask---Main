import { describe, it, expect, beforeEach } from "vitest"
import {
  curvaDaMoeda,
  duracaoDoVoo,
  marcarOrigemDaMoeda,
  consumirOrigemDaMoeda,
  limparOrigemDaMoeda,
  JANELA_DA_ORIGEM_MS,
  DURACAO_MIN_S,
  DURACAO_MAX_S,
} from "./coin-flight"

describe("curvaDaMoeda", () => {
  it("começa na origem e termina no destino, em coordenadas relativas", () => {
    const { caminho } = curvaDaMoeda({ x: 100, y: 600 }, { x: 900, y: 40 })
    expect(caminho[0]).toEqual({ x: 0, y: 0 })
    expect(caminho[caminho.length - 1]).toEqual({ x: 800, y: -560 })
  })

  it("é curva, não reta: o ponto de controle sai de cima da linha", () => {
    const origem = { x: 100, y: 600 }
    const destino = { x: 900, y: 40 }
    const { caminho } = curvaDaMoeda(origem, destino)
    expect(caminho).toHaveLength(3)
    const controle = caminho[1]
    const meio = { x: 400, y: -280 }
    expect(controle).not.toEqual(meio)
  })

  it("o arco nunca mergulha para baixo da reta", () => {
    // y cresce para baixo na tela: bojo para cima = y do controle <= o do meio.
    const casos: [{ x: number; y: number }, { x: number; y: number }][] = [
      [{ x: 100, y: 600 }, { x: 900, y: 40 }],
      [{ x: 900, y: 600 }, { x: 100, y: 40 }],
      [{ x: 500, y: 800 }, { x: 500, y: 60 }],
      [{ x: 200, y: 300 }, { x: 1000, y: 300 }],
      [{ x: 400, y: 90 }, { x: 1200, y: 700 }],
    ]
    for (const [origem, destino] of casos) {
      const { caminho } = curvaDaMoeda(origem, destino)
      const meioY = (destino.y - origem.y) / 2
      expect(caminho[1].y).toBeLessThanOrEqual(meioY)
    }
  })

  it("voo na vertical não tem para onde subir — o bojo sai para o lado", () => {
    const { caminho } = curvaDaMoeda({ x: 500, y: 800 }, { x: 500, y: 60 })
    expect(caminho[1].y).toBeCloseTo(-370, 6)
    expect(Math.abs(caminho[1].x)).toBeGreaterThan(0)
  })

  it("distância curta não gera um arco exagerado", () => {
    const { caminho } = curvaDaMoeda({ x: 500, y: 100 }, { x: 520, y: 90 })
    const desvio = Math.hypot(caminho[1].x - 10, caminho[1].y + 5)
    expect(desvio).toBeLessThanOrEqual(141)
  })

  it("origem igual ao destino não quebra (divisão por zero)", () => {
    const { caminho, duracaoS } = curvaDaMoeda({ x: 300, y: 300 }, { x: 300, y: 300 })
    for (const p of caminho) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
    expect(duracaoS).toBeGreaterThan(0)
  })
})

describe("duracaoDoVoo", () => {
  it("respeita o piso e o teto", () => {
    expect(duracaoDoVoo(0)).toBe(DURACAO_MIN_S)
    expect(duracaoDoVoo(99999)).toBe(DURACAO_MAX_S)
    expect(duracaoDoVoo(NaN)).toBe(DURACAO_MIN_S)
  })

  it("voo mais longo demora mais", () => {
    expect(duracaoDoVoo(1500)).toBeGreaterThan(duracaoDoVoo(300))
  })
})

describe("origem do voo", () => {
  beforeEach(() => limparOrigemDaMoeda())

  it("sem clique no card, não há voo", () => {
    expect(consumirOrigemDaMoeda()).toBeNull()
  })

  it("a origem é consumida uma única vez", () => {
    marcarOrigemDaMoeda({ x: 10, y: 20 }, 1000)
    expect(consumirOrigemDaMoeda(1100)).toEqual({ x: 10, y: 20 })
    expect(consumirOrigemDaMoeda(1200)).toBeNull()
  })

  it("XP que chega muito depois do clique não puxa a moeda daquele card", () => {
    marcarOrigemDaMoeda({ x: 10, y: 20 }, 1000)
    expect(consumirOrigemDaMoeda(1000 + JANELA_DA_ORIGEM_MS + 1)).toBeNull()
  })
})
