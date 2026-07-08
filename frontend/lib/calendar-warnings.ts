// Avisos inteligentes do calendário (Fase 2 · copiloto).
// 100% determinístico — nenhuma chamada de IA. Regras:
//   1. Tela perto do sono: tarefa "de tela" terminando até 1h antes de dormir.
//   2. Sono curto: janela entre o fim do último bloco de um dia e o início do
//      primeiro bloco do dia seguinte menor que as horas de sono desejadas
//      (ou bloco de sono explícito mais curto que o desejado).

export interface CalendarWarning {
  id: string
  text: string
}

const SCREEN_RE =
  /(tela|planilha|computador|\bpc\b|celular|filme|s[ée]rie|v[íi]deo|youtube|netflix|jogo|game|c[óo]digo|programar?|excel|sheets)/i
const SLEEP_RE = /(dormir|sono|sleep|deitar)/i

interface BlockLike {
  id: string
  title: string
  start_time: string
  end_time: string
}

interface B {
  id: string
  title: string
  start: Date
  end: Date
}

function fmt(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function hoursLabel(h: number): string {
  const r = Math.round(h * 10) / 10
  return `${String(r).replace(".", ",")}h`
}

function isSleepBlock(b: B): boolean {
  if (SLEEP_RE.test(b.title)) return true
  // longo (≥ 5h) começando à noite ou de madrugada
  const durH = (b.end.getTime() - b.start.getTime()) / 3_600_000
  const h = b.start.getHours()
  return durH >= 5 && (h >= 20 || h <= 2)
}

export function computeWarnings(blocks: BlockLike[], sleepHours: number): CalendarWarning[] {
  const bs: B[] = blocks
    .map((b) => ({ id: b.id, title: b.title, start: new Date(b.start_time), end: new Date(b.end_time) }))
    .filter((b) => !isNaN(b.start.getTime()) && !isNaN(b.end.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const out: CalendarWarning[] = []

  // ---- 1. Tela pouco antes de dormir ----
  const sleeps = bs.filter(isSleepBlock)
  for (const s of sleeps) {
    for (const b of bs) {
      if (b.id === s.id || !SCREEN_RE.test(b.title)) continue
      const gapMin = (s.start.getTime() - b.end.getTime()) / 60_000
      if (gapMin >= -15 && gapMin <= 60) {
        out.push({
          id: `screen-${b.id}-${s.id}`,
          text: `"${b.title}" termina pouco antes de dormir (${fmt(s.start)}). Telas perto do sono atrapalham o descanso — que tal encerrar mais cedo?`,
        })
      }
    }
  }

  // ---- 2. Sono curto entre um dia e o seguinte ----
  const byDay = new Map<string, B[]>()
  for (const b of bs) {
    const k = dayKey(b.start)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(b)
  }

  for (const [k, dayBlocks] of byDay) {
    const [y, m, d] = k.split("-").map(Number)
    const nextKey = dayKey(new Date(y, m - 1, d + 1))
    const nextBlocks = byDay.get(nextKey)
    if (!nextBlocks || nextBlocks.length === 0) continue

    const overnight = dayBlocks.find((b) => isSleepBlock(b) && dayKey(b.end) !== k)
    const firstNext = nextBlocks.reduce((a, b) => (a.start <= b.start ? a : b))

    if (overnight) {
      const durH = (overnight.end.getTime() - overnight.start.getTime()) / 3_600_000
      if (durH + 0.25 < sleepHours) {
        out.push({
          id: `sleep-short-${overnight.id}`,
          text: `Seu bloco de sono (${fmt(overnight.start)}–${fmt(overnight.end)}) tem só ${hoursLabel(durH)} — abaixo das ${hoursLabel(sleepHours)} que você quer dormir.`,
        })
      }
      continue
    }

    const sameDayEnds = dayBlocks.filter((b) => dayKey(b.end) === k)
    if (sameDayEnds.length === 0) continue
    const lastDay = sameDayEnds.reduce((a, b) => (a.end >= b.end ? a : b))
    const gapH = (firstNext.start.getTime() - lastDay.end.getTime()) / 3_600_000
    if (gapH > 0 && gapH < sleepHours) {
      out.push({
        id: `night-gap-${lastDay.id}-${firstNext.id}`,
        text: `Entre "${lastDay.title}" (até ${fmt(lastDay.end)}) e "${firstNext.title}" (às ${fmt(firstNext.start)}) sobram só ${hoursLabel(gapH)} — menos que suas ${hoursLabel(sleepHours)} de sono.`,
      })
    }
  }

  return out.slice(0, 4)
}
