import { describe, it, expect } from "vitest"
import { CORES_DE_NOTA, corDeNota, fundoDaNota, saneiaCorDeNota, tarjaDaNota, VEU } from "./nota-cor"

describe("a paleta", () => {
  it("tem id único e nome legível", () => {
    expect(new Set(CORES_DE_NOTA.map((c) => c.id)).size).toBe(CORES_DE_NOTA.length)
    for (const c of CORES_DE_NOTA) {
      expect(c.id).toMatch(/^[a-z]+$/)
      expect(c.nome.length).toBeGreaterThan(2)
    }
  })

  it("nenhuma cor é quase-branca nem quase-preta", () => {
    // O véu é o MESMO nos dois temas: uma cor no extremo da luminosidade some
    // em um deles. O intervalo abaixo é o que sobrevive aos dois.
    for (const c of CORES_DE_NOTA) {
      const l = Number(/^oklch\(([\d.]+)/.exec(c.cor)?.[1])
      expect(l).toBeGreaterThan(0.55)
      expect(l).toBeLessThan(0.85)
    }
  })

  it("as cores se distinguem umas das outras", () => {
    // Duas etiquetas parecidas não servem para achar nada na lista.
    const matizes = CORES_DE_NOTA.map((c) => Number(/([\d.]+)\)$/.exec(c.cor)?.[1]))
    for (let i = 0; i < matizes.length; i++) {
      for (let j = i + 1; j < matizes.length; j++) {
        const d = Math.abs(matizes[i] - matizes[j])
        expect(Math.min(d, 360 - d)).toBeGreaterThan(25)
      }
    }
  })
})

describe("saneiaCorDeNota", () => {
  it("aceita o que está na paleta, em qualquer caixa", () => {
    expect(saneiaCorDeNota("azul")).toBe("azul")
    expect(saneiaCorDeNota(" AZUL ")).toBe("azul")
  })

  it("cor órfã vira 'sem cor', e não erro", () => {
    // Perder a nota por causa da etiqueta dela seria trocar o essencial pelo
    // enfeite. Vale para paleta mudada e para dado editado à mão.
    for (const v of [null, undefined, 42, "", "roxo-neon", "#ff0000", {}]) {
      expect(saneiaCorDeNota(v)).toBeNull()
    }
  })
})

describe("fundo e tarja", () => {
  it("sem cor não pinta nada — o cartão fica com o fundo do tema", () => {
    expect(fundoDaNota(null)).toBeUndefined()
    expect(tarjaDaNota("inexistente")).toBeUndefined()
  })

  it("o fundo é a cor MISTURADA com o que está atrás", () => {
    // É o que faz a mesma paleta servir ao tema claro e ao escuro: quem aparece
    // através do véu é o fundo do tema, não um segundo hex por tema.
    const fundo = fundoDaNota("verde")!
    expect(fundo).toContain("color-mix")
    expect(fundo).toContain("transparent")
    expect(fundo).toContain(`${VEU}%`)
    expect(fundo).toContain(corDeNota("verde")!.cor)
  })

  it("a tarja é a cor cheia — é ela que se enxerga de relance", () => {
    expect(tarjaDaNota("coral")).toBe(corDeNota("coral")!.cor)
  })
})
