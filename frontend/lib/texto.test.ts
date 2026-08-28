import { describe, it, expect } from "vitest"
import { maiusculaInicial } from "./texto"

describe("maiusculaInicial", () => {
  it("sobe só a primeira letra da data, não cada palavra", () => {
    // Era exatamente o que o `capitalize` do CSS fazia errado.
    expect(maiusculaInicial("sexta-feira, 28 de agosto")).toBe("Sexta-feira, 28 de agosto")
    expect(maiusculaInicial("agosto de 2026")).toBe("Agosto de 2026")
    expect(maiusculaInicial("sex., 28 de ago.")).toBe("Sex., 28 de ago.")
  })

  it("não mexe em quem já começa maiúsculo", () => {
    expect(maiusculaInicial("Agosto de 2026")).toBe("Agosto de 2026")
  })

  it("acento na primeira letra sobe junto", () => {
    expect(maiusculaInicial("às 10h")).toBe("Às 10h")
  })

  it("começando com número, nada muda — é o intervalo da semana", () => {
    expect(maiusculaInicial("24 ago. - 30 ago.")).toBe("24 ago. - 30 ago.")
  })

  it("texto vazio continua vazio", () => {
    expect(maiusculaInicial("")).toBe("")
  })
})
