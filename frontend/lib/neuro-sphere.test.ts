import { describe, it, expect } from "vitest"
import {
  pontosDaEsfera,
  intensidadeDaRepulsao,
  fatorDeRetorno,
  respiracao,
  velocidadeDoGiro,
  GIRO_REDUZIDO,
  brilhoPorProfundidade,
  inclinacaoDoEixo,
  ATRITO_POR_QUADRO,
  AMPLITUDE_DA_RESPIRACAO,
  AMPLITUDE_DA_INCLINACAO,
  BRILHO_DO_FUNDO,
  GIRO_PARADO,
  PERIODO_DA_INCLINACAO_X,
  PERIODO_DA_INCLINACAO_Z,
} from "./neuro-sphere"

function raioDe(pos: Float32Array, i: number): number {
  return Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
}

describe("pontosDaEsfera", () => {
  it("toda partícula nasce na casca, não dentro dela", () => {
    const pos = pontosDaEsfera(500, 1.4)
    for (let i = 0; i < 500; i++) expect(raioDe(pos, i)).toBeCloseTo(1.4, 6)
  })

  it("devolve três números por partícula", () => {
    expect(pontosDaEsfera(120).length).toBe(360)
  })

  it("uma partícula só não vira NaN", () => {
    // O original divide por (total − 1); com total = 1 isso é 0/0.
    const pos = pontosDaEsfera(1, 2)
    expect(pos.every((n) => Number.isFinite(n))).toBe(true)
    expect(raioDe(pos, 0)).toBeCloseTo(2, 6)
  })

  it("quantidade impossível devolve vazio em vez de quebrar", () => {
    for (const n of [0, -5, NaN, Infinity]) expect(pontosDaEsfera(n).length).toBe(0)
  })

  it("cobre a esfera inteira — nenhum octante fica vazio", () => {
    // O sorteio ingênuo agrupa nos polos; a espiral tem de encher tudo.
    const n = 800
    const pos = pontosDaEsfera(n)
    const octantes = new Set<string>()
    for (let i = 0; i < n; i++) {
      octantes.add(
        `${pos[i * 3] >= 0}${pos[i * 3 + 1] >= 0}${pos[i * 3 + 2] >= 0}`
      )
    }
    expect(octantes.size).toBe(8)
  })

  it("espaça de verdade: ninguém cola no vizinho", () => {
    // Numa esfera unitária com n pontos bem distribuídos, cada um ocupa uma
    // área ~4π/n, e o vizinho mais próximo fica na casa de 2·sqrt(1/n). Se a
    // distribuição desandar (agrupando nos polos), esta conta despenca.
    const n = 300
    const pos = pontosDaEsfera(n)
    let menor = Infinity
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = Math.hypot(
          pos[i * 3] - pos[j * 3],
          pos[i * 3 + 1] - pos[j * 3 + 1],
          pos[i * 3 + 2] - pos[j * 3 + 2]
        )
        if (d < menor) menor = d
      }
    }
    expect(menor).toBeGreaterThan(1.5 * Math.sqrt(1 / n))
  })

  it("o raio escala tudo junto", () => {
    const a = pontosDaEsfera(50, 1)
    const b = pontosDaEsfera(50, 3)
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i] * 3, 6)
  })
})

describe("intensidadeDaRepulsao", () => {
  it("empurra com tudo em cima do cursor e nada na borda", () => {
    expect(intensidadeDaRepulsao(0, 2)).toBe(1)
    expect(intensidadeDaRepulsao(2, 2)).toBe(0)
    expect(intensidadeDaRepulsao(1, 2)).toBeCloseTo(0.5, 10)
  })

  it("fora do alcance não sente nada", () => {
    expect(intensidadeDaRepulsao(5, 2)).toBe(0)
    expect(intensidadeDaRepulsao(1e6, 2)).toBe(0)
  })

  it("cai sem subir de novo conforme se afasta", () => {
    let anterior = Infinity
    for (let d = 0; d <= 2; d += 0.1) {
      const v = intensidadeDaRepulsao(d, 2)
      expect(v).toBeLessThanOrEqual(anterior + 1e-12)
      anterior = v
    }
  })

  it("alcance ou distância impossíveis não empurram", () => {
    expect(intensidadeDaRepulsao(1, 0)).toBe(0)
    expect(intensidadeDaRepulsao(1, -2)).toBe(0)
    expect(intensidadeDaRepulsao(NaN, 2)).toBe(0)
    expect(intensidadeDaRepulsao(1, NaN)).toBe(0)
  })
})

describe("fatorDeRetorno", () => {
  it("um quadro de 60 fps devolve exatamente o atrito", () => {
    expect(fatorDeRetorno(1 / 60)).toBeCloseTo(ATRITO_POR_QUADRO, 12)
  })

  it("a volta leva o mesmo TEMPO em qualquer taxa de quadros", () => {
    // Meio segundo a 30 fps tem de encolher tanto quanto meio segundo a 144.
    const em30 = Math.pow(fatorDeRetorno(1 / 30), 15)
    const em60 = Math.pow(fatorDeRetorno(1 / 60), 30)
    const em144 = Math.pow(fatorDeRetorno(1 / 144), 72)
    expect(em30).toBeCloseTo(em60, 10)
    expect(em144).toBeCloseTo(em60, 10)
  })

  it("sempre encolhe, nunca cresce nem inverte o sinal", () => {
    for (const d of [1 / 240, 1 / 60, 1 / 15, 0.5, 3]) {
      const f = fatorDeRetorno(d)
      expect(f).toBeGreaterThan(0)
      expect(f).toBeLessThan(1)
    }
  })

  it("delta parado ou impossível deixa o deslocamento como está", () => {
    for (const d of [0, -1, NaN, Infinity]) expect(fatorDeRetorno(d)).toBe(1)
  })

  it("atrito fora de (0,1) cai no padrão em vez de congelar ou explodir", () => {
    for (const a of [0, 1, 1.5, -0.2, NaN]) {
      expect(fatorDeRetorno(1 / 60, a)).toBeCloseTo(ATRITO_POR_QUADRO, 12)
    }
  })
})

