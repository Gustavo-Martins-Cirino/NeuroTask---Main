import { describe, expect, it } from "vitest"
import {
  PASSOS_ONBOARDING,
  CHAVE_ONBOARDING,
  jaViuOnboarding,
  passoSeguinte,
  passoAnterior,
  ehUltimoPasso,
} from "./onboarding"
import { pt, en } from "./i18n"

describe("PASSOS_ONBOARDING", () => {
  it("tem passos", () => {
    expect(PASSOS_ONBOARDING.length).toBeGreaterThan(0)
  })

  it("os ids são únicos (o componente casa ícone e texto por id)", () => {
    expect(new Set(PASSOS_ONBOARDING).size).toBe(PASSOS_ONBOARDING.length)
  })
})

// O texto saiu daqui para o dicionário. A interface já garante que todo passo
// tem as duas chaves; o que ela não garante é texto de verdade nos dois idiomas.
describe("o texto de cada passo, nos dois idiomas", () => {
  for (const [nome, d] of [["pt", pt], ["en", en]] as const) {
    it(`${nome}: todo passo tem título e texto`, () => {
      for (const id of PASSOS_ONBOARDING) {
        expect(d.moldura.onboarding.passos[id].titulo.trim(), `${id}.titulo`).not.toBe("")
        expect(d.moldura.onboarding.passos[id].texto.trim(), `${id}.texto`).not.toBe("")
      }
    })
  }

  it("os passos mudam de idioma", () => {
    for (const id of PASSOS_ONBOARDING) {
      expect(en.moldura.onboarding.passos[id].texto, id).not.toBe(pt.moldura.onboarding.passos[id].texto)
    }
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
