import { describe, it, expect } from "vitest"
import {
  CIMENTO_TILE, RIPADO_TILE, TIJOLO_TILE,
  ler, texturaCimento, texturaRipado, texturaTijolo, type Cor,
} from "./office-textura"

const TIJOLO: Cor = [0.62, 0.3, 0.22]
const ARGAMASSA: Cor = [0.82, 0.79, 0.74]
const perto = (a: Cor, b: Cor, tol = 0.02) => a.every((v, i) => Math.abs(v - b[i]) < tol)

describe("tijolinho", () => {
  const p = texturaTijolo(TIJOLO, ARGAMASSA)

  it("a junta é argamassa e o meio da peça é tijolo", () => {
    expect(perto(ler(p, 40, 1), ARGAMASSA)).toBe(true) // fiada de baixo, junta horizontal
    expect(perto(ler(p, 40, 16), TIJOLO, 0.06)).toBe(true) // miolo do tijolo
  })

  it("a fiada de cima anda meia peça — junta alinhada vira grade, não parede", () => {
    const meia = TIJOLO_TILE.largura / 4
    const ehJunta = (x: number, y: number) => perto(ler(p, x, y), ARGAMASSA)
    // x=0 é junta vertical embaixo; em cima, a junta está meia peça adiante.
    expect(ehJunta(0, 16)).toBe(true)
    expect(ehJunta(0, 48)).toBe(false)
    expect(ehJunta(meia, 48)).toBe(true)
  })

  it("peças vizinhas não têm a mesma cor, e a variação é POR PEÇA", () => {
    const a = ler(p, 20, 16)
    const b = ler(p, 84, 16) // o tijolo ao lado, na mesma fiada
    expect(a[0]).not.toBeCloseTo(b[0], 3)
    // Dois pixels do MESMO tijolo têm de ser idênticos, senão vira chuvisco
    expect(ler(p, 20, 16)).toEqual(ler(p, 30, 20))
  })

  it("é determinística: o mesmo desenho a cada carregamento", () => {
    expect(texturaTijolo(TIJOLO, ARGAMASSA).dados).toEqual(p.dados)
  })

  it("todo pixel é opaco — buraco na textura vira parede transparente", () => {
    for (let i = 3; i < p.dados.length; i += 4) expect(p.dados[i]).toBe(255)
  })
})

describe("ripado", () => {
  const p = texturaRipado([0.45, 0.3, 0.18], [0.1, 0.08, 0.07])

  it("tem fresta escura e régua clara", () => {
    expect(ler(p, 1, 0)[0]).toBeLessThan(ler(p, 20, 0)[0])
  })

  it("não muda ao longo da altura — régua vertical é vertical", () => {
    for (let x = 0; x < RIPADO_TILE.largura; x++) {
      expect(ler(p, x, 0)).toEqual(ler(p, x, RIPADO_TILE.altura - 1))
    }
  })

  it("a régua tem volume: o meio é mais claro que a quina", () => {
    const meio = ler(p, Math.round((RIPADO_TILE.largura + RIPADO_TILE.fresta) / 2), 0)[0]
    const quina = ler(p, RIPADO_TILE.largura - 1, 0)[0]
    expect(meio).toBeGreaterThan(quina)
  })
})

describe("cimento queimado", () => {
  const base: Cor = [0.6, 0.59, 0.57]
  const p = texturaCimento(base)

  it("mancha, mas de leve — forte demais lê como sujeira", () => {
    let min = 1, max = 0
    for (let y = 0; y < CIMENTO_TILE.lado; y += 3) {
      for (let x = 0; x < CIMENTO_TILE.lado; x += 3) {
        const v = ler(p, x, y)[0]
        min = Math.min(min, v)
        max = Math.max(max, v)
      }
    }
    expect(max - min).toBeGreaterThan(0.01) // existe variação
    expect(max - min).toBeLessThan(0.07)    // e ela é discreta
  })

  it("fecha a volta consigo mesma — é aplicada uma vez, sem repetição", () => {
    const L = CIMENTO_TILE.lado
    for (let y = 0; y < L; y += 16) {
      // O pixel depois da última coluna é o da primeira: sem isso, emenda.
      expect(ler(p, L - 1, y)[0]).toBeCloseTo(ler(p, 0, y)[0], 1)
    }
  })
})
