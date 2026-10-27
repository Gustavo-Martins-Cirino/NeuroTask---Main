import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  CENAS,
  EXPIRA_S,
  INSPIRA_S,
  agentesAtivos,
  aleatorioComSemente,
  cenaLiberada,
  coesaoDasGotas,
  corHex,
  desenhoDaConstelacao,
  deveAliviar,
  entardecer,
  estrelasAcesas,
  estrelasDaSessao,
  foraDoMiolo,
  giraARoda,
  gradeDaRede,
  jeitoDaRede,
  mediaDoQuadro,
  moedasQueFaltam,
  NEURONIOS_DA_REDE,
  neuroniosAcesos,
  neuroniosDaRede,
  pedacosDaFormula,
  pesoDoMiolo,
  respiracao,
  rumosDoAngulo,
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

describe("Revoada: o sol se põe enquanto você foca", () => {
  it("começa no fim de tarde, com o sol no alto, e termina de noite, com ele escondido", () => {
    const inicio = entardecer(0)
    const fim = entardecer(1)
    expect(inicio.sol).toBeGreaterThan(0.1)
    expect(fim.sol).toBeLessThan(-0.042) // abaixo do horizonte mais que o próprio raio
    expect(inicio.noite).toBe(0)
    expect(fim.noite).toBe(1)
    expect(inicio.ceu[3]).toEqual([255, 195, 138])
  })

  it("o sol só desce e a noite só chega — sem voltar no meio da sessão", () => {
    let antes = entardecer(0)
    for (let p = 0.05; p <= 1.0001; p += 0.05) {
      const agora = entardecer(p)
      expect(agora.sol).toBeLessThan(antes.sol)
      expect(agora.noite).toBeGreaterThanOrEqual(antes.noite)
      // o céu escurece: a soma das cores do alto não sobe
      expect(agora.ceu[0].reduce((a, b) => a + b)).toBeLessThanOrEqual(antes.ceu[0].reduce((a, b) => a + b) + 1e-9)
      antes = agora
    }
  })

  it("progresso inválido vira o começo", () => {
    expect(entardecer(Number.NaN)).toEqual(entardecer(0))
    expect(entardecer(7)).toEqual(entardecer(1))
  })
})

describe("Ferrofluido: as gotas se juntam com o foco", () => {
  it("pouca atração no começo, toda no fim, e só cresce", () => {
    expect(coesaoDasGotas(0)).toBeCloseTo(0.12)
    expect(coesaoDasGotas(1)).toBeCloseTo(1)
    expect(coesaoDasGotas(0.5)).toBeGreaterThan(coesaoDasGotas(0.25))
    expect(coesaoDasGotas(Number.NaN)).toBeCloseTo(0.12)
  })
})

describe("Sinapses: a rede", () => {
  it("a grade cobre a tela inteira sem passar do teto de células", () => {
    for (const [w, h, teto] of [
      [1920, 1080, 150000],
      [1280, 800, 150000],
      [390, 844, 60000],
      [3840, 2160, 150000],
      [10, 10, 150000],
    ]) {
      const g = gradeDaRede(w, h, teto)
      expect(g.colunas * g.celula).toBeGreaterThanOrEqual(w)
      expect(g.linhas * g.celula).toBeGreaterThanOrEqual(h)
      expect(g.colunas * g.linhas).toBeLessThanOrEqual(teto)
      expect(g.celula).toBeGreaterThanOrEqual(2)
    }
  })

  it("cresce com o foco: 30% dos agentes no começo, todos no fim", () => {
    expect(agentesAtivos(1000, 0)).toBe(300)
    expect(agentesAtivos(1000, 1)).toBe(1000)
    expect(agentesAtivos(1000, Number.NaN)).toBe(300)
    expect(agentesAtivos(1000, 0.5)).toBeGreaterThan(agentesAtivos(1000, 0.4))
  })

  it("a roda vai de fios longos a células fechadas", () => {
    const fios = jeitoDaRede(0)
    const celulas = jeitoDaRede(1)
    expect(celulas.anguloSensor).toBeGreaterThan(fios.anguloSensor)
    expect(celulas.anguloGiro).toBeGreaterThan(fios.anguloGiro)
    expect(celulas.distanciaSensor).toBeLessThan(fios.distanciaSensor)
    expect(jeitoDaRede(5)).toEqual(celulas)
  })

  it("os neurônios ficam em volta do timer, dentro da tela, afastados — e sempre os mesmos", () => {
    const n = neuroniosDaRede()
    expect(n).toHaveLength(NEURONIOS_DA_REDE)
    for (const a of n) {
      expect(pesoDoMiolo(a.x, a.y, 1.05)).toBe(0)
      expect(Math.abs(a.x)).toBeLessThanOrEqual(0.86)
      expect(Math.abs(a.y)).toBeLessThanOrEqual(0.8)
      for (const b of n) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.22)
    }
    expect(neuroniosDaRede()).toEqual(n)
  })

  it("três neurônios no começo; todos acesos no fim, um a um no caminho", () => {
    expect(neuroniosAcesos(0)).toBe(3)
    expect(neuroniosAcesos(1)).toBe(NEURONIOS_DA_REDE)
    expect(neuroniosAcesos(Number.NaN)).toBe(3)
    let antes = 3
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const agora = neuroniosAcesos(p)
      expect(agora - antes).toBeLessThanOrEqual(1)
      expect(agora).toBeGreaterThanOrEqual(antes)
      antes = agora
    }
  })

  it("qualidade adaptativa: 60 quadros/s nunca alivia, 30 sustentados aliviam, um engasgo não", () => {
    const roda = (fps: number, segundos: number, media = 1 / 60) => {
      for (let i = 0; i < fps * segundos; i++) media = mediaDoQuadro(media, 1 / fps)
      return media
    }
    expect(deveAliviar(roda(60, 30), 30)).toBe(false)
    expect(deveAliviar(roda(30, 3), 10)).toBe(true)
    expect(deveAliviar(roda(30, 3), 2)).toBe(false) // os primeiros segundos não contam
    const engasgo = mediaDoQuadro(roda(60, 5), 0.5)
    expect(deveAliviar(engasgo, 10)).toBe(false)
    expect(mediaDoQuadro(0.02, Number.NaN)).toBe(0.02)
  })

  it("o ângulo vira rumo da tabela, nunca zero", () => {
    expect(rumosDoAngulo(Math.PI)).toBe(128)
    expect(rumosDoAngulo(0)).toBe(1)
  })

  it("o miolo do timer pesa no meio e some longe dele", () => {
    expect(pesoDoMiolo(0, 0)).toBe(1)
    expect(pesoDoMiolo(0.9, 0.9)).toBe(0)
    expect(pesoDoMiolo(0.2, 0.1, 0.8)).toBeGreaterThan(pesoDoMiolo(0.4, 0.3, 0.8))
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
