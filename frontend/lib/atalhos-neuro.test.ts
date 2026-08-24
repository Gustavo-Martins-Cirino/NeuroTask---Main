import { describe, expect, it } from "vitest"
import {
  ATALHOS_PADRAO,
  CHAVE_ATALHOS,
  MAX_ATALHOS,
  MAX_CARACTERES,
  ehPadrao,
  leAtalhos,
  podeAdicionar,
  saneiaAtalhos,
} from "./atalhos-neuro"

describe("ATALHOS_PADRAO", () => {
  it("cabe no teto e não tem texto vazio", () => {
    expect(ATALHOS_PADRAO.length).toBeGreaterThan(0)
    expect(ATALHOS_PADRAO.length).toBeLessThanOrEqual(MAX_ATALHOS)
    for (const a of ATALHOS_PADRAO) expect(a.trim()).toBeTruthy()
  })

  it("já está saneado — senão o padrão mudaria só de passar pela leitura", () => {
    expect(saneiaAtalhos(ATALHOS_PADRAO)).toEqual(ATALHOS_PADRAO)
  })
})

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
    expect(leAtalhos({})).toEqual(ATALHOS_PADRAO)
    expect(leAtalhos(null)).toEqual(ATALHOS_PADRAO)
    expect(leAtalhos(undefined)).toEqual(ATALHOS_PADRAO)
  })

  it("quem apagou todos recebe nada — os padrões não renascem sozinhos", () => {
    expect(leAtalhos({ [CHAVE_ATALHOS]: [] })).toEqual([])
  })

  it("devolve o que foi salvo, já saneado", () => {
    expect(leAtalhos({ [CHAVE_ATALHOS]: ["  meu  ", "", "meu"] })).toEqual(["meu"])
  })

  it("metadata corrompido cai no padrão em vez de quebrar a tela", () => {
    expect(leAtalhos({ [CHAVE_ATALHOS]: "não é lista" })).toEqual(ATALHOS_PADRAO)
  })

  it("não devolve a mesma referência do padrão — quem editar não muda a constante", () => {
    const lidos = leAtalhos({})
    lidos.push("novo")
    expect(ATALHOS_PADRAO).toHaveLength(4)
  })
})

describe("ehPadrao", () => {
  it("reconhece o padrão", () => {
    expect(ehPadrao([...ATALHOS_PADRAO])).toBe(true)
  })

  it("qualquer diferença já não é padrão", () => {
    expect(ehPadrao(ATALHOS_PADRAO.slice(0, 3))).toBe(false)
    expect(ehPadrao([...ATALHOS_PADRAO].reverse())).toBe(false)
    expect(ehPadrao([])).toBe(false)
  })
})

describe("podeAdicionar", () => {
  it("deixa até o teto", () => {
    expect(podeAdicionar([])).toBe(true)
    expect(podeAdicionar(Array.from({ length: MAX_ATALHOS - 1 }, () => "a"))).toBe(true)
    expect(podeAdicionar(Array.from({ length: MAX_ATALHOS }, () => "a"))).toBe(false)
  })
})
