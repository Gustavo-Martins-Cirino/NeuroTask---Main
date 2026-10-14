import { describe, expect, it } from "vitest"
import { MIN_SENHA, faltaNaSenha } from "./regra-senha"

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