describe("respiracao", () => {
  it("fica em torno de 1, dentro da amplitude", () => {
    for (let t = 0; t < 40; t += 0.13) {
      const s = respiracao(t)
      expect(s).toBeGreaterThanOrEqual(1 - AMPLITUDE_DA_RESPIRACAO - 1e-12)
      expect(s).toBeLessThanOrEqual(1 + AMPLITUDE_DA_RESPIRACAO + 1e-12)
    }
  })

  it("nunca chega a zero — a esfera não some no meio do ciclo", () => {
    for (let t = 0; t < 40; t += 0.07) expect(respiracao(t)).toBeGreaterThan(0.5)
  })

  it("tempo impossível deixa a escala neutra", () => {
    for (const t of [NaN, Infinity]) expect(respiracao(t)).toBe(1)
  })
})

describe("velocidadeDoGiro", () => {
  it("gira devagar em repouso", () => {
    expect(velocidadeDoGiro(false)).toBe(GIRO_PARADO)
    expect(GIRO_PARADO).toBeGreaterThan(0)
  })

  it("movimento reduzido DESACELERA, não congela — congelada lê como travada", () => {
    expect(velocidadeDoGiro(true)).toBe(GIRO_REDUZIDO)
    expect(GIRO_REDUZIDO).toBeGreaterThan(0)
    expect(GIRO_REDUZIDO).toBeLessThan(GIRO_PARADO)
  })
})

describe("brilhoPorProfundidade", () => {
  it("a frente acende e o fundo apaga — é o que dá volume", () => {
    expect(brilhoPorProfundidade(1)).toBeCloseTo(1, 12)
    expect(brilhoPorProfundidade(-1)).toBeCloseTo(BRILHO_DO_FUNDO, 12)
    expect(brilhoPorProfundidade(0)).toBeCloseTo((1 + BRILHO_DO_FUNDO) / 2, 12)
  })

  it("cresce sempre da traseira para a frente, sem degrau", () => {
    let anterior = -Infinity
    for (let z = -1; z <= 1; z += 0.05) {
      const b = brilhoPorProfundidade(z)
      expect(b).toBeGreaterThan(anterior)
      anterior = b
    }
  })

  it("o fundo nunca some de vez — a casca de trás continua lá", () => {
    expect(BRILHO_DO_FUNDO).toBeGreaterThan(0)
    for (let z = -3; z <= 3; z += 0.1) {
      expect(brilhoPorProfundidade(z)).toBeGreaterThanOrEqual(BRILHO_DO_FUNDO - 1e-12)
      expect(brilhoPorProfundidade(z)).toBeLessThanOrEqual(1 + 1e-12)
    }
  })

  it("segue o raio: numa esfera maior o fundo continua sendo o fundo", () => {
    expect(brilhoPorProfundidade(2, 2)).toBeCloseTo(1, 12)
    expect(brilhoPorProfundidade(-2, 2)).toBeCloseTo(BRILHO_DO_FUNDO, 12)
  })

  it("raio ou z impossíveis não apagam a partícula", () => {
    expect(brilhoPorProfundidade(NaN)).toBe(1)
    expect(brilhoPorProfundidade(1, 0)).toBeCloseTo(1, 12)
    expect(brilhoPorProfundidade(1, NaN)).toBeCloseTo(1, 12)
  })
})

describe("inclinacaoDoEixo", () => {
  it("balança pouco: o eixo passeia, a esfera não cambaleia", () => {
    for (let t = 0; t < 200; t += 0.37) {
      const { x, z } = inclinacaoDoEixo(t)
      expect(Math.abs(x)).toBeLessThanOrEqual(AMPLITUDE_DA_INCLINACAO + 1e-12)
      expect(Math.abs(z)).toBeLessThanOrEqual(AMPLITUDE_DA_INCLINACAO + 1e-12)
    }
  })

  it("os dois tempos não se dividem — a pose não volta em ciclo curto", () => {
    // Múltiplos dariam ar de brinquedo de corda: o eixo repetiria a mesma volta
    // sempre no mesmo ponto do balanço.
    const maior = Math.max(PERIODO_DA_INCLINACAO_X, PERIODO_DA_INCLINACAO_Z)
    const menor = Math.min(PERIODO_DA_INCLINACAO_X, PERIODO_DA_INCLINACAO_Z)
    expect(maior % menor).not.toBe(0)
  })

  it("se mexe de verdade ao longo do tempo", () => {
    const a = inclinacaoDoEixo(0)
    const b = inclinacaoDoEixo(PERIODO_DA_INCLINACAO_X / 4)
    expect(Math.abs(b.x - a.x)).toBeGreaterThan(0.1)
  })

  it("tempo impossível deixa o eixo em pé", () => {
    for (const t of [NaN, Infinity]) expect(inclinacaoDoEixo(t)).toEqual({ x: 0, z: 0 })
  })
})
