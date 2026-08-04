import { describe, it, expect } from "vitest"
import { formatClock, formatHourMinute, formatTime, parseTimeFormat } from "./time-format"

// Meia-noite e meio-dia são onde todo relógio de 12h erra: 0h não é "0:00 AM"
// e 12h não é "0:00 PM". O resto é padding.

describe("formatHourMinute — 24h", () => {
  it("preenche com zero à esquerda", () => {
    expect(formatHourMinute(9, 5, "24h")).toBe("09:05")
    expect(formatHourMinute(0, 0, "24h")).toBe("00:00")
  })

  it("não mexe nas horas da tarde", () => {
    expect(formatHourMinute(14, 30, "24h")).toBe("14:30")
    expect(formatHourMinute(23, 59, "24h")).toBe("23:59")
  })
})

describe("formatHourMinute — 12h", () => {
  it("meia-noite vira 12:00 AM, não 0:00 AM", () => {
    expect(formatHourMinute(0, 0, "12h")).toBe("12:00 AM")
    expect(formatHourMinute(0, 30, "12h")).toBe("12:30 AM")
  })

  it("meio-dia vira 12:00 PM, não 0:00 PM", () => {
    expect(formatHourMinute(12, 0, "12h")).toBe("12:00 PM")
  })

  it("vira PM a partir do meio-dia", () => {
    expect(formatHourMinute(11, 59, "12h")).toBe("11:59 AM")
    expect(formatHourMinute(13, 0, "12h")).toBe("1:00 PM")
    expect(formatHourMinute(23, 59, "12h")).toBe("11:59 PM")
  })

  it("não preenche a hora com zero, só o minuto", () => {
    expect(formatHourMinute(9, 5, "12h")).toBe("9:05 AM")
  })
})

describe("formatTime", () => {
  it("lê hora e minuto locais do Date", () => {
    const d = new Date(2026, 7, 3, 14, 30)
    expect(formatTime(d, "24h")).toBe("14:30")
    expect(formatTime(d, "12h")).toBe("2:30 PM")
  })
})

describe("formatClock — hora de parede do banco", () => {
  it("aceita com e sem segundos", () => {
    expect(formatClock("14:30", "12h")).toBe("2:30 PM")
    expect(formatClock("14:30:00", "12h")).toBe("2:30 PM")
    expect(formatClock("14:30:00", "24h")).toBe("14:30")
  })

  it("devolve a entrada intacta quando não dá pra ler", () => {
    expect(formatClock("", "12h")).toBe("")
    expect(formatClock("abc", "12h")).toBe("abc")
    expect(formatClock("25:00", "12h")).toBe("25:00")
    expect(formatClock("14:99", "24h")).toBe("14:99")
  })
})

describe("parseTimeFormat", () => {
  it("cai no padrão 24h com valor ausente ou inválido", () => {
    expect(parseTimeFormat(null)).toBe("24h")
    expect(parseTimeFormat(undefined)).toBe("24h")
    expect(parseTimeFormat("relógio de sol")).toBe("24h")
  })

  it("respeita o que foi salvo", () => {
    expect(parseTimeFormat("12h")).toBe("12h")
    expect(parseTimeFormat("24h")).toBe("24h")
  })
})
