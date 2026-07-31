import { describe, it, expect } from "vitest"
import { parseCommand, textoParaTarefa } from "./telegram-commands"

// O parser decide o que a mensagem de alguém vira. Errar aqui significa criar
// tarefa errada na conta da pessoa — e ela nem sabe por quê.

describe("textoParaTarefa", () => {
  it("mensagem de uma linha vira tarefa sem descrição", () => {
    expect(textoParaTarefa("comprar pão")).toEqual({
      title: "comprar pão",
      description: null,
    })
  })

  it("primeira linha é o título, o resto é a descrição", () => {
    expect(textoParaTarefa("Ligar pro dentista\nperguntar do convênio\ne remarcar")).toEqual({
      title: "Ligar pro dentista",
      description: "perguntar do convênio\ne remarcar",
    })
  })

  it("ignora linhas em branco antes do título", () => {
    expect(textoParaTarefa("\n\n  Estudar cálculo  \ncapítulo 3")).toEqual({
      title: "Estudar cálculo",
      description: "capítulo 3",
    })
  })

  it("colapsa espaços repetidos no título", () => {
    expect(textoParaTarefa("fazer     compras")?.title).toBe("fazer compras")
  })

  it("texto vazio ou só espaço não vira tarefa", () => {
    expect(textoParaTarefa("")).toBeNull()
    expect(textoParaTarefa("   \n  \n ")).toBeNull()
  })

  it("corta título em 200 caracteres", () => {
    const t = textoParaTarefa("a".repeat(500))
    expect(t?.title).toHaveLength(200)
  })
})

describe("parseCommand", () => {
  it("mensagem comum vira tarefa", () => {
    expect(parseCommand("pagar boleto")).toEqual({
      kind: "task",
      title: "pagar boleto",
      description: null,
    })
  })

  it("nulo, indefinido e vazio caem em empty", () => {
    expect(parseCommand(null).kind).toBe("empty")
    expect(parseCommand(undefined).kind).toBe("empty")
    expect(parseCommand("   ").kind).toBe("empty")
  })

  it("/start carrega o código de pareamento", () => {
    expect(parseCommand("/start 123456")).toEqual({ kind: "start", code: "123456" })
  })

  it("/start sem código não inventa um", () => {
    expect(parseCommand("/start")).toEqual({ kind: "start", code: undefined })
  })

  it("/start pega só o primeiro token como código", () => {
    expect(parseCommand("/start 123456 lixo")).toEqual({ kind: "start", code: "123456" })
  })

  it("sufixo @bot é ignorado (grupos mandam assim)", () => {
    expect(parseCommand("/hoje@NeuroTaskBot").kind).toBe("today")
    expect(parseCommand("/start@NeuroTaskBot 999888")).toEqual({
      kind: "start",
      code: "999888",
    })
  })

  it("comando é case-insensitive", () => {
    expect(parseCommand("/HOJE").kind).toBe("today")
    expect(parseCommand("/Ajuda").kind).toBe("help")
  })

  it("aceita os apelidos de cada comando", () => {
    expect(parseCommand("/ajuda").kind).toBe("help")
    expect(parseCommand("/help").kind).toBe("help")
    expect(parseCommand("/sair").kind).toBe("unlink")
    expect(parseCommand("/stop").kind).toBe("unlink")
    expect(parseCommand("/desconectar").kind).toBe("unlink")
  })

  it("/tarefa cria a partir do argumento", () => {
    expect(parseCommand("/tarefa Comprar leite\nna volta do trabalho")).toEqual({
      kind: "task",
      title: "Comprar leite",
      description: "na volta do trabalho",
    })
  })

  it("/tarefa sem texto vira ajuda, não tarefa vazia", () => {
    expect(parseCommand("/tarefa").kind).toBe("help")
    expect(parseCommand("/tarefa    ").kind).toBe("help")
  })

  it("comando desconhecido vira ajuda", () => {
    expect(parseCommand("/inventado").kind).toBe("help")
  })

  it("barra no meio do texto não é comando", () => {
    expect(parseCommand("comprar 1/2 kg de pão")).toEqual({
      kind: "task",
      title: "comprar 1/2 kg de pão",
      description: null,
    })
  })
})
