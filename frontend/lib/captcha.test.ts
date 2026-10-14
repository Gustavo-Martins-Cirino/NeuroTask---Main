import { describe, expect, it } from "vitest"
import { captchaLigado, corpoDoPedidoDeSenha } from "./captcha"

describe("captchaLigado", () => {
  it("só com Site Key de verdade", () => {
    expect(captchaLigado("0x4AAAAAAAexemplo")).toBe(true)
    expect(captchaLigado(undefined)).toBe(false)
    expect(captchaLigado("")).toBe(false)
    expect(captchaLigado("   ")).toBe(false)
  })
})

describe("corpoDoPedidoDeSenha", () => {
  it("sem token, é só o e-mail — o que ia antes do CAPTCHA", () => {
    expect(corpoDoPedidoDeSenha(" ana@exemplo.com ", null)).toEqual({ email: "ana@exemplo.com" })
  })

  it("com token, vai onde o Supabase procura", () => {
    expect(corpoDoPedidoDeSenha("ana@exemplo.com", "tok")).toEqual({
      email: "ana@exemplo.com",
      gotrue_meta_security: { captcha_token: "tok" },
    })
  })
})
