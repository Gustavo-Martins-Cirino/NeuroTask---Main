import { describe, expect, it } from "vitest"
import { MAX_TEXTO_DA_VOZ, textoParaVoz } from "./texto-da-voz"

describe("textoParaVoz", () => {
  it("texto comum passa igual", () => {
    expect(textoParaVoz("  Pronto, criei a tarefa.  ")).toBe("Pronto, criei a tarefa.")
  })

  it("& e < não quebram mais o XML da voz", () => {
    expect(textoParaVoz("Pão & café")).toBe("Pão &amp; café")
    expect(textoParaVoz("3 < 5")).toBe("3 &lt; 5")
  })

  it("marcação no texto vira texto, não SSML", () => {
    expect(textoParaVoz('</prosody><voice name="outra">oi')).toBe("&lt;/prosody&gt;&lt;voice name=&quot;outra&quot;&gt;oi")
  })

  it("corta antes de escapar: nunca parte uma entidade ao meio", () => {
    const r = textoParaVoz("a".repeat(MAX_TEXTO_DA_VOZ - 1) + "&bbbb")
    expect(r.endsWith("&amp;")).toBe(true)
  })

  it("o que não é texto vira vazio (era 500)", () => {
    for (const ruim of [12345, null, undefined, { text: "x" }, ["x"]]) expect(textoParaVoz(ruim)).toBe("")
  })
})
