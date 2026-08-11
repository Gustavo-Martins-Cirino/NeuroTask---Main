import { describe, expect, it } from "vitest"
import { alvoDeScroll, partidaDoScroll } from "./calendar-scroll"

const BASE = { alturaHora: 56, alturaVisivel: 600, hoje: true }

describe("alvoDeScroll", () => {
  it("sem hoje na tela, mostra a hora padrão", () => {
    expect(alvoDeScroll({ ...BASE, minutosAgora: 14 * 60, hoje: false })).toBe(7 * 56)
  })

  it("respeita uma hora padrão diferente", () => {
    expect(alvoDeScroll({ ...BASE, minutosAgora: 0, hoje: false, horaPadrao: 9 })).toBe(9 * 56)
  })

  it("com hoje na tela, deixa o agora a um terço do topo", () => {
    // 14h = 784px na grade; menos 200px (um terço de 600) = 584
    expect(alvoDeScroll({ ...BASE, minutosAgora: 14 * 60 })).toBe(584)
  })

  it("nunca rola para antes da meia-noite", () => {
    // 1h da manhã fica acima do terço: o bruto seria negativo
    expect(alvoDeScroll({ ...BASE, minutosAgora: 60 })).toBe(0)
  })

  it("nunca rola além do fim do dia", () => {
    // 24h * 56 = 1344 de conteúdo, 600 visíveis => o máximo é 744
    expect(alvoDeScroll({ ...BASE, minutosAgora: 23 * 60 + 59 })).toBe(744)
  })

  it("não rola quando o dia inteiro já cabe na tela", () => {
    expect(alvoDeScroll({ ...BASE, minutosAgora: 20 * 60, alturaVisivel: 2000 })).toBe(0)
  })

  it("acompanha os minutos, não só a hora cheia", () => {
    const meia = alvoDeScroll({ ...BASE, minutosAgora: 14 * 60 + 30 })
    const cheia = alvoDeScroll({ ...BASE, minutosAgora: 14 * 60 })
    expect(meia - cheia).toBe(28)
  })
})

describe("partidaDoScroll", () => {
  it("parte de duas horas e meia antes do alvo", () => {
    expect(partidaDoScroll(584, 56)).toBe(444)
  })

  it("não parte de antes da meia-noite", () => {
    expect(partidaDoScroll(60, 56)).toBe(0)
  })
})
