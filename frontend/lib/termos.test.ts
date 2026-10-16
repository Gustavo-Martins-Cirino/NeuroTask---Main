import { describe, expect, it } from "vitest"
import { DOCUMENTOS, EMAIL_DE_CONTATO, IDADE_MINIMA, RESPONSAVEL } from "./termos"

const textoDe = (idioma: "pt" | "en") =>
  DOCUMENTOS[idioma].partes.flatMap((p) => p.secoes.flatMap((s) => s.blocos.flat())).join(" ")

describe("termos de uso e privacidade", () => {
  it("os dois idiomas têm as mesmas partes e seções, na mesma ordem", () => {
    const estrutura = (idioma: "pt" | "en") =>
      DOCUMENTOS[idioma].partes.map((p) => ({ id: p.id, secoes: p.secoes.map((s) => s.id) }))
    expect(estrutura("en")).toEqual(estrutura("pt"))
  })

  it("cada seção tem o mesmo número de blocos nos dois idiomas (nada sumiu na tradução)", () => {
    DOCUMENTOS.pt.partes.forEach((parte, i) => {
      parte.secoes.forEach((secao, j) => {
        const outra = DOCUMENTOS.en.partes[i].secoes[j]
        expect(outra.blocos.map((b) => (Array.isArray(b) ? b.length : 1))).toEqual(
          secao.blocos.map((b) => (Array.isArray(b) ? b.length : 1))
        )
      })
    })
  })

  it.each(["pt", "en"] as const)("%s: cita o responsável, o e-mail de contato e a idade mínima", (idioma) => {
    const texto = textoDe(idioma)
    expect(texto).toContain(RESPONSAVEL)
    expect(texto).toContain(EMAIL_DE_CONTATO)
    expect(texto).toContain(String(IDADE_MINIMA))
  })

  it("ids de seção não se repetem dentro de uma parte (são as âncoras da página)", () => {
    for (const parte of DOCUMENTOS.pt.partes) {
      const ids = parte.secoes.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it.each(["pt", "en"] as const)("%s: negrito (§) sempre em pares", (idioma) => {
    const marcas = textoDe(idioma).split("").filter((c) => c === "§").length
    expect(marcas % 2).toBe(0)
  })
})
