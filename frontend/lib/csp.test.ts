import { describe, expect, it } from "vitest"
import { POLITICA_TRAVADA, leRelatorioCsp, paginaSemSegredo, politicaCompleta } from "./csp"

const SUPA = "https://abcdefgh.supabase.co"

const diretiva = (politica: string, nome: string) =>
  politica.split("; ").find((d) => d.startsWith(nome + " "))?.split(" ").slice(1) ?? []

describe("politicaCompleta", () => {
  const p = politicaCompleta(SUPA)

  it("o Supabase entra por https e pelo websocket do Realtime", () => {
    expect(diretiva(p, "connect-src")).toEqual(expect.arrayContaining([SUPA, "wss://abcdefgh.supabase.co"]))
    expect(diretiva(p, "img-src")).toContain(SUPA)
  })

  it("o que o app usa de fora tem lugar: CAPTCHA, YouTube, feriados, 3D", () => {
    expect(diretiva(p, "script-src")).toContain("https://challenges.cloudflare.com")
    expect(diretiva(p, "script-src")).toContain("https://www.youtube.com")
    expect(diretiva(p, "img-src")).toContain("https://i.ytimg.com")
    expect(diretiva(p, "frame-src")).toEqual(expect.arrayContaining(["https://www.youtube.com", "https://challenges.cloudflare.com"]))
    expect(diretiva(p, "connect-src")).toContain("https://date.nager.at")
    expect(diretiva(p, "script-src")).toContain("'wasm-unsafe-eval'")
    expect(diretiva(p, "worker-src")).toContain("blob:")
  })

  it("nada de curinga nem eval de JavaScript", () => {
    expect(p).not.toMatch(/(^|\s)\*(\s|;|$)/)
    expect(p).not.toContain("'unsafe-eval'")
    expect(p).not.toMatch(/https:(\s|;)/)
  })

  it("relata em /api/csp e mantém as travas que já valiam", () => {
    expect(diretiva(p, "report-uri")).toEqual(["/api/csp"])
    for (const trava of POLITICA_TRAVADA.split("; ")) expect(p).toContain(trava)
  })

  it("sem a URL do Supabase não sai fonte vazia nem quebra", () => {
    const sem = politicaCompleta(undefined)
    expect(sem).not.toMatch(/\s{2,}/)
    expect(diretiva(sem, "connect-src")[0]).toBe("'self'")
  })
})

describe("leRelatorioCsp", () => {
  it("formato antigo (report-uri)", () => {
    expect(
      leRelatorioCsp({
        "csp-report": {
          "document-uri": "https://neuro-task-main.vercel.app/app/office?x=1",
          "effective-directive": "connect-src",
          "blocked-uri": "https://cdn.exemplo.com/decoder/x.wasm?v=2",
        },
      })
    ).toEqual([{ diretiva: "connect-src", bloqueado: "https://cdn.exemplo.com", pagina: "/app/office" }])
  })

  it("formato da Reporting API (lista)", () => {
    expect(
      leRelatorioCsp([
        { type: "csp-violation", body: { documentURL: "https://site/login", effectiveDirective: "script-src-elem", blockedURL: "inline" } },
        { type: "deprecation", body: {} },
      ])
    ).toEqual([{ diretiva: "script-src-elem", bloqueado: "inline", pagina: "/login" }])
  })

  it("o token da agenda pública e do feed não vai para o log", () => {
    expect(paginaSemSegredo("https://site/agenda/9f8e7d6c5b4a")).toBe("/agenda/…")
    expect(paginaSemSegredo("https://site/api/calendar/9f8e7d6c.ics")).toBe("/api/calendar/…")
    expect(paginaSemSegredo("https://site/auth/callback?code=segredo")).toBe("/auth/callback")
  })

  it("violação de extensão do navegador é ruído e sai", () => {
    expect(
      leRelatorioCsp({ "csp-report": { "document-uri": "https://site/app", "effective-directive": "script-src", "blocked-uri": "chrome-extension://abc/x.js" } })
    ).toEqual([])
  })

  it("data: e blob: aparecem pelo nome; lixo vira lista vazia", () => {
    expect(leRelatorioCsp({ "csp-report": { "document-uri": "https://s/a", "violated-directive": "img-src 'self'", "blocked-uri": "data:image/png;base64,AAAA" } })[0].bloqueado).toBe("data")
    expect(leRelatorioCsp(null)).toEqual([])
    expect(leRelatorioCsp("x")).toEqual([])
    expect(leRelatorioCsp({ "csp-report": {} })).toEqual([])
  })
})
