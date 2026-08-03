// Parser .ics (iCalendar) puro e determinístico — sem libs, sem rede, sem fuso
// externo. Extrai os VEVENT de um arquivo exportado (ex.: Google Calendar) para
// a importação de agenda: título, início/fim, dia-inteiro, local, descrição e a
// recorrência simples mapeada para o formato dos blocos de tempo do app.
//
// Fuso: datas em UTC (sufixo Z) são convertidas certo; datas locais com TZID são
// tratadas como o fuso do navegador (v1) — o calendário do usuário costuma estar
// no fuso dele, que é o do navegador. Sem base de fusos embutida.

export interface IcsEvent {
  uid: string | null
  title: string
  start: Date
  end: Date
  allDay: boolean
  location: string | null
  description: string | null
  /** Recorrência mapeada p/ o bloco: daily | weekly | weekdays | null (evento único). */
  recurrence: "daily" | "weekly" | "weekdays" | null
}

type Prop = { value: string; params: Record<string, string> }

// Desdobra linhas continuadas: uma linha longa é quebrada com CRLF + espaço/tab.
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n")
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\")
}

// Data/hora iCal → Date. YYYYMMDD = dia inteiro; YYYYMMDDTHHMMSSZ = UTC;
// YYYYMMDDTHHMMSS = hora local (fuso do navegador).
function parseIcsDate(value: string): { date: Date; allDay: boolean } | null {
  const v = value.trim()
  const dOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dOnly) {
    return { date: new Date(+dOnly[1], +dOnly[2] - 1, +dOnly[3], 0, 0, 0), allDay: true }
  }
  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (dt) {
    const [, y, mo, d, h, mi, s, z] = dt
    const date = z === "Z"
      ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
      : new Date(+y, +mo - 1, +d, +h, +mi, +s)
    return { date, allDay: false }
  }
  return null
}

function mapRecurrence(rrule: string | null): IcsEvent["recurrence"] {
  if (!rrule) return null
  const freq = rrule.match(/FREQ=([A-Z]+)/)?.[1]
  if (freq === "DAILY") return "daily"
  if (freq === "WEEKLY") {
    const byday = rrule.match(/BYDAY=([^;]+)/)?.[1]
    if (byday) {
      const days = new Set(byday.split(",").map((d) => d.replace(/^[+-]?\d*/, "").toUpperCase()))
      const uteis = ["MO", "TU", "WE", "TH", "FR"]
      if (uteis.every((d) => days.has(d)) && !days.has("SA") && !days.has("SU")) return "weekdays"
    }
    return "weekly"
  }
  return null // mensal/anual/complexo → importa como evento único
}

function buildEvent(props: Record<string, Prop>): IcsEvent | null {
  const dtstart = props["DTSTART"]
  if (!dtstart) return null
  const startP = parseIcsDate(dtstart.value)
  if (!startP) return null

  let allDay = startP.allDay || dtstart.params["VALUE"] === "DATE"
  let end: Date
  const dtend = props["DTEND"]
  if (dtend) {
    const endP = parseIcsDate(dtend.value)
    if (endP) {
      end = endP.date
      allDay = allDay || endP.allDay || dtend.params["VALUE"] === "DATE"
    } else {
      end = new Date(startP.date.getTime() + 3_600_000)
    }
  } else {
    end = new Date(startP.date.getTime() + (allDay ? 86_400_000 : 3_600_000))
  }
  // Dia inteiro: no iCal o DTEND é EXCLUSIVO (00:00 do dia seguinte). Recua p/
  // 23:59 do último dia, para o bloco não invadir o dia de depois.
  if (allDay && end.getTime() > startP.date.getTime()) end = new Date(end.getTime() - 60_000)

  const title = props["SUMMARY"] ? unescapeText(props["SUMMARY"].value).trim() : ""
  return {
    uid: props["UID"]?.value?.trim() || null,
    title: title || "(sem título)",
    start: startP.date,
    end,
    allDay,
    location: props["LOCATION"] ? unescapeText(props["LOCATION"].value).trim() || null : null,
    description: props["DESCRIPTION"] ? unescapeText(props["DESCRIPTION"].value).trim() || null : null,
    recurrence: mapRecurrence(props["RRULE"]?.value ?? null),
  }
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = unfold(text)
  const events: IcsEvent[] = []
  let cur: Record<string, Prop> | null = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line === "BEGIN:VEVENT") { cur = {}; continue }
    if (line === "END:VEVENT") {
      if (cur) {
        const ev = buildEvent(cur)
        if (ev) events.push(ev)
      }
      cur = null
      continue
    }
    if (!cur) continue
    const colon = line.indexOf(":")
    if (colon < 0) continue
    const left = line.slice(0, colon)
    const value = line.slice(colon + 1)
    const segs = left.split(";")
    const name = segs[0].toUpperCase()
    const params: Record<string, string> = {}
    for (const p of segs.slice(1)) {
      const eq = p.indexOf("=")
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1)
    }
    // Primeira ocorrência vence (ignora DTSTART de exceções/override).
    if (!cur[name]) cur[name] = { value, params }
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}

// ───────────────────────── Exportação (.ics) ─────────────────────────
// Caminho de volta: os blocos do NeuroTask viram um .ics que se importa no
// Google/Outlook. Horas sempre em UTC (sufixo Z) — sem ambiguidade de fuso na
// hora de importar de volta. A recorrência do app (daily/weekly/weekdays) vira
// RRULE de verdade.

export interface IcsExportEvent {
  uid: string
  title: string
  start: Date
  end: Date
  description?: string | null
  recurrence?: "daily" | "weekly" | "weekdays" | null
}

const pad = (n: number) => String(n).padStart(2, "0")

// Data → UTC básico: YYYYMMDDTHHMMSSZ.
function icsDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

function toRrule(r: IcsExportEvent["recurrence"]): string | null {
  if (r === "daily") return "FREQ=DAILY"
  if (r === "weekly") return "FREQ=WEEKLY"
  if (r === "weekdays") return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
  return null
}

export function toIcs(events: IcsExportEvent[]): string {
  const now = icsDate(new Date())
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NeuroTask//PT-BR//", "CALSCALE:GREGORIAN"]
  for (const e of events) {
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${e.uid}@neurotask`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART:${icsDate(e.start)}`)
    lines.push(`DTEND:${icsDate(e.end)}`)
    lines.push(`SUMMARY:${icsEscape(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`)
    const rr = toRrule(e.recurrence ?? null)
    if (rr) lines.push(`RRULE:${rr}`)
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.join("\r\n") + "\r\n"
}
