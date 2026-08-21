import { describe, it, expect } from "vitest"
import { parseOfficeBg, resolveOfficeBg, ehFundoPersonalizado, OFFICE_BG_DEFAULT, AUTO_LIGHT, AUTO_DARK } from "./office-bg"

// A cor de fundo vem do localStorage (não confiável): tem que sanear pra não
// injetar CSS arbitrário no style do container.
describe("parseOfficeBg", () => {
  it("aceita 'auto' e hex #rrggbb válido", () => {
    expect(parseOfficeBg("auto")).toBe("auto")
    expect(parseOfficeBg("#dfeaf4")).toBe("#dfeaf4")
    expect(parseOfficeBg("#1B1B20")).toBe("#1B1B20")
  })

  it("cai no padrão pra nulo, vazio ou lixo (inclui tentativa de injeção)", () => {
    expect(parseOfficeBg(null)).toBe(OFFICE_BG_DEFAULT)
    expect(parseOfficeBg("")).toBe(OFFICE_BG_DEFAULT)
    expect(parseOfficeBg("red")).toBe(OFFICE_BG_DEFAULT)
    expect(parseOfficeBg("#fff")).toBe(OFFICE_BG_DEFAULT) // 3 dígitos não passa
    expect(parseOfficeBg("#abc); background:url(x")).toBe(OFFICE_BG_DEFAULT)
  })
})

describe("resolveOfficeBg", () => {
  it("'auto' segue o tema (claro/escuro)", () => {
    expect(resolveOfficeBg("auto", false)).toBe(AUTO_LIGHT)
    expect(resolveOfficeBg("auto", true)).toBe(AUTO_DARK)
  })

  it("cor fixa ignora o tema", () => {
    expect(resolveOfficeBg("#dfeaf4", false)).toBe("#dfeaf4")
    expect(resolveOfficeBg("#dfeaf4", true)).toBe("#dfeaf4")
  })
})

describe("ehFundoPersonalizado", () => {
  it("os presets (e o auto) não são personalizados", () => {
    expect(ehFundoPersonalizado("auto")).toBe(false)
    expect(ehFundoPersonalizado("#dfeaf4")).toBe(false) // Céu
    expect(ehFundoPersonalizado("#1b1b20")).toBe(false) // Grafite
  })

  it("um hex fora da lista é cor livre — é o que marca o seletor próprio", () => {
    expect(ehFundoPersonalizado("#8aa0c8")).toBe(true)
    expect(ehFundoPersonalizado("#000000")).toBe(true)
  })
})
