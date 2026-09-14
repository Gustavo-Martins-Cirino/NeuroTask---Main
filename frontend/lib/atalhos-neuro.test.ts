import { describe, expect, it } from "vitest"
import {
  CHAVE_ATALHOS,
  MAX_ATALHOS,
  MAX_CARACTERES,
  ehPadrao,
  leAtalhos,
  podeAdicionar,
  saneiaAtalhos,
} from "./atalhos-neuro"

// Os quatro textos-padrão de verdade moram no dicionário (lib/i18n.ts,
// Dicionario.ia.atalhosPadrao) — este módulo só testa a REGRA, com um padrão
// de mentira que serve para qualquer idioma.
const PADRAO_TESTE = ["um", "dois", "três", "quatro"]

describe("saneiaAtalhos", () => {
  it("tira espaço sobrando das pontas", () => {
    expect(saneiaAtalhos(["  oi  "])).toEqual(["oi"])
  })

  it("descarta vazio e o que só tem espaço", () => {
    expect(saneiaAtalhos(["", "   ", "vale"])).toEqual(["vale"])
  })

  it("junta quebra de linha e espaço repetido num espaço só", () => {
    expect(saneiaAtalhos(["a\n\nb   c"])).toEqual(["a b c"])
  })

  it("corta no limite de caracteres", () => {
    const longo = "x".repeat(MAX_CARACTERES + 40)
    expect(saneiaAtalhos([longo])[0]).toHaveLength(MAX_CARACTERES)
  })

  it("descarta repetido sem olhar a caixa, mantendo o primeiro", () => {
    expect(saneiaAtalhos(["Foco", "foco", "FOCO"])).toEqual(["Foco"])
  })

  it("para no teto de atalhos", () => {
    const muitos = Array.from({ length: MAX_ATALHOS + 5 }, (_, i) => `a${i}`)
    expect(saneiaAtalhos(muitos)).toHaveLength(MAX_ATALHOS)
  })

  it("ignora o que não é texto", () => {
    expect(saneiaAtalhos([1, null, {}, "ok", undefined])).toEqual(["ok"])
  })

  it("devolve vazio para o que não é lista", () => {
    expect(saneiaAtalhos(null)).toEqual([])
    expect(saneiaAtalhos("texto")).toEqual([])
    expect(saneiaAtalhos(undefined)).toEqual([])
  })
})

describe("leAtalhos", () => {
  it("quem nunca mexeu recebe os padrões", () => {
    expect(leAtalhos({}, PADRAO_TESTE)).toEqual(PADRAO_TESTE)
    expect(leAtalhos(null, PADRAO_TESTE)).toEqual(PADRAO_TESTE)
    expect(leAtalhos(undefined, PADRAO_TESTE)).toEqual(PADRAO_TESTE)
  })

  it("quem apagou todos recebe nada — os padrões não renascem sozinhos", () => {
    expect(leAtalhos({ [CHAVE_ATALHOS]: [] }, PADRAO_TESTE)).toEqual([])
  })

  it("devolve o que foi salvo, já saneado", () => {
    expect(leAtalhos({ [CHAVE_ATALHOS]: ["  meu  ", "", "meu"] }, PADRAO_TESTE)).toEqual(["meu"])
  })

  it("metadata corrompido cai no padrão em vez de quebrar a tela", () => {
    expect(leAtalhos({ [CHAVE_ATALHOS]: "não é lista" }, PADRAO_TESTE)).toEqual(PADRAO_TESTE)
  })

  it("não devolve a mesma referência do padrão — quem editar não muda a constante", () => {
    const lidos = leAtalhos({}, PADRAO_TESTE)
    lidos.push("novo")
    expect(PADRAO_TESTE).toHaveLength(4)
  })
})

describe("ehPadrao", () => {
  it("reconhece o padrão", () => {
    expect(ehPadrao([...PADRAO_TESTE], PADRAO_TESTE)).toBe(true)
  })

  it("qualquer diferença já não é padrão", () => {
    expect(ehPadrao(PADRAO_TESTE.slice(0, 3), PADRAO_TESTE)).toBe(false)
    expect(ehPadrao([...PADRAO_TESTE].reverse(), PADRAO_TESTE)).toBe(false)
    expect(ehPadrao([], PADRAO_TESTE)).toBe(false)
  })
})

describe("podeAdicionar", () => {
  it("deixa até o teto", () => {
    expect(podeAdicionar([])).toBe(true)
    expect(podeAdicionar(Array.from({ length: MAX_ATALHOS - 1 }, () => "a"))).toBe(true)
    expect(podeAdicionar(Array.from({ length: MAX_ATALHOS }, () => "a"))).toBe(false)
  })
})
