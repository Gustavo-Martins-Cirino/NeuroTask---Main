import { describe, expect, it } from "vitest"
import { destinoSeguro } from "./destino-seguro"

const ORIGEM = "https://neuro-task-main.vercel.app"

describe("destinoSeguro", () => {
  it("sem next, vai para o padrão", () => {
    expect(destinoSeguro(null)).toBe("/app")
    expect(destinoSeguro(undefined)).toBe("/app")
    expect(destinoSeguro("")).toBe("/app")
  })

  it("caminho do próprio site passa, com busca e âncora", () => {
    expect(destinoSeguro("/app/tasks")).toBe("/app/tasks")
    expect(destinoSeguro("/reset-password")).toBe("/reset-password")
    expect(destinoSeguro("/app/calendar?dia=2026-10-09#manha")).toBe("/app/calendar?dia=2026-10-09#manha")
  })

  it("o padrão pode ser outro", () => {
    expect(destinoSeguro("@outro-site.com", "/login")).toBe("/login")
  })

  const ATAQUES = [
    "@outro-site.com",
    "@outro-site.com/app",
    "//outro-site.com",
    "/\\outro-site.com",
    "\\\\outro-site.com",
    "/\t/outro-site.com",
    "/\n/outro-site.com",
    "https://outro-site.com",
    "javascript:alert(1)",
    "outro-site.com",
    ".outro-site.com",
  ]

  it.each(ATAQUES)("recusa %j", (next) => {
    expect(destinoSeguro(next)).toBe("/app")
  })

  // O que importa de verdade é o que a rota faz com o resultado: colar depois
  // da origem. Por esse caminho, o host nunca pode mudar.
  it.each([...ATAQUES, "/app", "/a/../../b", "/%2F%2Foutro-site.com"])(
    "colado depois da origem, %j não troca o host",
    (next) => {
      expect(new URL(`${ORIGEM}${destinoSeguro(next)}`).host).toBe("neuro-task-main.vercel.app")
    },
  )

  it("sem a conferência, o ataque troca mesmo o host (o defeito que isto conserta)", () => {
    expect(new URL(`${ORIGEM}@outro-site.com`).host).toBe("outro-site.com")
  })
})
