import { describe, expect, it } from "vitest"
import { graduou, leContagem, serializaContagem } from "./comece-por-aqui"

describe("graduou", () => {
  it("só com os três passos feitos", () => {
    expect(graduou({ tasks: 3, done: 1, blocks: 2 })).toBe(true)
    expect(graduou({ tasks: 3, done: 0, blocks: 2 })).toBe(false)
    expect(graduou({ tasks: 0, done: 0, blocks: 0 })).toBe(false)
  })
})

describe("leContagem", () => {
  it("ida e volta", () => {
    const c = { tasks: 2, done: 0, blocks: 1 }
    expect(leContagem(serializaContagem(c))).toEqual(c)
  })

  it("nada guardado é null — e o card espera a consulta, como antes", () => {
    expect(leContagem(null)).toBeNull()
    expect(leContagem("")).toBeNull()
  })

  it("guardado torto não desenha card errado", () => {
    expect(leContagem("{quebrado")).toBeNull()
    expect(leContagem(JSON.stringify({ tasks: "2", done: 0, blocks: 0 }))).toBeNull()
    expect(leContagem(JSON.stringify({ tasks: -1, done: 0, blocks: 0 }))).toBeNull()
    expect(leContagem(JSON.stringify({ tasks: 1.5, done: 0, blocks: 0 }))).toBeNull()
    expect(leContagem("null")).toBeNull()
  })
})
