import { describe, expect, it } from "vitest"
import { FECHADO_PARA_ROBOS, PAGINAS_INDEXAVEIS, SITE_URL, ehRotaPublica } from "./site"

describe("rotas públicas", () => {
  it("toda página do sitemap abre sem login (senão o Google indexa a tela de login)", () => {
    for (const pagina of PAGINAS_INDEXAVEIS) expect(ehRotaPublica(pagina), pagina).toBe(true)
  })

  it("nenhuma página do sitemap está fechada no robots.txt", () => {
    for (const pagina of PAGINAS_INDEXAVEIS) {
      for (const fechado of FECHADO_PARA_ROBOS) expect(pagina.startsWith(fechado), `${pagina} × ${fechado}`).toBe(false)
    }
  })

  it("o app, o painel do dono e as APIs pedem sessão", () => {
    for (const rota of ["/app", "/app/tasks", "/admin", "/termosx", "/agenda", "/qualquer"]) {
      expect(ehRotaPublica(rota), rota).toBe(false)
    }
  })

  it("a agenda compartilhada, o retorno do OAuth e a troca de senha abrem sem sessão", () => {
    for (const rota of ["/agenda/abc123", "/auth/callback", "/auth/error", "/reset-password"]) {
      expect(ehRotaPublica(rota), rota).toBe(true)
    }
  })

  it("a agenda NÃO é fechada no robots.txt: é o noindex que a tira do Google", () => {
    expect(FECHADO_PARA_ROBOS.some((f) => "/agenda/abc".startsWith(f))).toBe(false)
  })

  it("o endereço do site não termina em barra", () => {
    expect(SITE_URL.endsWith("/")).toBe(false)
    expect(new URL(SITE_URL).protocol).toBe("https:")
  })
})
