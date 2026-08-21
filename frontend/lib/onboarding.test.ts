import { describe, expect, it } from "vitest"
import {
  PASSOS_ONBOARDING,
  CHAVE_ONBOARDING,
  jaViuOnboarding,
  passoSeguinte,
  passoAnterior,
  ehUltimoPasso,
} from "./onboarding"

describe("PASSOS_ONBOARDING", () => {
  it("tem passos, cada um com id, título e texto", () => {
    expect(PASSOS_ONBOARDING.length).toBeGreaterThan(0)
    for (const p of PASSOS_ONBOARDING) {
      expect(p.id).toBeTruthy()
      expect(p.titulo).toBeTruthy()
      expect(p.texto).toBeTruthy()
    }
  })

  it("os ids são únicos (o componente casa ícone por id)", () => {
    const ids = PASSOS_ONBOARDING.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("jaViuOnboarding", () => {
  it("sem a marca, ainda não viu — mostra o guia", () => {
    expect(jaViuOnboarding(null)).toBe(false)
    expect(jaViuOnboarding(undefined)).toBe(false)
    expect(jaViuOnboarding({})).toBe(false)
    expect(jaViuOnboarding({ outra_coisa: true })).toBe(false)
  })

  it("com a marca, já viu — não mostra", () => {
    expect(jaViuOnboarding({ [CHAVE_ONBOARDING]: true })).toBe(true)
    expect(jaViuOnboarding({ [CHAVE_ONBOARDING]: "2026-08-20" })).toBe(true)
  })

  it("marca falsy não conta como visto", () => {
    expect(jaViuOnboarding({ [CHAVE_ONBOARDING]: false })).toBe(false)
    expect(jaViuOnboarding({ [CHAVE_ONBOARDING]: "" })).toBe(false)
  })
})

describe("navegação entre passos", () => {
  it("avança sem passar do último", () => {
    expect(passoSeguinte(0, 4)).toBe(1)
    expect(passoSeguinte(3, 4)).toBe(3)
  })

  it("volta sem passar do primeiro", () => {
    expect(passoAnterior(2)).toBe(1)
    expect(passoAnterior(0)).toBe(0)
  })

  it("reconhece o último passo (onde o botão vira 'Começar')", () => {
    expect(ehUltimoPasso(3, 4)).toBe(true)
    expect(ehUltimoPasso(2, 4)).toBe(false)
  })
})
