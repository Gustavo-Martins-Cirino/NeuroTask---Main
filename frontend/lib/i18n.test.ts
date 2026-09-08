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

// Varredura genérica: vale para o dicionário INTEIRO e continua valendo à
// medida que ele cresce, sem ninguém precisar lembrar de somar um teste por
// chave nova. É o contrário dos testes específicos abaixo, que existem para as
// regras que uma varredura não enxerga (nome próprio, plural, ordem).
function folhas(obj: unknown, caminho = ""): [string, unknown][] {
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      folhas(v, caminho ? `${caminho}.${k}` : k)
    )
  }
  return [[caminho, obj]]
}

describe("dicionário inteiro", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: nenhum texto vazio em lugar nenhum`, () => {
      for (const [chave, valor] of folhas(d)) {
        if (typeof valor === "string") {
          expect(valor.trim(), `${chave} está vazio`).not.toBe("")
        }
      }
    })
  }

  it("pt e en têm exatamente as mesmas chaves", () => {
    // O TypeScript já garante isso — mas só enquanto ninguém escrever `as any`.
    const chaves = (d: Dicionario) => folhas(d).map(([k]) => k).sort()
    expect(chaves(en)).toEqual(chaves(pt))
  })

  it("nenhuma marca de ênfase sobra num texto fixo", () => {
    // O § só faz sentido nas frases que passam por `enfatizar`; num rótulo solto
    // ele apareceria cru na tela.
    for (const [, d] of IDIOMAS) {
      for (const [chave, valor] of folhas(d)) {
        if (typeof valor === "string") {
          expect(valor, `${chave} tem § fora de uma frase com ênfase`).not.toContain("§")
        }
      }
    }
  })
})

describe("nomes das telas", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: nenhuma tela sem nome`, () => {
      for (const [chave, texto] of Object.entries(d.telas)) {
        expect(texto.trim(), `telas.${chave} vazio`).not.toBe("")
      }
    })
  }

  it("as telas mudam de idioma", () => {
    expect(en.telas.tarefas).not.toBe(pt.telas.tarefas)
    expect(en.telas.escritorio).not.toBe(pt.telas.escritorio)
    expect(en.telas.configuracoes).not.toBe(pt.telas.configuracoes)
    expect(en.telas.inicio).not.toBe(pt.telas.inicio)
  })

  // O teste espelhado do de cima: nome próprio traduzido é erro, não zelo.
  it("nome de produto NÃO se traduz", () => {
    expect(en.telas.neuroIa).toBe("Neuro IA")
    expect(pt.telas.neuroIa).toBe("Neuro IA")
  })

  it("\"Dashboard\" já era inglês, e segue igual nos dois", () => {
    expect(en.telas.inicioNav).toBe(pt.telas.inicioNav)
  })

  // O app chama o mesmo lugar de dois nomes (dock x título). A tradução expôs
  // isso; o teste registra que é conhecido, para não parecer descuido depois.
  it("o dashboard tem dois nomes de propósito", () => {
    expect(pt.telas.inicio).not.toBe(pt.telas.inicioNav)
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
