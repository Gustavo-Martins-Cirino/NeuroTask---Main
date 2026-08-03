import { describe, it, expect } from "vitest"
import { parseIcs, toIcs } from "./ics"

// A importação cria blocos de tempo na agenda do usuário a partir de um .ics
// (ex.: exportação do Google). Um erro aqui cria evento na hora/dia errado ou
// duplica — e é a primeira coisa que o usuário-teste faz. Fuso e dia-inteiro são
// os cantos escuros, então têm teste dedicado.

const wrap = (vevent: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${vevent}\r\nEND:VCALENDAR\r\n`

describe("parseIcs", () => {
  it("lê um VEVENT básico com hora em UTC", () => {
    const [e] = parseIcs(
      wrap("BEGIN:VEVENT\r\nUID:abc-1\r\nSUMMARY:Reunião de equipe\r\nDTSTART:20260115T130000Z\r\nDTEND:20260115T140000Z\r\nLOCATION:Sala 3\r\nEND:VEVENT")
    )
    expect(e.uid).toBe("abc-1")
    expect(e.title).toBe("Reunião de equipe")
    expect(e.start.toISOString()).toBe("2026-01-15T13:00:00.000Z")
    expect(e.end.toISOString()).toBe("2026-01-15T14:00:00.000Z")
    expect(e.allDay).toBe(false)
    expect(e.location).toBe("Sala 3")
    expect(e.recurrence).toBeNull()
  })

  it("dia inteiro: allDay e fim recuado p/ o mesmo dia (DTEND é exclusivo no iCal)", () => {
    const [e] = parseIcs(wrap("BEGIN:VEVENT\r\nSUMMARY:Feriado\r\nDTSTART;VALUE=DATE:20260115\r\nDTEND;VALUE=DATE:20260116\r\nEND:VEVENT"))
    expect(e.allDay).toBe(true)
    expect([e.start.getFullYear(), e.start.getMonth(), e.start.getDate(), e.start.getHours()]).toEqual([2026, 0, 15, 0])
    // não invade o dia 16
    expect([e.end.getDate(), e.end.getHours(), e.end.getMinutes()]).toEqual([15, 23, 59])
  })

  it("hora local (sem Z) usa o fuso do navegador", () => {
    const [e] = parseIcs(wrap("BEGIN:VEVENT\r\nSUMMARY:Local\r\nDTSTART;TZID=America/Sao_Paulo:20260115T083000\r\nDTEND;TZID=America/Sao_Paulo:20260115T093000\r\nEND:VEVENT"))
    expect([e.start.getFullYear(), e.start.getMonth(), e.start.getDate(), e.start.getHours(), e.start.getMinutes()]).toEqual([2026, 0, 15, 8, 30])
  })

  it("mapeia RRULE simples para o formato dos blocos", () => {
    const rec = (rr: string) => parseIcs(wrap(`BEGIN:VEVENT\r\nSUMMARY:R\r\nDTSTART:20260101T090000Z\r\nRRULE:${rr}\r\nEND:VEVENT`))[0].recurrence
    expect(rec("FREQ=DAILY")).toBe("daily")
    expect(rec("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")).toBe("weekdays")
    expect(rec("FREQ=WEEKLY;BYDAY=MO,WE")).toBe("weekly")
    expect(rec("FREQ=WEEKLY")).toBe("weekly")
    expect(rec("FREQ=MONTHLY")).toBeNull()
  })

  it("desdobra linhas continuadas e desescapa texto", () => {
    const [e] = parseIcs(wrap("BEGIN:VEVENT\r\nSUMMARY:Primeira parte e seg\r\n unda\r\nDESCRIPTION:linha1\\nlinha2\\, vírgula\r\nDTSTART:20260101T090000Z\r\nEND:VEVENT"))
    expect(e.title).toBe("Primeira parte e segunda")
    expect(e.description).toBe("linha1\nlinha2, vírgula")
  })

  it("vários eventos vêm ordenados por início; sem DTSTART é ignorado", () => {
    const evs = parseIcs(
      wrap(
        "BEGIN:VEVENT\r\nSUMMARY:Depois\r\nDTSTART:20260201T090000Z\r\nEND:VEVENT\r\n" +
          "BEGIN:VEVENT\r\nSUMMARY:Antes\r\nDTSTART:20260101T090000Z\r\nEND:VEVENT\r\n" +
          "BEGIN:VEVENT\r\nSUMMARY:SemData\r\nEND:VEVENT"
      )
    )
    expect(evs.map((e) => e.title)).toEqual(["Antes", "Depois"])
  })

  it("sem DTEND, evento com hora dura 1h", () => {
    const [e] = parseIcs(wrap("BEGIN:VEVENT\r\nSUMMARY:X\r\nDTSTART:20260101T090000Z\r\nEND:VEVENT"))
    expect(e.end.getTime() - e.start.getTime()).toBe(3_600_000)
  })

  it("arquivo vazio/sem eventos → lista vazia", () => {
    expect(parseIcs("")).toEqual([])
    expect(parseIcs("BEGIN:VCALENDAR\r\nEND:VCALENDAR")).toEqual([])
  })
})

describe("toIcs (exportação)", () => {
  const ev = (over: Partial<Parameters<typeof toIcs>[0][number]> = {}) => ({
    uid: "b1",
    title: "Reunião",
    start: new Date(Date.UTC(2026, 0, 15, 13, 0, 0)),
    end: new Date(Date.UTC(2026, 0, 15, 14, 0, 0)),
    ...over,
  })

  it("gera VEVENT com hora em UTC e escapa texto", () => {
    const ics = toIcs([ev({ title: "Café, com; barra\\" })])
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("DTSTART:20260115T130000Z")
    expect(ics).toContain("DTEND:20260115T140000Z")
    expect(ics).toContain("SUMMARY:Café\\, com\\; barra\\\\")
    expect(ics).toContain("UID:b1@neurotask")
    expect(ics).toContain("END:VCALENDAR")
  })

  it("mapeia a recorrência do app para RRULE", () => {
    expect(toIcs([ev({ recurrence: "daily" })])).toMatch(/RRULE:FREQ=DAILY\r\n/)
    expect(toIcs([ev({ recurrence: "weekly" })])).toMatch(/RRULE:FREQ=WEEKLY\r\n/)
    expect(toIcs([ev({ recurrence: "weekdays" })])).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")
    expect(toIcs([ev({ recurrence: null })])).not.toContain("RRULE")
  })

  it("round-trip: exporta e reimporta batendo", () => {
    const orig = [
      ev({ uid: "a", title: "Standup", recurrence: "weekdays" as const }),
      ev({ uid: "b", title: "Almoço", start: new Date(Date.UTC(2026, 0, 15, 15, 0, 0)), end: new Date(Date.UTC(2026, 0, 15, 16, 0, 0)), recurrence: null }),
    ]
    const parsed = parseIcs(toIcs(orig))
    expect(parsed.map((e) => e.title)).toEqual(["Standup", "Almoço"])
    expect(parsed[0].start.toISOString()).toBe("2026-01-15T13:00:00.000Z")
    expect(parsed[0].end.toISOString()).toBe("2026-01-15T14:00:00.000Z")
    expect(parsed[0].recurrence).toBe("weekdays")
    expect(parsed[1].recurrence).toBeNull()
  })
})
