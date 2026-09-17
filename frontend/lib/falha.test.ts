import { describe, it, expect } from "vitest"
import { explicaFalha, falhaPelaMensagem, falhaDaExcecao } from "./falha"

const textos = { semLuz: "Sem luz", semAgua: "Sem água", generico: "Não deu certo" }

describe("explicaFalha", () => {
  it("motivo conhecido vira a frase daquele motivo", () => {
    expect(explicaFalha({ motivo: "semLuz" }, textos)).toBe("Sem luz")
  })

  // A mensagem crua ganha do genérico de propósito: ela diz o que houve.
  it("o que ninguém previu mostra o que o banco disse", () => {
    expect(explicaFalha({ motivo: "desconhecido", cru: 'relation "x" does not exist' }, textos)).toBe(
      'relation "x" does not exist'
    )
  })

  it("sem mensagem nenhuma, o genérico", () => {
    expect(explicaFalha({ motivo: "desconhecido" }, textos)).toBe("Não deu certo")
    expect(explicaFalha({ motivo: "desconhecido", cru: "" }, textos)).toBe("Não deu certo")
  })
})

describe("falhaPelaMensagem", () => {
  const mapa = { SEM_LUZ: "semLuz", SEM_AGUA: "semAgua" } as const

  it("acha o motivo no meio da mensagem do Postgres", () => {
    expect(falhaPelaMensagem('erro na função: SEM_LUZ (hint)', mapa)).toEqual({ motivo: "semLuz" })
  })

  it("o que não está no mapa vira desconhecido, com a mensagem guardada", () => {
    const f = falhaPelaMensagem("deu ruim", mapa)
    expect(f).toEqual({ motivo: "desconhecido", cru: "deu ruim" })
  })
})

describe("falhaDaExcecao", () => {
  it("Error entrega a mensagem", () => {
    expect(falhaDaExcecao(new Error("estourou")).cru).toBe("estourou")
  })

  // `throw "texto"` e `throw {objeto}` existem: sem isto, `cru` viraria
  // "[object Object]" na tela de alguém.
  it("o que não é Error não inventa mensagem", () => {
    expect(falhaDaExcecao({ qualquer: "coisa" }).cru).toBeUndefined()
    expect(falhaDaExcecao("texto solto").cru).toBeUndefined()
  })
})
