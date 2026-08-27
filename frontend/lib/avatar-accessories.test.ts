import { describe, it, expect } from "vitest"
import { acessoriosEquipados } from "./avatar-accessories"
import { CATALOG } from "./shop"

describe("acessoriosEquipados", () => {
  it("sem nada equipado devolve objeto vazio", () => {
    expect(acessoriosEquipados()).toEqual({})
    expect(acessoriosEquipados(null)).toEqual({})
    expect(acessoriosEquipados(new Set())).toEqual({})
  })

  it("ignora itens que não são acessórios", () => {
    expect(acessoriosEquipados(new Set(["tapete", "planta-grande", "setup-duplo"]))).toEqual({})
  })

  it("reconhece cada chapéu", () => {
    expect(acessoriosEquipados(["chapeu-bone"]).chapeu).toBe("bone")
    expect(acessoriosEquipados(["chapeu-social"]).chapeu).toBe("social")
    expect(acessoriosEquipados(["chapeu-coroa"]).chapeu).toBe("coroa")
    expect(acessoriosEquipados(["chapeu-gorro"]).chapeu).toBe("gorro")
    expect(acessoriosEquipados(["chapeu-capuz"]).chapeu).toBe("capuz")
    expect(acessoriosEquipados(["chapeu-aureola"]).chapeu).toBe("aureola")
  })

  it("todo chapéu do catálogo da loja tem tradução aqui", () => {
    // Sem isto, um item novo é comprável e simplesmente não aparece na cabeça —
    // e o erro não faz barulho nenhum.
    for (const item of CATALOG.filter((i) => i.category === "chapeu")) {
      expect(acessoriosEquipados([item.id]).chapeu).toBeDefined()
    }
    for (const item of CATALOG.filter((i) => i.category === "oculos")) {
      expect(acessoriosEquipados([item.id]).oculos).toBeDefined()
    }
  })

  it("reconhece cada óculos", () => {
    expect(acessoriosEquipados(["oculos-grau"]).oculos).toBe("grau")
    expect(acessoriosEquipados(["oculos-escuros"]).oculos).toBe("escuros")
  })

  it("chapéu e óculos são slots independentes — cabem juntos", () => {
    expect(acessoriosEquipados(["chapeu-coroa", "oculos-escuros"])).toEqual({
      chapeu: "coroa",
      oculos: "escuros",
    })
  })

  it("com dois itens do mesmo slot (dado inconsistente) escolhe um só", () => {
    const a = acessoriosEquipados(["chapeu-social", "chapeu-bone"])
    expect(a.chapeu).toBe("bone")
    const b = acessoriosEquipados(["oculos-escuros", "oculos-grau"])
    expect(b.oculos).toBe("grau")
  })

  it("aceita array além de Set", () => {
    expect(acessoriosEquipados(["chapeu-bone"])).toEqual({ chapeu: "bone" })
  })
})
