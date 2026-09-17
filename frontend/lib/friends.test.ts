import { describe, it, expect } from "vitest"
import { explicaFalha } from "./friends"
import { pt, en } from "./i18n"

// O módulo devolve id; o dicionário devolve texto. O que estes testes seguram é
// a costura entre os dois: um id que o dicionário não conhece não existe (o
// TypeScript barra), mas um dicionário que responde a mesma coisa nos dois
// idiomas passaria batido — e é exatamente o defeito que a tradução vem corrigir.

describe("explicaFalha", () => {
  it("cada motivo se diz diferente em cada idioma", () => {
    const motivos = Object.keys(pt.amigos.erros) as (keyof typeof pt.amigos.erros)[]
    expect(motivos.length).toBeGreaterThan(10)
    for (const motivo of motivos) {
      expect(en.amigos.erros[motivo], motivo).not.toBe(pt.amigos.erros[motivo])
    }
  })

  it("motivo conhecido vira a frase do idioma", () => {
    expect(explicaFalha({ motivo: "voceMesmo" }, pt.amigos.erros)).toBe(pt.amigos.erros.voceMesmo)
    expect(explicaFalha({ motivo: "voceMesmo" }, en.amigos.erros)).toBe(en.amigos.erros.voceMesmo)
  })

  // Mensagem crua do Postgres ganha do texto genérico de propósito: ela é feia,
  // mas diz o que houve. O genérico é para quando nem isso existe.
  it("o que ninguém previu mostra o que o banco disse", () => {
    expect(explicaFalha({ motivo: "desconhecido", cru: 'relation "x" does not exist' }, pt.amigos.erros)).toBe(
      'relation "x" does not exist'
    )
  })

  it("sem mensagem nenhuma, o genérico do idioma", () => {
    expect(explicaFalha({ motivo: "desconhecido" }, en.amigos.erros)).toBe(en.amigos.erros.generico)
    expect(explicaFalha({ motivo: "desconhecido", cru: "" }, pt.amigos.erros)).toBe(pt.amigos.erros.generico)
  })
})
