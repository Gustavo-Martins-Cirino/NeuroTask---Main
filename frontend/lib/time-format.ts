export type TimeFormat = "24h" | "12h"

export const TIME_FORMAT_DEFAULT: TimeFormat = "24h"

// Formatação manual em vez de toLocaleTimeString: o resultado não pode depender
// dos dados de locale do ambiente (o servidor formata diferente do navegador e
// o teste passaria numa máquina e falharia na outra).
const pad = (n: number) => String(n).padStart(2, "0")

export function formatHourMinute(hours: number, minutes: number, format: TimeFormat): string {
  if (format === "24h") return `${pad(hours)}:${pad(minutes)}`
  const suffix = hours < 12 ? "AM" : "PM"
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  return `${h12}:${pad(minutes)} ${suffix}`
}

export function formatTime(date: Date, format: TimeFormat): string {
  return formatHourMinute(date.getHours(), date.getMinutes(), format)
}

// Hora de parede vinda do banco ("14:30" ou "14:30:00"). Entrada inesperada
// volta intacta: melhor mostrar o valor cru do que "NaN:NaN" na tela.
export function formatClock(clock: string, format: TimeFormat): string {
  const [h, m] = clock.split(":")
  const hours = Number(h)
  const minutes = Number(m)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return clock
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return clock
  return formatHourMinute(hours, minutes, format)
}

export function parseTimeFormat(raw: string | null | undefined): TimeFormat {
  return raw === "12h" || raw === "24h" ? raw : TIME_FORMAT_DEFAULT
}
