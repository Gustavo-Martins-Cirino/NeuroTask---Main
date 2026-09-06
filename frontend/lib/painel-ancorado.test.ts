import { describe, it, expect } from "vitest"
import { ancorarPainel, LARGURA_PAINEL, MARGEM_TELA } from "./painel-ancorado"

describe("ancorarPainel", () => {
  it("no desktop não mexe em nada — o painel já cabe à esquerda do botão", () => {
    const { largura, deslocamento } = ancorarPainel(1200, 1440)
    expect(largura).toBe(LARGURA_PAINEL)
    expect(deslocamento).toBe(0)
  })

  it("o caso medido no 390×844: a borda esquerda saía em -66px", () => {
    const { largura, deslocamento } = ancorarPainel(286, 390)
    expect(largura).toBe(LARGURA_PAINEL)
    // Sem o empurrão, o painel começaria em -66. Com ele, começa na margem.
    expect(286 - largura).toBe(-66)
    expect(286 + deslocamento - largura).toBe(MARGEM_TELA)
  })

  it("em tela estreita o painel encolhe em vez de vazar", () => {
    const { largura } = ancorarPainel(200, 300)
    expect(largura).toBe(300 - MARGEM_TELA * 2)
  })

  it("o painel nunca sai da tela, e quando escorrega pousa na margem", () => {
    for (const tela of [280, 320, 390, 414, 600, 768, 1024, 1440]) {
      for (let botao = 20; botao <= tela; botao += 7) {
        const { largura, deslocamento } = ancorarPainel(botao, tela)
        const direita = botao + deslocamento
        const esquerda = direita - largura
        // O que não pode acontecer de jeito nenhum: pedaço fora da tela.
        expect(esquerda).toBeGreaterThanOrEqual(0)
        expect(direita).toBeLessThanOrEqual(tela)
        if (deslocamento > 0) {
          // Escorregou: pousa exatamente na margem, nem um pixel além.
          expect(esquerda).toBeCloseTo(MARGEM_TELA, 6)
        } else {
          // Não escorregou porque já cabia com folga.
          expect(esquerda).toBeGreaterThanOrEqual(MARGEM_TELA)
        }
      }
    }
  })

  it("botão colado na borda esquerda ainda rende um painel visível", () => {
    const { largura, deslocamento } = ancorarPainel(36, 390)
    expect(largura).toBeGreaterThan(0)
    expect(36 + deslocamento - largura).toBe(MARGEM_TELA)
  })
})
