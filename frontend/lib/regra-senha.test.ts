import { describe, expect, it } from "vitest"
import { MIN_SENHA, REQUISITOS_SENHA, faltaNaSenha, requisitosDaSenha } from "./regra-senha"

describe("faltaNaSenha", () => {
  it("passa com 8 caracteres, letra e número", () => {
    expect(faltaNaSenha("abcdefg1")).toBeNull()
    expect(faltaNaSenha("Neuro2026!")).toBeNull()
  })

  it("curta vem antes do resto: é a primeira coisa a corrigir", () => {
    expect(MIN_SENHA).toBe(8)
    expect(faltaNaSenha("")).toBe("curta")
    expect(faltaNaSenha("abc123")).toBe("curta")
    expect(faltaNaSenha("abcdef1")).toBe("curta")
  })

  it("sem letra", () => {
    expect(faltaNaSenha("12345678")).toBe("semLetra")
    expect(faltaNaSenha("1234!@#$%")).toBe("semLetra")
  })

  it("letra acentuada sozinha não conta — o Supabase só conta a-z e A-Z", () => {
    expect(faltaNaSenha("ççççãã12")).toBe("semLetra")
    expect(faltaNaSenha("ççççãa12")).toBeNull()
  })

  it("sem número", () => {
    expect(faltaNaSenha("abcdefgh")).toBe("semNumero")
    expect(faltaNaSenha("SenhaForte!")).toBe("semNumero")
  })
})

describe("requisitosDaSenha", () => {
  it("vazia: nenhum cumprido", () => {
    expect(requisitosDaSenha("")).toEqual({ tamanho: false, letra: false, numero: false })
  })

  it("cada requisito acende sozinho, sem depender dos outros", () => {
    expect(requisitosDaSenha("a")).toEqual({ tamanho: false, letra: true, numero: false })
    expect(requisitosDaSenha("1")).toEqual({ tamanho: false, letra: false, numero: true })
    expect(requisitosDaSenha("!!!!!!!!")).toEqual({ tamanho: true, letra: false, numero: false })
  })

  it("todos cumpridos com 8 caracteres, letra e número", () => {
    expect(requisitosDaSenha("abcdefg1")).toEqual({ tamanho: true, letra: true, numero: true })
  })

  it("lista e trava do envio nunca discordam", () => {
    for (const senha of ["", "a", "1", "abc123", "abcdefgh", "12345678", "ççççãã12", "abcdefg1", "Neuro2026!"]) {
      const todos = REQUISITOS_SENHA.every((r) => requisitosDaSenha(senha)[r])
      expect(todos).toBe(faltaNaSenha(senha) === null)
    }
  })

  it("a ordem da lista é tamanho, letra, número", () => {
    expect(REQUISITOS_SENHA).toEqual(["tamanho", "letra", "numero"])
  })
})
