import { describe, it, expect } from "vitest"
import { pt, en, dicionario, idiomaDaRegiao, idiomaDoFormato, idiomaDoNavegador, type Dicionario } from "./i18n"

// A falta de uma CHAVE já não compila (é o que a interface Dicionario compra).
// O que a interface não pega, e estes testes pegam: dicionário que compila mas
// devolve texto vazio, plural que não muda, e a frase que ficou igual nos dois
// idiomas — o jeito mais fácil de "traduzir" sem traduzir.

const IDIOMAS: [string, Dicionario][] = [["pt", pt], ["en", en]]

describe("dicionários — nenhum texto vazio", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: toda frase tem conteúdo`, () => {
      expect(d.agenda.titulo("Ana").trim()).not.toBe("")
      expect(d.agenda.titulo(null).trim()).not.toBe("")
      expect(d.agenda.periodo(14).trim()).not.toBe("")
      expect(d.agenda.fuso("America/Sao_Paulo").trim()).not.toBe("")
      expect(d.agenda.rodape("Ana").trim()).not.toBe("")
      expect(d.agenda.carregando.trim()).not.toBe("")
      expect(d.agenda.hoje.trim()).not.toBe("")
      expect(d.agenda.livreODiaTodo.trim()).not.toBe("")
      expect(d.agenda.donoAnonimo.trim()).not.toBe("")
    })
  }
})

describe("dicionários — o que varia realmente varia", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: o nome entra no título e no rodapé`, () => {
      expect(d.agenda.titulo("Gustavo")).toContain("Gustavo")
      expect(d.agenda.rodape("Gustavo")).toContain("Gustavo")
    })

    it(`${nome}: sem nome, o título não vira frase quebrada`, () => {
      const t = d.agenda.titulo(null)
      expect(t).not.toContain("null")
      expect(t).not.toContain("undefined")
      expect(t.trim()).toBe(t) // nem sobra espaço de onde o nome sairia
    })

    it(`${nome}: singular e plural são diferentes`, () => {
      expect(d.agenda.periodo(1)).not.toBe(d.agenda.periodo(2))
      expect(d.agenda.periodo(1)).toContain("1")
      expect(d.agenda.periodo(30)).toContain("30")
    })

    it(`${nome}: o fuso aparece na frase`, () => {
      expect(d.agenda.fuso("Europe/Lisbon")).toContain("Europe/Lisbon")
    })
  }

  it("os dois idiomas não devolvem o mesmo texto (tradução de fachada)", () => {
    expect(en.agenda.livreODiaTodo).not.toBe(pt.agenda.livreODiaTodo)
    expect(en.agenda.carregando).not.toBe(pt.agenda.carregando)
    expect(en.agenda.titulo("Ana")).not.toBe(pt.agenda.titulo("Ana"))
    expect(en.agenda.periodo(7)).not.toBe(pt.agenda.periodo(7))
  })
})

describe("de onde vem o idioma", () => {
  it("região manda no app", () => {
    expect(idiomaDaRegiao("BR")).toBe("pt")
    expect(idiomaDaRegiao("US")).toBe("en")
  })

  it("o formato de hora chega ao idioma sem dado novo guardado", () => {
    expect(idiomaDoFormato("24h")).toBe("pt")
    expect(idiomaDoFormato("12h")).toBe("en")
  })

  it("dicionario() devolve o certo para cada idioma", () => {
    expect(dicionario("pt")).toBe(pt)
    expect(dicionario("en")).toBe(en)
  })
})

describe("idiomaDoNavegador — quem abre um link público", () => {
  it("respeita português quando o navegador pede", () => {
    expect(idiomaDoNavegador(["pt-BR", "en-US"])).toBe("pt")
    expect(idiomaDoNavegador(["pt"])).toBe("pt")
    expect(idiomaDoNavegador(["PT-br"])).toBe("pt")
  })

  it("respeita inglês", () => {
    expect(idiomaDoNavegador(["en-GB"])).toBe("en")
  })

  it("segue a ORDEM de preferência do navegador", () => {
    expect(idiomaDoNavegador(["en-US", "pt-BR"])).toBe("en")
    expect(idiomaDoNavegador(["pt-BR", "en-US"])).toBe("pt")
  })

  it("idioma que não falamos cai em INGLÊS, não em português", () => {
    // Insistir em português com quem já não fala português é o palpite pior.
    expect(idiomaDoNavegador(["fr-FR"])).toBe("en")
    expect(idiomaDoNavegador(["ja", "ko"])).toBe("en")
  })

  it("acha o suportado mesmo depois de um não suportado", () => {
    expect(idiomaDoNavegador(["fr-FR", "pt-BR"])).toBe("pt")
  })

  it("entrada ausente ou vazia não quebra", () => {
    expect(idiomaDoNavegador(undefined)).toBe("en")
    expect(idiomaDoNavegador([])).toBe("en")
  })
})
