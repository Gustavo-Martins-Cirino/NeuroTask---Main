import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  CENAS,
  EXPIRA_S,
  INSPIRA_S,
  aleatorioComSemente,
  cenaLiberada,
  corHex,
  desenhoDaConstelacao,
  estrelasAcesas,
  estrelasDaSessao,
  foraDoMiolo,
  giraARoda,
  moedasQueFaltam,
  pedacosDaFormula,
  respiracao,
  suaviza,
} from "./foco-cenas"

describe("catálogo", () => {
  it("quanto mais caro, melhor: os preços sobem na ordem da lista", () => {
    const precos = CENAS.map((c) => c.preco)
    expect([...precos].sort((a, b) => a - b)).toEqual(precos)
    expect(new Set(precos).size).toBe(precos.length)
  })

  it("o id da loja leva o prefixo foco- (não colide com o Escritório)", () => {
    for (const c of CENAS) expect(c.itemId).toBe(`foco-${c.id}`)
  })

  it("o preço da tela é o MESMO do SQL (quem cobra é o banco)", () => {
    const sql = readFileSync(join(__dirname, "..", "..", "supabase", "foco_cenas.sql"), "utf8")
    for (const c of CENAS) {
      expect(sql, c.itemId).toMatch(new RegExp(`\\('${c.itemId}',\\s*'[^']+',\\s*${c.preco},\\s*'foco'\\)`))
    }
  })

  it("só libera o que está no inventário", () => {
    expect(cenaLiberada("formulas", ["foco-formulas"])).toBe(true)
    expect(cenaLiberada("formulas", new Set(["foco-formulas"]))).toBe(true)
    expect(cenaLiberada("formulas", ["formulas", "foco-correnteza"])).toBe(false)
  })

  it("quanto falta para comprar", () => {
    expect(moedasQueFaltam(120, 94)).toBe(26)
    expect(moedasQueFaltam(60, 94)).toBe(0)
    expect(moedasQueFaltam(60, Number.NaN)).toBe(60)
  })
})

describe("matemática das cenas", () => {
  it("o aleatório com semente repete a mesma sequência", () => {
    const a = aleatorioComSemente(42)
    const b = aleatorioComSemente(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it("suavizar não depende da taxa de quadros", () => {
    let a = 0
    for (let i = 0; i < 60; i++) a = suaviza(a, 1, 1 / 60, 5)
    let b = 0
    for (let i = 0; i < 30; i++) b = suaviza(b, 1, 1 / 30, 5)
    expect(a).toBeCloseTo(b, 6)
    expect(suaviza(0.3, 1, 0, 5)).toBe(0.3)
  })

  it("a roda do mouse acumula dentro do intervalo", () => {
    expect(giraARoda(1, -100, 0.25, 0.3, 3)).toBeCloseTo(1.25)
    expect(giraARoda(1, 100000, 0.25, 0.3, 3)).toBe(0.3)
    expect(giraARoda(1, Number.NaN, 0.25, 0.3, 3)).toBe(1)
  })

  it("cor hex vira rgb de 0 a 1", () => {
    expect(corHex("#ff8000")).toEqual([1, 128 / 255, 0])
    expect(corHex("lixo", [0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3])
  })
})

describe("Fôlego: a respiração guiada", () => {
  it("inspira 4 s até cheio, solta 6 s até vazio, e repete", () => {
    expect(respiracao(0)).toEqual({ fase: "inspira", cheio: 0 })
    expect(respiracao(INSPIRA_S - 0.001).cheio).toBeCloseTo(1, 3)
    expect(respiracao(INSPIRA_S + 0.001).fase).toBe("expira")
    expect(respiracao(INSPIRA_S + EXPIRA_S - 0.001).cheio).toBeCloseTo(0, 3)
    expect(respiracao(INSPIRA_S + EXPIRA_S + 1)).toEqual(respiracao(1))
  })

  it("soltar é mais longo que inspirar (é o que acalma)", () => {
    expect(EXPIRA_S).toBeGreaterThan(INSPIRA_S)
  })
})

describe("Constelação: uma estrela a cada 5 minutos", () => {
  it("o número de estrelas segue a duração, com piso e teto", () => {
    expect(estrelasDaSessao(25 * 60)).toBe(5)
    expect(estrelasDaSessao(60 * 60)).toBe(12)
    expect(estrelasDaSessao(5 * 60)).toBe(3)
    expect(estrelasDaSessao(180 * 60)).toBe(24)
  })

  it("acende conforme o progresso, e completa no fim", () => {
    expect(estrelasAcesas(0, 5)).toBe(0)
    expect(estrelasAcesas(0.19, 5)).toBe(0)
    expect(estrelasAcesas(0.2, 5)).toBe(1)
    expect(estrelasAcesas(0.99, 5)).toBe(4)
    expect(estrelasAcesas(1, 5)).toBe(5)
    expect(estrelasAcesas(Number.NaN, 5)).toBe(0)
  })

  it("a figura cabe na tela, não passa por trás do timer e é a mesma toda vez", () => {
    for (const total of [3, 5, 12, 24]) {
      const e = desenhoDaConstelacao(total)
      expect(e).toHaveLength(total)
      for (const s of e) {
        expect(Math.abs(s.x)).toBeLessThanOrEqual(0.85)
        expect(Math.abs(s.y)).toBeLessThanOrEqual(0.78)
        expect(foraDoMiolo(s.x, s.y), `${total}: estrela em (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`).toBe(true)
      }
      expect(desenhoDaConstelacao(total)).toEqual(e)
    }
  })
})

describe("Fórmulas: sobrescrito e subscrito", () => {
  it("separa os níveis", () => {
    expect(pedacosDaFormula("e^{iπ} + 1 = 0")).toEqual([
      { texto: "e", nivel: 0 },
      { texto: "iπ", nivel: 1 },
      { texto: " + 1 = 0", nivel: 0 },
    ])
    expect(pedacosDaFormula("ε_{0}")).toEqual([
      { texto: "ε", nivel: 0 },
      { texto: "0", nivel: -1 },
    ])
    expect(pedacosDaFormula("x^2")).toEqual([
      { texto: "x", nivel: 0 },
      { texto: "2", nivel: 1 },
    ])
  })

  it("chave sem fechar não trava", () => {
    expect(pedacosDaFormula("a^{bc")).toEqual([
      { texto: "a", nivel: 0 },
      { texto: "bc", nivel: 1 },
    ])
  })
})
