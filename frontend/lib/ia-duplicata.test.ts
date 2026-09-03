import { describe, it, expect } from "vitest"
import { diaLocal, ehDuplicata, ehMesmoTitulo, normalizaTitulo } from "./ia-duplicata"

const BRASIL = 180 // UTC−3

describe("normalizaTitulo", () => {
  it("tira acento, pontuação e espaço sobrando", () => {
    expect(normalizaTitulo("  Reunião,  com o   CLIENTE! ")).toBe("reuniao com o cliente")
  })

  it("o que não é texto vira vazio, sem quebrar", () => {
    for (const v of [null, undefined, 42, {}]) expect(normalizaTitulo(v)).toBe(normalizaTitulo(String(v ?? "")))
    expect(normalizaTitulo(null)).toBe("")
  })
})

describe("ehMesmoTitulo", () => {
  it("igual de verdade é o mesmo, com ou sem acento e pontuação", () => {
    expect(ehMesmoTitulo("Academia", "academia")).toBe(true)
    expect(ehMesmoTitulo("Reunião!", "reuniao")).toBe(true)
  })

  it("erro de digitação continua sendo o mesmo — era o ponto da regra antiga", () => {
    expect(ehMesmoTitulo("estudar mate", "estudar matem")).toBe(true)
    expect(ehMesmoTitulo("comprar pao", "comprar paoo")).toBe(true)
  })

  it("abaixo do piso de tamanho, só igualdade vale", () => {
    // Achado ao escrever isto: o comentário da regra antiga dizia pegar
    // "manhã" vs "manhão", mas o piso de 6 caracteres já barrava esse par —
    // ela nunca fez o que o próprio comentário afirmava.
    expect(ehMesmoTitulo("manhã", "manhão")).toBe(false)
    expect(ehMesmoTitulo("manhã", "manha")).toBe(true)
  })

  it("ESPECIALIZAR não é duplicar — o bug que a IA cometia", () => {
    // Existindo o primeiro, pedir o segundo era recusado: "já existe uma
    // parecida". A pessoa pedia e nada era criado.
    expect(ehMesmoTitulo("Estudar", "Estudar three.js")).toBe(false)
    expect(ehMesmoTitulo("Reunião", "Reunião com o cliente")).toBe(false)
    expect(ehMesmoTitulo("Comprar pão", "Comprar pão integral na padaria")).toBe(false)
  })

  it("título curto não vira coringa", () => {
    // "ir" dentro de "ir ao mercado" não pode contar como o mesmo.
    expect(ehMesmoTitulo("ir", "ir ao mercado")).toBe(false)
    expect(ehMesmoTitulo("ir", "ir")).toBe(true) // igual continua igual
  })

  it("vazio não é igual a nada, nem a outro vazio", () => {
    expect(ehMesmoTitulo("", "")).toBe(false)
    expect(ehMesmoTitulo("   ", "academia")).toBe(false)
    expect(ehMesmoTitulo(null, undefined)).toBe(false)
  })

  it("títulos diferentes seguem diferentes", () => {
    expect(ehMesmoTitulo("Academia", "Mercado")).toBe(false)
  })
})

describe("diaLocal", () => {
  it("é o dia de QUEM USA, não o do servidor", () => {
    // 02:00 UTC de 29/08 ainda é 23:00 de 28/08 no Brasil.
    expect(diaLocal("2026-08-29T02:00:00.000Z", BRASIL)).toBe("2026-08-28")
    expect(diaLocal("2026-08-29T02:00:00.000Z", 0)).toBe("2026-08-29")
  })

  it("sem prazo é null, e data impossível também", () => {
    for (const v of [null, undefined, "", "não é data", 42]) {
      expect(diaLocal(v, BRASIL)).toBeNull()
    }
  })
})

describe("ehDuplicata", () => {
  const tarefa = (title: string, due_date?: string | null) => ({ title, due_date })

  it("mesmo título no mesmo dia é duplicata", () => {
    expect(ehDuplicata(
      tarefa("Academia", "2026-08-28T11:00:00.000Z"),
      tarefa("academia", "2026-08-28T22:00:00.000Z"),
      BRASIL
    )).toBe(true)
  })

  it("mesmo título em DIAS diferentes não é — rotina é isso", () => {
    // "Academia" de terça não pode bloquear "Academia" de quinta.
    expect(ehDuplicata(
      tarefa("Academia", "2026-08-28T11:00:00.000Z"),
      tarefa("Academia", "2026-08-30T11:00:00.000Z"),
      BRASIL
    )).toBe(false)
  })

  it("duas soltas iguais são duplicata", () => {
    expect(ehDuplicata(tarefa("Comprar pão"), tarefa("comprar pao"), BRASIL)).toBe(true)
  })

  it("agendar o que estava solto NÃO é duplicar", () => {
    // Existe "Academia" sem prazo; pedir "Academia amanhã às 8h" é dar horário
    // a ela. Recusar aqui deixaria a pessoa sem o horário que acabou de pedir.
    expect(ehDuplicata(
      tarefa("Academia", "2026-08-29T11:00:00.000Z"),
      tarefa("Academia", null),
      BRASIL
    )).toBe(false)
  })

  it("título diferente nunca é duplicata, mesmo no mesmo dia", () => {
    expect(ehDuplicata(
      tarefa("Academia", "2026-08-28T11:00:00.000Z"),
      tarefa("Mercado", "2026-08-28T11:00:00.000Z"),
      BRASIL
    )).toBe(false)
  })

  it("a virada do dia é a de quem usa", () => {
    // 23:00 e 01:00 do Brasil são dias diferentes, mesmo caindo no mesmo dia UTC.
    expect(ehDuplicata(
      tarefa("Estudar", "2026-08-29T02:00:00.000Z"), // 23:00 de 28/08 no Brasil
      tarefa("Estudar", "2026-08-29T04:00:00.000Z"), // 01:00 de 29/08 no Brasil
      BRASIL
    )).toBe(false)
  })
})
