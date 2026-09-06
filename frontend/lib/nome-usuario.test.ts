import { describe, it, expect } from "vitest"
import { nomeDeExibicao, primeiroNome } from "./nome-usuario"

describe("nomeDeExibicao", () => {
  it("quem entrou pelo Google tem full_name, e ele é usado", () => {
    // Era o bug: sem ler `full_name`, a saudação caía no e-mail e dizia
    // "Boa tarde, pai" para alguém chamado Carlos.
    expect(nomeDeExibicao({ full_name: "Carlos Cirino" }, "pai@exemplo.com")).toBe("Carlos Cirino")
  })

  it("quem se cadastrou por e-mail tem name, e ele é usado", () => {
    expect(nomeDeExibicao({ name: "Gustavo" }, "gustavo@exemplo.com")).toBe("Gustavo")
  })

  it("o nome ESCOLHIDO vence o do provedor", () => {
    // Quem editou nas Configurações quer aquele nome. Na ordem inversa, a
    // edição não surtiria efeito nenhum para quem veio do Google.
    expect(nomeDeExibicao({ name: "Cadu", full_name: "Carlos Cirino" }, "c@e.com")).toBe("Cadu")
  })

  it("sem nome nenhum, sobra o pedaço antes do @", () => {
    expect(nomeDeExibicao({}, "gustavo.cirino@exemplo.com")).toBe("gustavo.cirino")
  })

  it("nome só com espaços não conta como nome", () => {
    expect(nomeDeExibicao({ name: "   ", full_name: "Carlos" }, "x@y.com")).toBe("Carlos")
  })

  it("sem nada, devolve vazio em vez de quebrar", () => {
    expect(nomeDeExibicao(null, null)).toBe("")
    expect(nomeDeExibicao(undefined, undefined)).toBe("")
    expect(nomeDeExibicao({ name: 42 as unknown as string }, "")).toBe("")
  })
})

describe("primeiroNome", () => {
  it("corta no primeiro espaço — é o que cabe numa saudação", () => {
    expect(primeiroNome({ full_name: "Maria Fernanda de Albuquerque" }, "m@e.com")).toBe("Maria")
  })

  it("nome de uma palavra continua inteiro", () => {
    expect(primeiroNome({ name: "Gustavo" }, "g@e.com")).toBe("Gustavo")
  })

  it("sem nome, devolve vazio", () => {
    expect(primeiroNome({}, "")).toBe("")
  })
})
