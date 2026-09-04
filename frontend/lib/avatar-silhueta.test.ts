import { describe, it, expect } from "vitest"
import {
  SILHUETAS, caminhoDoQuadrilSentado, caminhoDoTronco, controleQuePassaPor,
  pontoDaQuadratica, silhuetaDe,
} from "./avatar-silhueta"

const { m, f } = SILHUETAS

describe("as duas silhuetas são diferentes de FORMA, não de tamanho", () => {
  it("o masculino é um V: o ombro é o ponto mais largo", () => {
    expect(m.peitoL).toBeGreaterThan(m.quadrilL)
  })

  it("o feminino é ampulheta: o quadril alcança ou passa o ombro", () => {
    expect(f.quadrilL).toBeGreaterThanOrEqual(f.peitoL)
  })

  it("a cintura feminina aperta de verdade; a masculina quase não existe", () => {
    // É o aperto que faz a forma ser lida como forma. Sem um piso aqui, os dois
    // voltam a ser o mesmo desenho em duas larguras.
    expect(f.cinturaL / f.quadrilL).toBeLessThan(0.75)
    expect(m.cinturaL / m.peitoL).toBeGreaterThan(0.85)
  })

  it("escalar um no outro NÃO dá o outro — era exatamente a queixa", () => {
    // Se as duas fossem o mesmo desenho em tamanhos diferentes, as três razões
    // (ombro/quadril, cintura/quadril, ombro/cintura) seriam iguais.
    const razoes = (s: typeof m) => [s.peitoL / s.quadrilL, s.cinturaL / s.quadrilL, s.peitoL / s.cinturaL]
    const rm = razoes(m)
    const rf = razoes(f)
    for (let i = 0; i < rm.length; i++) {
      expect(Math.abs(rm[i] - rf[i])).toBeGreaterThan(0.15)
    }
  })

  it("o ombro feminino é mais estreito e um pouco mais baixo", () => {
    expect(f.ombroL).toBeLessThan(m.ombroL)
    expect(f.ombroY).toBeGreaterThan(m.ombroY) // y cresce para baixo
  })

  it("o pescoço acompanha o ombro", () => {
    expect(f.pescocoL).toBeLessThan(m.pescocoL)
  })

  it("as medidas sobem do ombro ao quadril, sem cruzar", () => {
    for (const s of [m, f]) {
      expect(s.ombroY).toBeLessThan(s.peitoY)
      expect(s.peitoY).toBeLessThan(s.cinturaY)
      expect(s.cinturaY).toBeLessThan(s.quadrilY)
      expect(s.ombroL).toBeLessThan(s.peitoL) // o ombro é mais estreito que a axila
    }
  })
})

describe("silhuetaDe", () => {
  it("qualquer coisa que não seja 'f' é o corpo masculino", () => {
    expect(silhuetaDe("f")).toBe(f)
    for (const v of ["m", "", null, undefined, 42]) expect(silhuetaDe(v)).toBe(m)
  })
})

describe("controleQuePassaPor", () => {
  it("a curva passa PELA cintura, não perto dela", () => {
    // Usar a cintura como ponto de controle direto deixaria o aperto pela
    // metade, e a forma voltaria a ser um V de lado reto.
    const p0 = 13, p2 = 10.6, meio = 7.9
    const c = controleQuePassaPor(p0, p2, meio)
    expect(pontoDaQuadratica(p0, c, p2, 0.5)).toBeCloseTo(meio, 10)
  })

  it("sem aperto, o controle fica no meio do caminho", () => {
    const c = controleQuePassaPor(10, 10, 10)
    expect(c).toBeCloseTo(10, 10)
  })
})

describe("caminhoDoTronco", () => {
  const numeros = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

  it("sai um path fechado e sem NaN", () => {
    for (const s of [m, f]) {
      const d = caminhoDoTronco(s)
      expect(d.endsWith("Z")).toBe(true)
      expect(d).not.toContain("NaN")
      expect(numeros(d).every(Number.isFinite)).toBe(true)
    }
  })

  it("é simétrico no eixo do corpo", () => {
    // O centro do bonequinho é x = 1: o tronco não pode nascer torto.
    const d = caminhoDoTronco(m, 1)
    expect(d).toContain(`${1 - m.peitoL} `)
    expect(d).toContain(`${1 + m.peitoL} `)
  })

  it("respeita o centro que receber", () => {
    expect(caminhoDoTronco(m, 0)).not.toBe(caminhoDoTronco(m, 1))
  })
})

describe("caminhoDoQuadrilSentado", () => {
  it("nasce da mesma largura do tronco, senão a emenda aparece", () => {
    const d = caminhoDoQuadrilSentado(f, 1)
    expect(d).toContain(`${1 - f.quadrilL} `)
    expect(d).toContain(`${1 + f.quadrilL} `)
  })

  it("o quadril feminino é mais largo que o masculino também sentado", () => {
    expect(f.quadrilL).toBeGreaterThan(m.quadrilL)
  })
})
