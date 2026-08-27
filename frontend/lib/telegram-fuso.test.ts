import { describe, it, expect } from "vitest"
import { fusoDoUsuario, fusoValido, horaLocal, janelaDoDia, LIMITE_DO_FUSO_MIN } from "./telegram-fuso"

const BRASIL = 180      // UTC−3
const LISBOA = -60      // UTC+1
const TOQUIO = -540     // UTC+9

describe("fusoValido", () => {
  it("aceita fuso de verdade, dos dois lados do meridiano", () => {
    expect(fusoValido(BRASIL)).toBe(true)
    expect(fusoValido(TOQUIO)).toBe(true)
    expect(fusoValido(0)).toBe(true)
    expect(fusoValido(LIMITE_DO_FUSO_MIN)).toBe(true)
  })

  it("recusa o que não é fuso", () => {
    for (const v of [null, undefined, "180", NaN, Infinity, 1e6, -LIMITE_DO_FUSO_MIN - 1]) {
      expect(fusoValido(v)).toBe(false)
    }
  })
})

describe("fusoDoUsuario", () => {
  it("segue a ordem de confiança: o vínculo antes da inscrição de push", () => {
    expect(fusoDoUsuario([LISBOA, TOQUIO], BRASIL)).toBe(LISBOA)
  })

  it("pula o palpite ausente e usa o seguinte", () => {
    expect(fusoDoUsuario([null, TOQUIO], BRASIL)).toBe(TOQUIO)
    expect(fusoDoUsuario([undefined, null], BRASIL)).toBe(BRASIL)
  })

  it("ZERO é fuso legítimo, e não 'ausente'", () => {
    // Londres no inverno. Um `??` distraído mandaria essa pessoa para o padrão
    // do servidor — o bug mais fácil de escrever nesta função.
    expect(fusoDoUsuario([0, TOQUIO], BRASIL)).toBe(0)
  })

  it("sem nenhum palpite bom, fica no padrão do servidor", () => {
    expect(fusoDoUsuario([], BRASIL)).toBe(BRASIL)
    expect(fusoDoUsuario([NaN, "x", 99999], BRASIL)).toBe(BRASIL)
  })

  it("padrão corrompido não derruba a resposta — cai em UTC", () => {
    expect(fusoDoUsuario([], Number.NaN)).toBe(0)
  })
})

describe("janelaDoDia", () => {
  it("um dia inteiro, nem mais nem menos", () => {
    const { inicio, fim } = janelaDoDia(Date.UTC(2026, 7, 27, 15, 0), BRASIL)
    expect(new Date(fim).getTime() - new Date(inicio).getTime()).toBe(24 * 3_600_000)
  })

  it("a virada é a MEIA-NOITE de quem lê, não a do servidor", () => {
    // 02:00 UTC de 28/08 ainda é 23:00 de 27/08 no Brasil.
    const { inicio } = janelaDoDia(Date.UTC(2026, 7, 28, 2, 0), BRASIL)
    expect(inicio).toBe("2026-08-27T03:00:00.000Z")
  })

  it("do outro lado do meridiano também", () => {
    // 22:00 UTC de 27/08 já é 07:00 de 28/08 em Tóquio.
    const { inicio } = janelaDoDia(Date.UTC(2026, 7, 27, 22, 0), TOQUIO)
    expect(inicio).toBe("2026-08-27T15:00:00.000Z")
  })

  it("o instante de agora sempre cai DENTRO da janela, em qualquer fuso", () => {
    for (const fuso of [BRASIL, LISBOA, TOQUIO, 0, 720, -840]) {
      for (const hora of [0, 1, 12, 23]) {
        const agora = Date.UTC(2026, 7, 27, hora, 30)
        const { inicio, fim } = janelaDoDia(agora, fuso)
        expect(new Date(inicio).getTime()).toBeLessThanOrEqual(agora)
        expect(new Date(fim).getTime()).toBeGreaterThan(agora)
      }
    }
  })
})

describe("horaLocal", () => {
  it("mostra a hora de quem lê", () => {
    const iso = "2026-08-27T12:00:00.000Z"
    expect(horaLocal(iso, BRASIL)).toBe("09:00")
    expect(horaLocal(iso, TOQUIO)).toBe("21:00")
    expect(horaLocal(iso, 0)).toBe("12:00")
  })

  it("atravessa a meia-noite sem inventar hora", () => {
    expect(horaLocal("2026-08-28T01:30:00.000Z", BRASIL)).toBe("22:30")
  })

  it("data impossível vira traço, e não 'NaN:NaN'", () => {
    expect(horaLocal("não é data", BRASIL)).toBe("--:--")
  })
})
