import { describe, expect, it } from "vitest"
import { MOTIVOS_LOGIN, motivoDaUrl, motivoDoCodigo } from "./motivo-login"

describe("motivoDoCodigo", () => {
  it("link de e-mail vencido ou já usado", () => {
    expect(motivoDoCodigo("otp_expired")).toBe("linkVencido")
    expect(motivoDoCodigo("flow_state_expired")).toBe("linkVencido")
    expect(motivoDoCodigo("flow_state_not_found")).toBe("linkVencido")
  })

  it("link aberto em outro navegador (o PKCE guarda a chave no navegador que pediu)", () => {
    expect(motivoDoCodigo("pkce_code_verifier_not_found")).toBe("outroNavegador")
    expect(motivoDoCodigo("bad_code_verifier")).toBe("outroNavegador")
  })

  it("a pessoa desistiu na tela do provedor", () => {
    expect(motivoDoCodigo("access_denied")).toBe("cancelado")
  })

  it("limite de tentativas do Supabase", () => {
    expect(motivoDoCodigo("over_request_rate_limit")).toBe("muitasTentativas")
    expect(motivoDoCodigo("over_email_send_rate_limit")).toBe("muitasTentativas")
  })

  it("código que ninguém previu, ou nenhum, não vira motivo", () => {
    expect(motivoDoCodigo("unexpected_failure")).toBeNull()
    expect(motivoDoCodigo(undefined)).toBeNull()
    expect(motivoDoCodigo(null)).toBeNull()
    expect(motivoDoCodigo("")).toBeNull()
  })

  it("nome herdado de objeto não é código", () => {
    expect(motivoDoCodigo("constructor")).toBeNull()
    expect(motivoDoCodigo("__proto__")).toBeNull()
    expect(motivoDoCodigo("toString")).toBeNull()
  })
})

describe("motivoDaUrl", () => {
  it.each(MOTIVOS_LOGIN)("o motivo %s passa", (m) => {
    expect(motivoDaUrl(m)).toBe(m)
  })

  it("texto qualquer na URL não aparece na tela", () => {
    expect(motivoDaUrl("Sua conta foi bloqueada. Ligue para 0800 000 0000")).toBeNull()
    expect(motivoDaUrl("Email link is invalid or has expired")).toBeNull()
    expect(motivoDaUrl("LINKVENCIDO")).toBeNull()
    expect(motivoDaUrl(undefined)).toBeNull()
  })
})
