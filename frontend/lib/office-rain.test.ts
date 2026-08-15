import { describe, it, expect } from "vitest"
import {
  criarGotas,
  progressoDaGota,
  segmentoDaGota,
  chuvaLigadaNoMix,
  GOTAS_PADRAO,
  MIXER_TRILHA_CHUVA,
} from "./office-rain"

const LARG = 1.3
const ALT = 1.25

describe("criarGotas", () => {
  it("a mesma semente dá exatamente a mesma chuva", () => {
    expect(criarGotas(GOTAS_PADRAO, LARG, ALT, 7)).toEqual(criarGotas(GOTAS_PADRAO, LARG, ALT, 7))
  })

  it("sementes diferentes dão chuvas diferentes", () => {
    expect(criarGotas(12, LARG, ALT, 7)).not.toEqual(criarGotas(12, LARG, ALT, 8))
  })

  it("nenhuma gota nasce em cima do caixilho", () => {
    for (const g of criarGotas(GOTAS_PADRAO, LARG, ALT)) {
      expect(Math.abs(g.x)).toBeLessThanOrEqual(LARG / 2)
    }
  })

  it("as gotas não descem todas juntas — velocidade e fase variam", () => {
    const gotas = criarGotas(GOTAS_PADRAO, LARG, ALT)
    expect(new Set(gotas.map((g) => g.velocidade)).size).toBeGreaterThan(5)
    expect(new Set(gotas.map((g) => g.fase)).size).toBeGreaterThan(5)
  })

  it("gota mais gorda desce mais rápido e deixa risco mais longo", () => {
    const gotas = criarGotas(GOTAS_PADRAO, LARG, ALT)
    const maisLarga = gotas.reduce((a, b) => (b.largura > a.largura ? b : a))
    const maisFina = gotas.reduce((a, b) => (b.largura < a.largura ? b : a))
    expect(maisLarga.velocidade).toBeGreaterThan(maisFina.velocidade)
    expect(maisLarga.comprimento).toBeGreaterThan(maisFina.comprimento)
  })

  it("quantidade inválida não quebra a janela", () => {
    expect(criarGotas(0, LARG, ALT)).toHaveLength(0)
    expect(criarGotas(-3, LARG, ALT)).toHaveLength(0)
    expect(criarGotas(3.7, LARG, ALT)).toHaveLength(3)
  })
})

describe("progressoDaGota", () => {
  const gotas = criarGotas(GOTAS_PADRAO, LARG, ALT)

  it("fica sempre entre 0 e 1, por mais tempo que a sala fique aberta", () => {
    for (const t of [0, 0.5, 7, 60, 3600, 86400]) {
      for (const g of gotas) {
        const p = progressoDaGota(g, t)
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThan(1)
      }
    }
  })

  it("dá a volta: sai da base e reaparece no topo, sem salto de meio vidro", () => {
    const g = gotas[0]
    const tFim = (1 - g.fase) / g.velocidade // instante em que completa o ciclo
    expect(progressoDaGota(g, tFim - 0.001)).toBeGreaterThan(0.99)
    expect(progressoDaGota(g, tFim + 0.001)).toBeLessThan(0.01)
  })

  it("desce, não sobe", () => {
    const g = gotas[1]
    expect(progressoDaGota(g, 1)).toBeGreaterThan(progressoDaGota(g, 0))
  })

  it("tempo inválido devolve a gota parada, em vez de NaN", () => {
    expect(progressoDaGota(gotas[0], NaN)).toBe(gotas[0].fase)
  })
})

describe("segmentoDaGota", () => {
  const topo = 1.6 + ALT / 2
  const base = topo - ALT

  it("o risco inteiro fica dentro do vão — nunca por cima do caixilho nem abaixo do peitoril", () => {
    for (const g of criarGotas(GOTAS_PADRAO, LARG, ALT)) {
      for (let t = 0; t < 200; t += 0.29) {
        const { centroZ, escalaZ } = segmentoDaGota(g, t, topo, ALT)
        const meio = (g.comprimento * escalaZ) / 2
        expect(centroZ + meio).toBeLessThanOrEqual(topo + 1e-9)
        expect(centroZ - meio).toBeGreaterThanOrEqual(base - 1e-9)
      }
    }
  })

  it("entra crescendo pelo topo e sai encolhendo pela base", () => {
    const [g] = criarGotas(1, LARG, ALT, 3)
    const ciclo = 1 / g.velocidade
    const emFase = (p: number) => segmentoDaGota(g, (p - g.fase) * ciclo, topo, ALT).escalaZ

    expect(emFase(0)).toBeCloseTo(0, 6)
    expect(emFase(0.02)).toBeGreaterThan(0)
    expect(emFase(0.02)).toBeLessThan(1)
    expect(emFase(0.5)).toBeCloseTo(1, 6)
    expect(emFase(0.995)).toBeLessThan(0.2)
  })

  it("a escala nunca sai de [0,1] — escala negativa vira risco do avesso", () => {
    for (const g of criarGotas(GOTAS_PADRAO, LARG, ALT)) {
      for (let t = 0; t < 120; t += 0.13) {
        const { escalaZ } = segmentoDaGota(g, t, topo, ALT)
        expect(escalaZ).toBeGreaterThanOrEqual(0)
        expect(escalaZ).toBeLessThanOrEqual(1 + 1e-9)
      }
    }
  })

  it("a gota desce: em fase mais adiantada, o centro está mais baixo", () => {
    const [g] = criarGotas(1, LARG, ALT, 11)
    const ciclo = 1 / g.velocidade
    const meio = segmentoDaGota(g, (0.4 - g.fase) * ciclo, topo, ALT).centroZ
    const depois = segmentoDaGota(g, (0.7 - g.fase) * ciclo, topo, ALT).centroZ
    expect(depois).toBeLessThan(meio)
  })
})

describe("chuvaLigadaNoMix", () => {
  const mix = (tracks: Record<string, { active: boolean }>) => JSON.stringify({ master: 0.8, tracks })

  it("chove quando o som de chuva está ligado", () => {
    expect(chuvaLigadaNoMix(mix({ [MIXER_TRILHA_CHUVA]: { active: true } }))).toBe(true)
  })

  it("outro som ligado não faz chover", () => {
    expect(chuvaLigadaNoMix(mix({ fire: { active: true }, [MIXER_TRILHA_CHUVA]: { active: false } }))).toBe(false)
  })

  it("mixer nunca usado, vazio ou corrompido não quebra a cena", () => {
    expect(chuvaLigadaNoMix(null)).toBe(false)
    expect(chuvaLigadaNoMix("")).toBe(false)
    expect(chuvaLigadaNoMix("{isso não é json")).toBe(false)
    expect(chuvaLigadaNoMix("{}")).toBe(false)
    expect(chuvaLigadaNoMix("[]")).toBe(false)
    expect(chuvaLigadaNoMix('{"tracks":null}')).toBe(false)
  })
})
