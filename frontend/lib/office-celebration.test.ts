import { describe, it, expect } from "vitest"
import {
  addPending, takePending, parsePending, jumpHeight, bodyWiggle,
  buildConfetti, confettiAt, confettiOpacity,
  CELEBRATION_TTL_MS, MAX_PENDING,
} from "./office-celebration"

// A festa precisa nascer de trabalho real e MORRER sozinha: nada de confete
// eterno guardado no localStorage esperando a próxima visita.

describe("pendência de comemoração", () => {
  const T0 = 1_700_000_000_000

  it("acumula conclusões até o teto", () => {
    let p = addPending(null, T0)
    expect(p.count).toBe(1)
    for (let i = 0; i < 10; i++) p = addPending(p, T0 + i * 1000)
    expect(p.count).toBe(MAX_PENDING)
  })

  it("pendência vencida não acumula: recomeça do zero", () => {
    const velha = addPending(addPending(null, T0), T0 + 500)
    expect(velha.count).toBe(2)
    // O TTL conta da ÚLTIMA conclusão (T0 + 500), não da primeira.
    const nova = addPending(velha, T0 + 500 + CELEBRATION_TTL_MS + 1)
    expect(nova.count).toBe(1)
  })

  it("consome só o que ainda está fresco", () => {
    const p = addPending(null, T0)
    expect(takePending(p, T0 + 60_000)).toBe(1)
    expect(takePending(p, T0 + CELEBRATION_TTL_MS + 1)).toBe(0)
    expect(takePending(null, T0)).toBe(0)
  })

  it("parsePending ignora lixo no localStorage", () => {
    expect(parsePending(null)).toBeNull()
    expect(parsePending("nada disso")).toBeNull()
    expect(parsePending("{}")).toBeNull()
    expect(parsePending(JSON.stringify({ count: 0, at: T0 }))).toBeNull()
    expect(parsePending(JSON.stringify({ count: "2", at: T0 }))).toBeNull()
    expect(parsePending(JSON.stringify({ count: 2, at: T0 }))).toEqual({ count: 2, at: T0 })
    expect(parsePending(JSON.stringify({ count: 99, at: T0 }))?.count).toBe(MAX_PENDING)
  })
})

describe("animação da comemoração", () => {
  it("o pulo começa e termina no chão, e nunca afunda", () => {
    expect(jumpHeight(0)).toBe(0)
    expect(jumpHeight(1)).toBe(0)
    for (let i = 0; i <= 100; i++) {
      const h = jumpHeight(i / 100)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(0.4)
    }
    expect(jumpHeight(0.25)).toBeGreaterThan(0.3) // pico do 1º pulo
    expect(jumpHeight(0.75)).toBeLessThan(jumpHeight(0.25)) // o 2º é menor
  })

  it("o balanço do corpo morre no fim", () => {
    expect(bodyWiggle(0)).toBe(0)
    expect(bodyWiggle(1)).toBe(0)
    expect(Math.abs(bodyWiggle(0.95))).toBeLessThan(Math.abs(bodyWiggle(0.1)))
  })

  it("o confete é determinístico e nasce dentro da sala", () => {
    const a = buildConfetti(24)
    const b = buildConfetti(24)
    expect(a).toEqual(b)
    for (const p of a) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1.3)
      expect(p.z).toBeGreaterThan(2)
      expect(p.delay).toBeGreaterThanOrEqual(0)
      expect(p.delay).toBeLessThan(0.3)
    }
  })

  it("o confete cai, não sobe, e para no chão", () => {
    for (const piece of buildConfetti(12)) {
      let anterior = Infinity
      for (let i = 0; i <= 40; i++) {
        const { z } = confettiAt(piece, i / 40)
        expect(z).toBeGreaterThanOrEqual(0.02)
        expect(z).toBeLessThanOrEqual(anterior + 1e-9)
        anterior = z
      }
      expect(confettiAt(piece, 1).z).toBe(0.02) // todo mundo chega ao chão
    }
  })

  it("a opacidade abre e fecha", () => {
    expect(confettiOpacity(0)).toBe(0)
    expect(confettiOpacity(1)).toBe(0)
    expect(confettiOpacity(0.5)).toBe(1)
    expect(confettiOpacity(0.9)).toBeGreaterThan(0)
    expect(confettiOpacity(0.9)).toBeLessThan(1)
  })
})
