import { describe, it, expect } from "vitest"
import {
  CONEXAO_INICIAL, FALHAS_PARA_AVISAR, aplicaPulso, deveAvisar, respostaIndicaQueda,
} from "./conexao"

const falha = (quando = 1000) => ({ ok: false, quando })
const sucesso = (quando = 1000) => ({ ok: true, quando })

describe("aplicaPulso", () => {
  it("uma falha sozinha não avisa — wi-fi trocando de antena faz isso o dia todo", () => {
    const e = aplicaPulso(CONEXAO_INICIAL, falha())
    expect(e.falhasSeguidas).toBe(1)
    expect(deveAvisar(e)).toBe(false)
  })

  it("na segunda falha seguida, avisa", () => {
    let e = CONEXAO_INICIAL
    for (let i = 0; i < FALHAS_PARA_AVISAR; i++) e = aplicaPulso(e, falha())
    expect(deveAvisar(e)).toBe(true)
  })

  it("um sucesso zera a conta — se respondeu, está lá", () => {
    let e = aplicaPulso(aplicaPulso(CONEXAO_INICIAL, falha()), falha())
    expect(deveAvisar(e)).toBe(true)
    e = aplicaPulso(e, sucesso())
    expect(e).toEqual(CONEXAO_INICIAL)
    expect(deveAvisar(e)).toBe(false)
  })

  it("guarda QUANDO a sequência começou, não a última falha", () => {
    const e = aplicaPulso(aplicaPulso(CONEXAO_INICIAL, falha(1000)), falha(9000))
    expect(e.desde).toBe(1000)
  })
})

describe("respostaIndicaQueda", () => {
  it("5xx e falha de rede contam", () => {
    expect(respostaIndicaQueda(500)).toBe(true)
    expect(respostaIndicaQueda(503)).toBe(true)
    expect(respostaIndicaQueda(0)).toBe(true) // rede caiu: não houve resposta
  })

  it("4xx NÃO conta — é o servidor funcionando e dizendo não", () => {
    // Anunciar "sem conexão" num 401 manda a pessoa reiniciar o roteador por
    // causa de uma sessão vencida.
    for (const s of [400, 401, 403, 404, 406, 409, 422]) {
      expect(respostaIndicaQueda(s)).toBe(false)
    }
  })

  it("2xx e 3xx obviamente não contam", () => {
    for (const s of [200, 201, 204, 304]) expect(respostaIndicaQueda(s)).toBe(false)
  })
})
