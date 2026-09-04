import { describe, it, expect } from "vitest"
import { caminhoDeCachos, picoDoCacho, raioDoCacho } from "./avatar-cabelo"

describe("raioDoCacho", () => {
  it("meia-volta: com a flecha igual a meia corda, o arco é um semicírculo", () => {
    // c = 10, h = 5 → raio 5. Chutar esse número achata o cacho ou o estoura
    // em bico, e nenhum dos dois lê como cacho.
    expect(raioDoCacho(10, 5)).toBeCloseTo(5, 10)
  })

  it("cacho raso pede raio grande", () => {
    expect(raioDoCacho(10, 1)).toBeGreaterThan(raioDoCacho(10, 3))
  })

  it("saliência impossível não devolve NaN nem zero", () => {
    for (const h of [0, -1, Number.NaN]) {
      const r = raioDoCacho(10, h)
      expect(Number.isFinite(r)).toBe(true)
      expect(r).toBeGreaterThan(0)
    }
  })
})

describe("picoDoCacho", () => {
  it("o contorno passa do crânio — é o que faz a borda ondular", () => {
    expect(picoDoCacho(10, 9, 2.4)).toBeGreaterThan(10)
  })

  it("mais cachos, cada um menos fundo entre eles", () => {
    expect(picoDoCacho(10, 15, 2.4)).toBeGreaterThan(picoDoCacho(10, 6, 2.4))
  })
})

describe("caminhoDeCachos", () => {
  const d = caminhoDeCachos(1, -40, 10, 9, 2.4)

  it("é um contorno ÚNICO e fechado, não sete discos soltos", () => {
    // Sete círculos da mesma cor viram mancha com caroços no tamanho de render,
    // e onde dois se encostam aparece um vinco que não é de cacho nenhum.
    expect(d.startsWith("M ")).toBe(true)
    expect(d.endsWith("Z")).toBe(true)
    expect((d.match(/M /g) ?? []).length).toBe(1)
  })

  it("tem um arco por cacho", () => {
    expect((d.match(/A /g) ?? []).length).toBe(9)
  })

  it("os arcos estufam para FORA (sweep 1), senão viram mordidas", () => {
    expect(d).not.toMatch(/A [\d.]+ [\d.]+ 0 0 0 /)
    expect((d.match(/ 0 0 1 /g) ?? []).length).toBe(9)
  })

  it("volta ao ponto de partida — contorno aberto deixaria um talho", () => {
    const pontos = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)(?= A| Z|$)/g)]
    const primeiro = d.slice(2).split(" A")[0]
    expect(d).toContain(primeiro)
    expect(pontos.length).toBeGreaterThan(1)
  })

  it("nenhum ponto do contorno cai dentro do crânio", () => {
    const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
    expect(nums.every(Number.isFinite)).toBe(true)
  })

  it("números impossíveis não geram path quebrado", () => {
    for (const [r, n, h] of [[0, 9, 2], [10, 1, 2], [10, 9, 0], [Number.NaN, 9, 2]] as const) {
      const saida = caminhoDeCachos(0, 0, r, n, h)
      expect(saida).not.toContain("NaN")
      expect(saida.endsWith("Z")).toBe(true)
    }
  })

  it("mais cachos, mais arcos", () => {
    expect((caminhoDeCachos(0, 0, 10, 13).match(/A /g) ?? []).length).toBe(13)
  })
})
