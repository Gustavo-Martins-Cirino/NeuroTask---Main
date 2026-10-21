import { describe, expect, it } from "vitest"
import {
  MAX_FAIXAS,
  adicionaFaixa,
  chaveDaFaixa,
  inicioDaRetomada,
  leFaixas,
  leRetomada,
  miniaturaDaFaixa,
  tituloProvisorio,
  vizinha,
  type Faixa,
} from "./fila-musica"

const V1 = "jfKfPfyJRdk"
const V2 = "5qap5aO4i9A"
const V3 = "DWcJFNfaw9c"
const f = (id: string, video: string, title = id): Faixa => ({ id, url: `https://youtu.be/${video}`, title })
const lista = [f("a", V1), f("b", V2), f("c", V3)]

describe("chaveDaFaixa", () => {
  it("o mesmo vídeo em formatos diferentes é a mesma música", () => {
    expect(chaveDaFaixa(`https://youtu.be/${V1}`)).toBe(chaveDaFaixa(`https://www.youtube.com/watch?v=${V1}&t=30s`))
    expect(chaveDaFaixa("https://www.youtube.com/playlist?list=PLabc")).toBe("l:PLabc")
    expect(chaveDaFaixa("https://evil.com")).toBeNull()
  })
})

describe("leFaixas", () => {
  it("lê o formato dos antigos favoritos sem perder nada", () => {
    const antigos = JSON.stringify([{ id: "1", url: `https://youtu.be/${V1}`, title: "Lofi" }])
    expect(leFaixas(antigos)).toEqual([{ id: "1", url: `https://youtu.be/${V1}`, title: "Lofi" }])
  })

  it("lixo, link que não é do YouTube e repetida saem; título vazio vira o link", () => {
    const bruto = JSON.stringify([
      null,
      "texto",
      { id: "1", url: "https://evil.com/x" },
      { id: "2", url: `https://youtu.be/${V1}`, title: "  " },
      { id: "3", url: `https://www.youtube.com/watch?v=${V1}`, title: "repetida" },
      { id: 4, url: `https://youtu.be/${V2}` },
    ])
    expect(leFaixas(bruto)).toEqual([{ id: "2", url: `https://youtu.be/${V1}`, title: `https://youtu.be/${V1}` }])
    expect(leFaixas("{quebrado")).toEqual([])
    expect(leFaixas(null)).toEqual([])
    expect(leFaixas(JSON.stringify({ nao: "lista" }))).toEqual([])
  })

  it("nunca passa do teto", () => {
    const muitas = Array.from({ length: 150 }, (_, i) => ({ id: String(i), url: `https://youtu.be/${String(i).padStart(11, "x")}` }))
    expect(leFaixas(JSON.stringify(muitas))).toHaveLength(MAX_FAIXAS)
  })
})

describe("adicionaFaixa", () => {
  it("entra no fim", () => {
    const r = adicionaFaixa(lista.slice(0, 2), f("c", V3))
    expect(r.faixas.map((x) => x.id)).toEqual(["a", "b", "c"])
    expect(r.jaExistia).toBeNull()
  })

  it("a mesma música não entra duas vezes: devolve a que já estava", () => {
    const r = adicionaFaixa(lista, { id: "nova", url: `https://www.youtube.com/watch?v=${V2}`, title: "x" })
    expect(r.faixas).toBe(lista)
    expect(r.jaExistia?.id).toBe("b")
  })
})

describe("vizinha", () => {
  it("anda para a frente e para trás, dando a volta", () => {
    expect(vizinha(lista, "a", 1)?.id).toBe("b")
    expect(vizinha(lista, "c", 1)?.id).toBe("a")
    expect(vizinha(lista, "a", -1)?.id).toBe("c")
  })

  it("sem atual (ou com a atual removida), começa do começo — ou do fim, voltando", () => {
    expect(vizinha(lista, null, 1)?.id).toBe("a")
    expect(vizinha(lista, "sumiu", -1)?.id).toBe("c")
  })

  it("pula as que o YouTube recusou, e desiste se todas foram recusadas", () => {
    expect(vizinha(lista, "a", 1, new Set(["b"]))?.id).toBe("c")
    expect(vizinha(lista, "a", 1, new Set(["a", "b", "c"]))).toBeNull()
  })

  it("lista de uma só volta para ela mesma; lista vazia, nada", () => {
    expect(vizinha([lista[0]], "a", 1)?.id).toBe("a")
    expect(vizinha([], null, 1)).toBeNull()
  })
})

describe("miniatura e título", () => {
  it("a capa é a miniatura do YouTube; lista sem vídeo não tem", () => {
    expect(miniaturaDaFaixa(`https://youtu.be/${V1}`)).toBe(`https://i.ytimg.com/vi/${V1}/mqdefault.jpg`)
    expect(miniaturaDaFaixa("https://www.youtube.com/playlist?list=PLabc")).toBeNull()
  })

  it("título provisório é o link colado", () => {
    expect(tituloProvisorio({ id: "1", url: "u", title: "u" })).toBe(true)
    expect(tituloProvisorio({ id: "1", url: "u", title: "Lofi" })).toBe(false)
  })
})

describe("retomada", () => {
  it("continua um pouco antes de onde parou, na mesma música", () => {
    const r = leRetomada(JSON.stringify({ id: "a", segundos: 95.7 }))
    expect(inicioDaRetomada(r, "a")).toBe(93)
    expect(inicioDaRetomada(r, "b")).toBeUndefined()
  })

  it("com poucos segundos andados, recomeça do zero", () => {
    expect(inicioDaRetomada({ id: "a", segundos: 6 }, "a")).toBeUndefined()
  })

  it("guardado torto não quebra", () => {
    expect(leRetomada("{x")).toBeNull()
    expect(leRetomada(JSON.stringify({ id: 1, segundos: 3 }))).toBeNull()
    expect(leRetomada(JSON.stringify({ id: "a", segundos: "9" }))).toBeNull()
    expect(leRetomada(null)).toBeNull()
  })
})
