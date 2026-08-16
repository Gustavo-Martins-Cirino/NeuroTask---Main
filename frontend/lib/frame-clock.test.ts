import { describe, it, expect } from "vitest"
import {
  relogioNovo,
  proximoQuadro,
  tickerSumiu,
  DELTA_MAX_S,
  LIMITE_SOCORRO_MS,
} from "./frame-clock"

describe("proximoQuadro", () => {
  it("o primeiro quadro não anda — só marca de onde contar", () => {
    // O ticker do GSAP já está em 300 s quando o Escritório abre; o relógio da
    // cena nasce em zero. Se o primeiro quadro medisse contra esse 300, a sala
    // tomaria cinco minutos de animação num quadro só.
    const r = proximoQuadro(relogioNovo(), 300)
    expect(r.tempo).toBe(0)
    expect(r.ultimo).toBe(300)
  })

  it("quadro normal soma exatamente o tempo passado", () => {
    let r = proximoQuadro(relogioNovo(), 100)
    r = proximoQuadro(r, 100 + 1 / 60)
    expect(r.tempo).toBeCloseTo(1 / 60, 10)
    r = proximoQuadro(r, 100 + 2 / 60)
    expect(r.tempo).toBeCloseTo(2 / 60, 10)
  })

  it("o tempo entregue é sempre o acumulado, nunca o do ticker", () => {
    // É a diferença que importa: advance() recebe o tempo da CENA.
    let r = proximoQuadro(relogioNovo(), 5000)
    for (let i = 1; i <= 10; i++) r = proximoQuadro(r, 5000 + i * 0.016)
    expect(r.tempo).toBeCloseTo(0.16, 6)
    expect(r.ultimo).toBeCloseTo(5000.16, 6)
  })

  it("volta de aba em segundo plano não faz a sala saltar", () => {
    // lagSmoothing(0) no TickerUnico é de propósito: o GSAP devolve o pulo
    // inteiro. Dez minutos parados não podem virar dez minutos de animação.
    let r = proximoQuadro(relogioNovo(), 10)
    r = proximoQuadro(r, 610)
    expect(r.tempo).toBe(DELTA_MAX_S)
    // E o relógio segue do lugar novo, sem dívida acumulada para pagar depois.
    r = proximoQuadro(r, 610 + 1 / 60)
    expect(r.tempo).toBeCloseTo(DELTA_MAX_S + 1 / 60, 10)
  })

  it("sala que volta à tela depois de muito tempo entra andando, não saltando", () => {
    let r = proximoQuadro(relogioNovo(), 0)
    r = proximoQuadro(r, 0.5)
    const antes = r.tempo
    // Rolou a página, ficou 4 minutos escolhendo item na loja, voltou.
    r = proximoQuadro(r, 240)
    expect(r.tempo - antes).toBeLessThanOrEqual(DELTA_MAX_S)
  })

  it("nunca anda para trás, mesmo com tempo não monotônico", () => {
    let r = proximoQuadro(relogioNovo(), 100)
    r = proximoQuadro(r, 100.5)
    const antes = r.tempo
    r = proximoQuadro(r, 90)
    expect(r.tempo).toBe(antes)
    expect(r.ultimo).toBe(90)
  })

  it("tempo impossível não contamina o relógio", () => {
    let r = proximoQuadro(relogioNovo(), 10)
    r = proximoQuadro(r, 10.016)
    const bom = { ...r }
    for (const t of [NaN, Infinity, -Infinity]) {
      expect(proximoQuadro(bom, t)).toEqual(bom)
    }
  })

  it("teto inválido cai no padrão em vez de zerar o movimento", () => {
    let r = proximoQuadro(relogioNovo(), 0)
    r = proximoQuadro(r, 100, 0)
    expect(r.tempo).toBe(DELTA_MAX_S)
    let r2 = proximoQuadro(relogioNovo(), 0)
    r2 = proximoQuadro(r2, 100, NaN)
    expect(r2.tempo).toBe(DELTA_MAX_S)
  })

  it("não altera o relógio recebido", () => {
    const r = proximoQuadro(relogioNovo(), 1)
    const copia = { ...r }
    proximoQuadro(r, 2)
    expect(r).toEqual(copia)
  })

  it("uma hora de cena aberta acumula sem perder precisão de quadro", () => {
    let r = proximoQuadro(relogioNovo(), 0)
    for (let i = 1; i <= 60 * 60 * 60; i++) r = proximoQuadro(r, i / 60)
    expect(r.tempo).toBeCloseTo(3600, 3)
  })
})

describe("tickerSumiu", () => {
  it("silêncio curto é só o intervalo entre quadros", () => {
    expect(tickerSumiu(true, 16)).toBe(false)
    expect(tickerSumiu(true, LIMITE_SOCORRO_MS)).toBe(false)
  })

  it("silêncio longo com a sala à vista pede socorro", () => {
    expect(tickerSumiu(true, LIMITE_SOCORRO_MS + 1)).toBe(true)
    expect(tickerSumiu(true, 5000)).toBe(true)
  })

  it("sala fora da tela não desenha de propósito — não é pane", () => {
    expect(tickerSumiu(false, 60_000)).toBe(false)
  })

  it("medida impossível não dispara o socorro à toa", () => {
    expect(tickerSumiu(true, NaN)).toBe(false)
    expect(tickerSumiu(true, Infinity)).toBe(false)
  })

  it("aceita limite próprio", () => {
    expect(tickerSumiu(true, 200, 100)).toBe(true)
    expect(tickerSumiu(true, 200, 5000)).toBe(false)
  })
})
