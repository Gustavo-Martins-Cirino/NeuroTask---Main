import { describe, it, expect } from "vitest"
import {
  chaveDoDia, descreveAgora, diaSomado, paredeDoUsuario, sufixoDeFuso, ultimoDiaDoMes,
} from "./ia-agora"

const BRASIL = 180   // UTC−3
const TOQUIO = -540  // UTC+9

describe("paredeDoUsuario", () => {
  it("é a parede de quem usa, não a do servidor", () => {
    // 02:00 UTC de 29/08 ainda é 23:00 de 28/08 no Brasil.
    const p = paredeDoUsuario(Date.UTC(2026, 7, 29, 2, 0), BRASIL)
    expect(chaveDoDia(p)).toBe("2026-08-28")
    expect(p.hora).toBe(23)
    expect(p.diaDaSemana).toBe(5) // sexta
  })

  it("do outro lado do meridiano também", () => {
    const p = paredeDoUsuario(Date.UTC(2026, 7, 28, 22, 0), TOQUIO)
    expect(chaveDoDia(p)).toBe("2026-08-29")
  })

  it("mês vem como se lê (1 a 12), não como no Date", () => {
    expect(paredeDoUsuario(Date.UTC(2026, 0, 15, 12, 0), 0).mes).toBe(1)
    expect(paredeDoUsuario(Date.UTC(2026, 11, 15, 12, 0), 0).mes).toBe(12)
  })

  it("instante ou fuso impossível não quebra a frase", () => {
    expect(() => paredeDoUsuario(Number.NaN, Number.NaN)).not.toThrow()
    expect(paredeDoUsuario(Date.UTC(2026, 7, 28, 12, 0), Number.NaN).dia).toBe(28)
  })
})

describe("sufixoDeFuso", () => {
  it("inverte o sinal do getTimezoneOffset — o erro clássico daqui", () => {
    // O navegador diz 180 para o Brasil (minutos ATRÁS do UTC); o ISO diz −03:00.
    expect(sufixoDeFuso(BRASIL)).toBe("-03:00")
    expect(sufixoDeFuso(TOQUIO)).toBe("+09:00")
  })

  it("UTC é Z, e meia hora também sai certo", () => {
    expect(sufixoDeFuso(0)).toBe("Z")
    expect(sufixoDeFuso(-330)).toBe("+05:30") // Índia
    expect(sufixoDeFuso(270)).toBe("-04:30")
  })
})

describe("ultimoDiaDoMes", () => {
  it("acerta os meses de 30, 31 e fevereiro", () => {
    expect(ultimoDiaDoMes(2026, 8)).toBe(31)
    expect(ultimoDiaDoMes(2026, 4)).toBe(30)
    expect(ultimoDiaDoMes(2026, 2)).toBe(28)
  })

  it("fevereiro bissexto tem 29", () => {
    expect(ultimoDiaDoMes(2028, 2)).toBe(29)
    expect(ultimoDiaDoMes(2000, 2)).toBe(29)
    expect(ultimoDiaDoMes(1900, 2)).toBe(28) // século não múltiplo de 400
  })

  it("dezembro tem 31 — a virada de ano não confunde a conta", () => {
    expect(ultimoDiaDoMes(2026, 12)).toBe(31)
  })
})

describe("diaSomado", () => {
  const p = (ano: number, mes: number, dia: number) =>
    paredeDoUsuario(Date.UTC(ano, mes - 1, dia, 12, 0), 0)

  it("atravessa o fim do mês", () => {
    expect(diaSomado(p(2026, 8, 31), 1)).toBe("2026-09-01")
  })

  it("atravessa o fim do ano, nos dois sentidos", () => {
    expect(diaSomado(p(2026, 12, 31), 1)).toBe("2027-01-01")
    expect(diaSomado(p(2027, 1, 1), -1)).toBe("2026-12-31")
  })

  it("uma semana à frente é uma semana à frente", () => {
    expect(diaSomado(p(2026, 8, 28), 7)).toBe("2026-09-04")
  })
})

describe("descreveAgora", () => {
  const frase = descreveAgora(Date.UTC(2026, 7, 28, 23, 11), BRASIL)

  it("diz o dia por EXTENSO — nome de mês não se lê de trás para frente", () => {
    // Era a causa do "não consegue ver o mês": "28/08/2026" pode virar 8 de
    // abril na cabeça de um modelo, e o erro não faz barulho.
    expect(frase).toContain("sexta-feira")
    expect(frase).toContain("28 de agosto de 2026")
  })

  it("dá o mesmo instante em ISO, com o fuso certo", () => {
    expect(frase).toContain("2026-08-28T20:11:00-03:00")
  })

  it("entrega o mês já delimitado, que era a pergunta que falhava", () => {
    expect(frase).toContain("2026-08-01")
    expect(frase).toContain("2026-08-31")
  })

  it("entrega hoje, ontem, amanhã e a semana prontos", () => {
    expect(frase).toContain("hoje = 2026-08-28")
    expect(frase).toContain("amanhã = 2026-08-29")
    expect(frase).toContain("ontem = 2026-08-27")
    expect(frase).toContain("2026-09-04")
  })

  it("no fim do mês, o 'amanhã' não cai no mês errado", () => {
    const virada = descreveAgora(Date.UTC(2026, 7, 31, 15, 0), BRASIL)
    expect(virada).toContain("hoje = 2026-08-31")
    expect(virada).toContain("amanhã = 2026-09-01")
  })

  it("sai inteira mesmo com instante ou fuso impossível", () => {
    expect(() => descreveAgora(Number.NaN, Number.NaN)).not.toThrow()
    expect(descreveAgora(Date.UTC(2026, 7, 28, 12, 0), Number.NaN)).toContain("2026-08-28")
  })
})
