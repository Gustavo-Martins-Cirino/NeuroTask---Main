import { describe, expect, it } from "vitest"
import {
  MINUTOS_POR_BLOCO,
  XP_POR_BLOCO,
  bonusDaTarefa,
  dobraATarefa,
  funcaoAusente,
  leRespostaDoFoco,
  segundosFocados,
  xpAPagar,
} from "./foco-pontos"

const min = (m: number) => m * 60

describe("segundosFocados", () => {
  it("é o quanto o timer já andou", () => {
    expect(segundosFocados(0, min(25), min(20))).toBe(min(5))
  })

  it("soma o que andou antes de recomeçar", () => {
    expect(segundosFocados(min(7), min(25), min(25))).toBe(min(7))
    expect(segundosFocados(min(7), min(25), min(22))).toBe(min(10))
  })

  it("nunca dá negativo, nem com número torto", () => {
    expect(segundosFocados(-30, min(25), min(30))).toBe(0)
  })
})

describe("xpAPagar", () => {
  it("nada antes do primeiro bloco fechar", () => {
    expect(xpAPagar(min(MINUTOS_POR_BLOCO) - 1, 0)).toEqual({ blocos: 0, xp: 0 })
  })

  it("um bloco fechado paga uma vez", () => {
    expect(xpAPagar(min(MINUTOS_POR_BLOCO), 0)).toEqual({ blocos: 1, xp: XP_POR_BLOCO })
    expect(xpAPagar(min(MINUTOS_POR_BLOCO) + 59, 1)).toEqual({ blocos: 1, xp: 0 })
  })

  it("um tique atrasado (aba de fundo) não engole bloco: paga a diferença", () => {
    expect(xpAPagar(min(17), 1)).toEqual({ blocos: 3, xp: 2 * XP_POR_BLOCO })
  })

  it("um pomodoro inteiro vale 10 XP", () => {
    expect(xpAPagar(min(25), 0).xp).toBe(10)
  })

  it("tempo que diminuiu não cobra de volta o que já foi pago", () => {
    expect(xpAPagar(min(4), 3)).toEqual({ blocos: 3, xp: 0 })
  })
})

describe("dobraATarefa", () => {
  it("dobra com 15 min focados", () => {
    expect(dobraATarefa(min(15), min(25))).toBe(true)
    expect(dobraATarefa(min(15) - 1, min(25))).toBe(false)
  })

  it("sessão mais curta que 15 min dobra quando roda inteira", () => {
    expect(dobraATarefa(min(10), min(10))).toBe(true)
    expect(dobraATarefa(min(9), min(10))).toBe(false)
  })

  it("abrir o foco e concluir na hora não dobra", () => {
    expect(dobraATarefa(0, min(25))).toBe(false)
  })
})

describe("bonusDaTarefa", () => {
  it("é o próprio XP da tarefa quando dobra", () => {
    expect(bonusDaTarefa(20, min(15), min(25))).toBe(20)
  })

  it("não dobra o que não vale nada (o anti-farm da tarefa continua mandando)", () => {
    expect(bonusDaTarefa(0, min(30), min(25))).toBe(0)
  })

  it("sem foco suficiente, sem bônus", () => {
    expect(bonusDaTarefa(20, min(3), min(25))).toBe(0)
  })
})

describe("funcaoAusente", () => {
  it("reconhece a função que ainda não foi criada", () => {
    expect(funcaoAusente({ code: "PGRST202" })).toBe(true)
    expect(funcaoAusente({ code: "42883" })).toBe(true)
  })

  it("outro erro não é ausência: não cai no award_xp por engano", () => {
    expect(funcaoAusente({ code: "42501" })).toBe(false)
    expect(funcaoAusente(null)).toBe(false)
  })
})

describe("leRespostaDoFoco", () => {
  it("lê o total e o concedido", () => {
    expect(leRespostaDoFoco({ total: 340, concedido: 2 })).toEqual({ total: 340, concedido: 2 })
  })

  it("teto batido devolve concedido 0", () => {
    expect(leRespostaDoFoco({ total: 340, concedido: 0 })).toEqual({ total: 340, concedido: 0 })
  })

  it("resposta torta vira null", () => {
    expect(leRespostaDoFoco(340)).toBeNull()
    expect(leRespostaDoFoco({ total: "340", concedido: 2 })).toBeNull()
    expect(leRespostaDoFoco(null)).toBeNull()
  })
})
