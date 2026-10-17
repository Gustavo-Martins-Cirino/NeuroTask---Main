import { describe, expect, it } from "vitest"
import { chamadasRecusadas } from "./ia-resgate"

describe("chamadasRecusadas", () => {
  it("os dois formatos que o Groq devolve", () => {
    expect(chamadasRecusadas('<function=create_task>{"title":"Pão"}</function>')).toEqual([
      { nome: "create_task", json: '{"title":"Pão"}' },
    ])
    expect(chamadasRecusadas('<function=create_task({"title":"Pão"})</function>')).toEqual([
      { nome: "create_task", json: '{"title":"Pão"}' },
    ])
    expect(chamadasRecusadas('<function=create_task > \n {"a":1} \n </function>')).toEqual([
      { nome: "create_task", json: '{"a":1}' },
    ])
  })

  it("várias chamadas em sequência, e JSON com chaves aninhadas inteiro", () => {
    const texto =
      'ok <function=a>{"x":{"y":1}}</function> e <function=b>{"z":2}</function>'
    expect(chamadasRecusadas(texto)).toEqual([
      { nome: "a", json: '{"x":{"y":1}}' },
      { nome: "b", json: '{"z":2}' },
    ])
  })

  it("abertura dentro do miolo de outra não vira chamada a mais", () => {
    const texto = '<function=a>{"t":"<function=b>"}</function>'
    expect(chamadasRecusadas(texto)).toEqual([{ nome: "a", json: '{"t":"<function=b>"}' }])
  })

  it("sem fechamento ou sem JSON, nada", () => {
    expect(chamadasRecusadas('<function=a>{"x":1}')).toEqual([])
    expect(chamadasRecusadas("<function=a>sem json</function>")).toEqual([])
    expect(chamadasRecusadas("texto comum")).toEqual([])
  })

  it("linear: o texto que travava a regex antiga por 28 s passa na hora", () => {
    const venenos = [
      "<function=a" + " ".repeat(20_000) + "x",
      "<function=a>" + "{".repeat(20_000) + "x",
      ("<function=a" + " ".repeat(50)).repeat(500) + "</function>",
    ]
    for (const veneno of venenos) {
      const t = performance.now()
      chamadasRecusadas(veneno)
      expect(performance.now() - t).toBeLessThan(50)
    }
  })
})
