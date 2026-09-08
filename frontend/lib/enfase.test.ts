import { describe, it, expect } from "vitest"
import { isValidElement, type ReactElement } from "react"
import { enfatizar, semMarcas } from "./enfase"

// A ênfase viaja dentro da frase traduzida. O que não pode acontecer, nunca, é
// a marca vazar para a tela — nem quando a frase vem malformada.

// Lê a árvore devolvida sem montar React: o que interessa é quais pedaços
// viraram <strong> e se algum "§" sobreviveu.
function partes(no: ReturnType<typeof enfatizar>): { texto: string; forte: boolean }[] {
  if (typeof no === "string") return [{ texto: no, forte: false }]
  const lista = Array.isArray(no) ? no : [no]
  return lista.filter(isValidElement).map((el) => {
    const e = el as ReactElement<{ children?: string }>
    return { texto: String(e.props.children ?? ""), forte: e.type === "strong" }
  })
}

const texto = (frase: string) => partes(enfatizar(frase)).map((p) => p.texto).join("")
const fortes = (frase: string) => partes(enfatizar(frase)).filter((p) => p.forte).map((p) => p.texto)

describe("enfatizar", () => {
  it("frase sem marca volta como está", () => {
    expect(enfatizar("Nada para destacar")).toBe("Nada para destacar")
  })

  it("o trecho entre marcas vira negrito", () => {
    expect(fortes("Você fez §Academia§ em 3 dias")).toEqual(["Academia"])
  })

  it("aguenta mais de um destaque na mesma frase", () => {
    expect(fortes("Em §Café§ você leva ~§10 min§ na prática")).toEqual(["Café", "10 min"])
  })

  it("a marca nunca sobra no texto exibido", () => {
    expect(texto("Você fez §Academia§ em 3 dias")).not.toContain("§")
    expect(texto("§a§b§c§")).not.toContain("§")
  })

  it("o texto visível é o mesmo, tirando as marcas", () => {
    expect(texto("Em §Café§ você leva ~§10 min§ na prática")).toBe("Em Café você leva ~10 min na prática")
  })

  it("marca ímpar (frase malformada) mostra tudo, sem quebrar", () => {
    // Texto certo sem negrito é melhor que exceção numa tela.
    expect(texto("Você fez §Academia em 3 dias")).toBe("Você fez Academia em 3 dias")
  })

  it("frase vazia não explode", () => {
    expect(enfatizar("")).toBe("")
  })
})

describe("semMarcas", () => {
  it("tira as marcas para usar em title/aria-label", () => {
    expect(semMarcas("Em §Café§ você leva ~§10 min§")).toBe("Em Café você leva ~10 min")
  })

  it("frase sem marca fica intacta", () => {
    expect(semMarcas("Sem marca nenhuma")).toBe("Sem marca nenhuma")
  })
})
