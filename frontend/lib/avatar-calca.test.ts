import { describe, it, expect } from "vitest"
import { corDaCalca, corDaPernaDeTras, ternoMandaNaCalca } from "./avatar-calca"

const base = { outfit: "camiseta" as const, outfitColor: "#3f6f8f", pantsColor: "#8a7a5c" }

describe("corDaCalca", () => {
  it("fora do terno, vale a cor escolhida", () => {
    expect(corDaCalca(base)).toBe("#8a7a5c")
    expect(corDaCalca({ ...base, outfit: "moletom" })).toBe("#8a7a5c")
    expect(corDaCalca({ ...base, outfit: "jaqueta" })).toBe("#8a7a5c")
  })

  it("no terno, a calça sai do paletó — traje é uma peça só", () => {
    const calca = corDaCalca({ ...base, outfit: "terno", outfitColor: "#4a5568" })
    expect(calca).not.toBe("#8a7a5c") // a escolhida não manda aqui
    expect(calca).not.toBe("#4a5568") // e não é igual ao paletó: é mais escura
  })

  it("no terno, mudar o paletó muda a calça junto", () => {
    const a = corDaCalca({ ...base, outfit: "terno", outfitColor: "#4a5568" })
    const b = corDaCalca({ ...base, outfit: "terno", outfitColor: "#7a4a8f" })
    expect(a).not.toBe(b)
  })

  it("cor estragada cai no azul de sempre, não em preto por acidente", () => {
    for (const ruim of ["", "azul", "#xyz", "#12345"]) {
      expect(corDaCalca({ ...base, pantsColor: ruim })).toBe("#3b5378")
    }
  })

  it("sempre devolve um hex de seis dígitos", () => {
    for (const outfit of ["camiseta", "moletom", "jaqueta", "terno"] as const) {
      expect(corDaCalca({ ...base, outfit })).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe("ternoMandaNaCalca", () => {
  it("só o terno manda", () => {
    expect(ternoMandaNaCalca("terno")).toBe(true)
    for (const o of ["camiseta", "moletom", "jaqueta", null, undefined]) {
      expect(ternoMandaNaCalca(o)).toBe(false)
    }
  })
})

describe("corDaPernaDeTras", () => {
  it("é sombra da frente, nunca uma segunda cor guardada", () => {
    // Foi assim que nasceram os dois azuis que não combinavam.
    const frente = "#8a7a5c"
    const tras = corDaPernaDeTras(frente)
    expect(tras).not.toBe(frente)
    expect(tras).toMatch(/^#[0-9a-f]{6}$/)
  })

  it("mudar a frente muda a de trás junto", () => {
    expect(corDaPernaDeTras("#3b5378")).not.toBe(corDaPernaDeTras("#8a7a5c"))
  })

  it("cor escura não estoura para baixo", () => {
    expect(corDaPernaDeTras("#000000")).toBe("#000000")
  })
})
