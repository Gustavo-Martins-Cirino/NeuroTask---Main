import { describe, it, expect } from "vitest"
import { FOLGA_PADRAO, distribuirNaParede } from "./office-parede"

/** As peças ocupam [centro − largura/2, centro + largura/2]; nenhuma pode
 *  encostar na seguinte. É a checagem que o bug do relógio pedia. */
function seSobrepoem(centros: number[], larguras: number[]): boolean {
  for (let i = 1; i < centros.length; i++) {
    const fimAnterior = centros[i - 1] + larguras[i - 1] / 2
    const inicioAtual = centros[i] - larguras[i] / 2
    if (inicioAtual < fimAnterior - 1e-9) return true
  }
  return false
}

describe("distribuirNaParede", () => {
  it("quadro e relógio deixam de se sobrepor — era o bug", () => {
    const larguras = [0.56, 0.29]
    const centros = distribuirNaParede(larguras, -1.7, 0.25)
    expect(seSobrepoem(centros, larguras)).toBe(false)
  })

  it("a fileira fica centrada no vão, com uma ou com quatro peças", () => {
    for (const larguras of [[0.5], [0.5, 0.3], [0.4, 0.3, 0.3, 0.2]]) {
      const centros = distribuirNaParede(larguras, -1.6, 0.4)
      const inicio = centros[0] - larguras[0] / 2
      const fim = centros[centros.length - 1] + larguras[larguras.length - 1] / 2
      // Sobra igual dos dois lados = fileira centrada
      expect(inicio - -1.6).toBeCloseTo(0.4 - fim, 6)
    }
  })

  it("mantém a ordem de entrada, da esquerda para a direita", () => {
    const centros = distribuirNaParede([0.3, 0.3, 0.3], -1.5, 1.5)
    expect(centros[0]).toBeLessThan(centros[1])
    expect(centros[1]).toBeLessThan(centros[2])
  })

  it("aperta a folga quando não cabe, em vez de transbordar o vão", () => {
    const larguras = [0.6, 0.6, 0.6]
    const apertado = distribuirNaParede(larguras, -1, 1) // 1,8 de peça em 2,0 de vão
    expect(seSobrepoem(larguras.map((_, i) => apertado[i]), larguras)).toBe(false)
    expect(apertado[0] - larguras[0] / 2).toBeGreaterThanOrEqual(-1 - 1e-9)
    expect(apertado[2] + larguras[2] / 2).toBeLessThanOrEqual(1 + 1e-9)
    // E a folga apertada é menor que a padrão, senão nada foi apertado
    expect(apertado[1] - apertado[0] - 0.6).toBeLessThan(FOLGA_PADRAO)
  })

  it("sem peça nenhuma, nenhuma vaga", () => {
    expect(distribuirNaParede([], -1, 1)).toEqual([])
  })
})
