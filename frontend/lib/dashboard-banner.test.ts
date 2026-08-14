import { describe, it, expect } from "vitest"
import { paletaDoNivel, duracaoDaFaixa } from "./dashboard-banner"

// A faixa é a recompensa visual de subir de nível: se a paleta não mudar, o
// item não existe. E ela fica ATRÁS de texto — por isso a animação desacelera
// em vez de acelerar quando fica mais colorida.

describe("paletaDoNivel", () => {
  it("nível 1 pega a primeira faixa", () => {
    expect(paletaDoNivel(1).nome).toBe("Começando")
  })

  it("a paleta muda de verdade ao subir de degrau", () => {
    const cedo = paletaDoNivel(1).cores.join()
    const meio = paletaDoNivel(8).cores.join()
    const alto = paletaDoNivel(20).cores.join()
    expect(cedo).not.toBe(meio)
    expect(meio).not.toBe(alto)
  })

  it("nível acima do último degrau continua no topo, não volta pro começo", () => {
    expect(paletaDoNivel(999).nome).toBe("Lendário")
  })

  it("nível inválido ou abaixo de 1 cai na primeira faixa", () => {
    expect(paletaDoNivel(0).nome).toBe("Começando")
    expect(paletaDoNivel(-5).nome).toBe("Começando")
    expect(paletaDoNivel(NaN).nome).toBe("Começando")
  })

  it("toda paleta tem três cores hex", () => {
    for (const n of [1, 3, 5, 8, 12, 18, 40]) {
      const p = paletaDoNivel(n)
      expect(p.cores).toHaveLength(3)
      for (const c of p.cores) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe("duracaoDaFaixa", () => {
  it("quanto maior o nível, MAIS LENTA a volta — cor demais correndo distrai", () => {
    expect(duracaoDaFaixa(12)).toBeGreaterThan(duracaoDaFaixa(2))
  })

  it("prefers-reduced-motion zera a animação", () => {
    expect(duracaoDaFaixa(10, true)).toBe(0)
  })

  it("é sempre lenta o bastante para não competir com o texto", () => {
    for (const n of [1, 5, 10, 20, 100]) expect(duracaoDaFaixa(n)).toBeGreaterThan(20)
  })
})
