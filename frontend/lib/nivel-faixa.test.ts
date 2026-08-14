import { describe, it, expect } from "vitest"
import { faixaDoNivel } from "./nivel-faixa"

describe("faixaDoNivel", () => {
  it("nível 1 pega o primeiro degrau", () => {
    expect(faixaDoNivel(1).nome).toBe("Começando")
  })

  it("a faixa muda de verdade ao subir de degrau", () => {
    expect(faixaDoNivel(1).nome).not.toBe(faixaDoNivel(8).nome)
    expect(faixaDoNivel(8).nome).not.toBe(faixaDoNivel(20).nome)
  })

  it("nível acima do último degrau fica no topo, não volta pro começo", () => {
    expect(faixaDoNivel(999).nome).toBe("Lendário")
  })

  it("nível inválido ou abaixo de 1 cai no primeiro degrau", () => {
    for (const n of [0, -5, NaN]) expect(faixaDoNivel(n).nome).toBe("Começando")
  })

  it("toda faixa tem uma cor hex — é ela que vira o ponto do selo", () => {
    for (const n of [1, 3, 5, 8, 12, 18, 40]) {
      expect(faixaDoNivel(n).cor).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
