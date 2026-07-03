"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { Header } from "@/components/header"
import { TimeBlockDialog } from "@/components/time-block-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import type { TimeBlock, Task, Reminder } from "@/lib/types"
import { REMINDER_COLORS } from "@/lib/reminders"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, Plus, Trash2, Clock, Repeat } from "lucide-react"

type ViewMode = "dia" | "semana" | "mes" | "ano"

const HOUR_HEIGHT = 56
const DAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"]

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

const SNAP = 15
function snapMin(min: number): number {
  return Math.round(min / SNAP) * SNAP
}
function atMinutes(day: Date, minutes: number): Date {
  const d = new Date(day)
  d.setHours(0, 0, 0, 0)
  d.setMinutes(minutes)
  return d
}

function recurrenceMatches(rule: string, base: Date, day: Date): boolean {
  if (rule === "daily") return true
  if (rule === "weekly") return day.getDay() === base.getDay()
  if (rule === "weekdays") {
    const d = day.getDay()
    return d >= 1 && d <= 5
  }
  return false
}

interface Occurrence {
  key: string
  block: TimeBlock
  start: Date
  end: Date
  virtual: boolean
}

interface DragState {
  id: string
  mode: "move" | "resize"
  startX: number
  startY: number
  originStart: number
  originEnd: number
  moved: boolean
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("semana")
  const [anchor, setAnchor] = useState(() => new Date())
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)
  const [defaultStart, setDefaultStart] = useState<Date | undefined>()
  const [defaultEnd, setDefaultEnd] = useState<Date | undefined>()
  const [panelOpen, setPanelOpen] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [holidays, setHolidays] = useState<Record<string, string>>({})
  const fetchedYears = useRef<Set<number>>(new Set())
  const [draft, setDraft] = useState<Record<string, { start: string; end: string }>>({})
  const [drag, setDrag] = useState<DragState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const dragPatchRef = useRef<Record<string, { start: string; end: string }>>({})
  const supabase = createClient()

  const days = useMemo(() => {
    if (view === "dia") return [new Date(new Date(anchor).setHours(0, 0, 0, 0))]
    if (view === "mes") {
      // Grade do mês: começa no domingo da semana do dia 1, 42 dias (6 semanas)
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      const gridStart = startOfWeek(first)
      return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart)
        d.setDate(gridStart.getDate() + i)
        return d
      })
    }
    return getWeekDays(anchor)
  }, [view, anchor])

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "ano") {
      return {
        rangeStart: new Date(anchor.getFullYear(), 0, 1),
        rangeEnd: new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999),
      }
    }
    const e = new Date(days[days.length - 1])
    e.setHours(23, 59, 59, 999)
    return { rangeStart: days[0], rangeEnd: e }
  }, [view, anchor, days])

  const fetchData = useCallback(async () => {
    const { data: blockData } = await supabase
      .from("time_blocks")
      .select("*")
      .gte("start_time", rangeStart.toISOString())
      .lte("start_time", rangeEnd.toISOString())
    if (blockData) setBlocks(blockData)

    const { data: taskData } = await supabase.from("tasks").select("*")
    if (taskData) setTasks(taskData)
  }, [supabase, rangeStart, rangeEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Não refaz fetch durante um arraste ativo (evita conflito com o rascunho)
  useRealtime("time_blocks", () => {
    if (!dragRef.current) fetchData()
  })

  // Feriados nacionais (API Nager.Date, gratuita, sem chave)
  const loadHolidays = useCallback(async (years: number[]) => {
    const toFetch = years.filter((y) => !fetchedYears.current.has(y))
    if (toFetch.length === 0) return
    toFetch.forEach((y) => fetchedYears.current.add(y))
    const results = await Promise.all(
      toFetch.map(async (y) => {
        try {
          const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/BR`)
          if (!r.ok) return [] as { date: string; localName: string; name: string }[]
          return (await r.json()) as { date: string; localName: string; name: string }[]
        } catch {
          return [] as { date: string; localName: string; name: string }[]
        }
      })
    )
    setHolidays((prev) => {
      const next = { ...prev }
      results.flat().forEach((h) => {
        if (h?.date) next[h.date] = h.localName || h.name
      })
      return next
    })
  }, [])

  useEffect(() => {
    const years = new Set<number>()
    if (view === "ano") years.add(anchor.getFullYear())
    else {
      years.add(rangeStart.getFullYear())
      years.add(rangeEnd.getFullYear())
    }
    loadHolidays([...years])
  }, [view, anchor, rangeStart, rangeEnd, loadHolidays])

  const holidayName = (day: Date): string | undefined => holidays[dateKey(day)]

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [])

  const openNew = (start?: Date) => {
    setEditingBlock(null)
    if (start) {
      const end = new Date(start)
      end.setHours(end.getHours() + 1)
      setDefaultStart(start)
      setDefaultEnd(end)
    } else {
      setDefaultStart(undefined)
      setDefaultEnd(undefined)
    }
    setDialogOpen(true)
  }

  const openEdit = (block: TimeBlock) => {
    setEditingBlock(block)
    setDefaultStart(undefined)
    setDefaultEnd(undefined)
    setDialogOpen(true)
  }

  const handleSlotClick = (day: Date, hour: number) => {
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    openNew(start)
  }

  const effectiveTimes = useCallback(
    (b: TimeBlock) => {
      const d = draft[b.id]
      return {
        start: new Date(d?.start ?? b.start_time),
        end: new Date(d?.end ?? b.end_time),
      }
    },
    [draft]
  )

  const startDrag = (e: React.PointerEvent, block: TimeBlock, mode: "move" | "resize") => {
    e.stopPropagation()
    const { start, end } = effectiveTimes(block)
    const state: DragState = {
      id: block.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      originStart: start.getTime(),
      originEnd: end.getTime(),
      moved: false,
    }
    dragRef.current = state
    setDrag(state)
  }

  // Listeners globais durante o arraste
  useEffect(() => {
    if (!drag) return

    const colWidth = gridRef.current
      ? gridRef.current.clientWidth / days.length
      : 0

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const deltaY = e.clientY - d.startY
      const deltaX = e.clientX - d.startX
      if (!d.moved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        d.moved = true
      }
      const deltaMin = snapMin((deltaY / HOUR_HEIGHT) * 60)

      const origStart = new Date(d.originStart)
      const origEnd = new Date(d.originEnd)
      const durationMin = (d.originEnd - d.originStart) / 60_000

      if (d.mode === "move") {
        const deltaDays = view === "dia" || colWidth === 0 ? 0 : Math.round(deltaX / colWidth)
        const startTOD = minutesFromMidnight(origStart) + deltaMin
        const clampedTOD = Math.max(0, Math.min(1440 - durationMin, startTOD))
        const baseDay = new Date(origStart)
        baseDay.setDate(baseDay.getDate() + deltaDays)
        const newStart = atMinutes(baseDay, clampedTOD)
        const newEnd = new Date(newStart.getTime() + durationMin * 60_000)
        const patch = { start: newStart.toISOString(), end: newEnd.toISOString() }
        dragPatchRef.current[d.id] = patch
        setDraft((prev) => ({ ...prev, [d.id]: patch }))
      } else {
        const endTOD = minutesFromMidnight(origEnd) + deltaMin
        const startTOD = minutesFromMidnight(origStart)
        const clampedEnd = Math.max(startTOD + SNAP, Math.min(1440, endTOD))
        const newEnd = atMinutes(origStart, clampedEnd)
        const patch = { start: origStart.toISOString(), end: newEnd.toISOString() }
        dragPatchRef.current[d.id] = patch
        setDraft((prev) => ({ ...prev, [d.id]: patch }))
      }
    }

    const onUp = async () => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d) return

      // Clique simples (não arrastou) → abrir edição
      if (!d.moved) {
        setDraft((prev) => {
          const copy = { ...prev }
          delete copy[d.id]
          return copy
        })
        const block = blocks.find((b) => b.id === d.id)
        if (block) openEdit(block)
        return
      }

      const patch = dragPatchRef.current[d.id]
      if (patch) {
        await supabase
          .from("time_blocks")
          .update({ start_time: patch.start, end_time: patch.end })
          .eq("id", d.id)
        fetchData()
      }
      setDraft((prev) => {
        const copy = { ...prev }
        delete copy[d.id]
        return copy
      })
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, days, view, blocks])

  const navigate = (dir: -1 | 1) => {
    const d = new Date(anchor)
    if (view === "dia") d.setDate(d.getDate() + dir)
    else if (view === "mes" || view === "ano") d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setAnchor(d)
  }

  const goToday = () => setAnchor(new Date())

  const goToDay = (day: Date) => {
    setAnchor(new Date(day))
    setView("dia")
  }

  const rangeLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    if (view === "dia") {
      return anchor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    }
    if (view === "mes" || view === "ano") {
      return anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    }
    return `${fmt(days[0])} - ${fmt(days[6])}`
  }, [view, anchor, days])

  const tzOffset = -new Date().getTimezoneOffset() / 60
  const tzLabel = `GMT${tzOffset >= 0 ? "+" : ""}${tzOffset}`

  const occurrencesForDay = (day: Date): Occurrence[] => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const prevDay = new Date(dayStart)
    prevDay.setDate(prevDay.getDate() - 1)
    const result: Occurrence[] = []
    for (const b of blocks) {
      const { start, end } = effectiveTimes(b)
      const duration = end.getTime() - start.getTime()
      if (isSameDay(start, day)) {
        result.push({ key: b.id, block: b, start, end, virtual: false })
        continue
      }
      // Continuação de bloco que cruza a meia-noite (começou ontem, termina hoje)
      if (isSameDay(start, prevDay) && end.getTime() > dayStart.getTime()) {
        result.push({ key: `${b.id}-cont`, block: b, start: dayStart, end, virtual: true })
        continue
      }
      if (b.is_recurring && b.recurrence_rule) {
        const blockDay = new Date(start)
        blockDay.setHours(0, 0, 0, 0)
        if (dayStart.getTime() <= blockDay.getTime()) continue
        if (recurrenceMatches(b.recurrence_rule, start, day)) {
          const occStart = atMinutes(day, minutesFromMidnight(start))
          result.push({ key: `${b.id}-${dateKey(day)}`, block: b, start: occStart, end: new Date(occStart.getTime() + duration), virtual: true })
        }
      }
    }
    return result
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Meu Dia · Time Blocking" icon={<CalendarDays className="h-4 w-4" />} />

      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Hoje
            </button>
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => navigate(1)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm font-medium capitalize text-muted-foreground">{rangeLabel}</span>
          </div>

          <div className="flex rounded-lg border border-border/50 p-0.5">
            {(["dia", "semana", "mes", "ano"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                  view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {view === v && (
                  <motion.div
                    layoutId="calendar-view-pill"
                    className="absolute inset-0 rounded-md bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{v === "mes" ? "mês" : v}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 gap-4 px-6 pb-6">
          {/* Calendar grid */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/30">
            {view === "ano" ? (
              <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 12 }, (_, mi) => {
                    const monthDate = new Date(anchor.getFullYear(), mi, 1)
                    const firstWeekday = monthDate.getDay()
                    const daysInMonth = new Date(anchor.getFullYear(), mi + 1, 0).getDate()
                    const cells: (Date | null)[] = [
                      ...Array(firstWeekday).fill(null),
                      ...Array.from({ length: daysInMonth }, (_, i) => new Date(anchor.getFullYear(), mi, i + 1)),
                    ]
                    return (
                      <div key={mi} className="rounded-xl border border-border/40 p-3">
                        <button
                          onClick={() => { setAnchor(monthDate); setView("mes") }}
                          className="mb-2 text-sm font-semibold capitalize transition-colors hover:text-primary"
                        >
                          {monthDate.toLocaleDateString("pt-BR", { month: "long" })}
                        </button>
                        <div className="grid grid-cols-7 gap-0.5 text-center">
                          {DAY_LABELS.map((l, i) => (
                            <span key={`h${i}`} className="text-[9px] font-medium text-muted-foreground">{l[0]}</span>
                          ))}
                          {cells.map((d, i) => {
                            if (!d) return <span key={`e${i}`} />
                            const today = isSameDay(d, now)
                            const hol = holidayName(d)
                            return (
                              <button
                                key={i}
                                onClick={() => goToDay(d)}
                                title={hol}
                                className={cn(
                                  "flex h-6 items-center justify-center rounded-md text-[11px] transition-colors hover:bg-accent",
                                  today ? "bg-primary font-semibold text-primary-foreground" : hol ? "font-medium text-emerald-500" : "text-foreground"
                                )}
                              >
                                {d.getDate()}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : view === "mes" ? (
              <div className="flex flex-1 flex-col">
                {/* Cabeçalho de dias da semana */}
                <div className="grid grid-cols-7 border-b border-border/40">
                  {DAY_LABELS.map((l) => (
                    <div key={l} className="py-2 text-center text-xs font-medium uppercase text-muted-foreground">
                      {l}
                    </div>
                  ))}
                </div>
                {/* Grade do mês (6 semanas) */}
                <div className="grid flex-1 grid-cols-7 grid-rows-6">
                  {days.map((day) => {
                    const today = isSameDay(day, now)
                    const outside = day.getMonth() !== anchor.getMonth()
                    const hol = holidayName(day)
                    const dayBlocks = occurrencesForDay(day).sort(
                      (a, b) => a.start.getTime() - b.start.getTime()
                    )
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          const start = new Date(day)
                          start.setHours(9, 0, 0, 0)
                          openNew(start)
                        }}
                        className={cn(
                          "flex min-h-0 cursor-pointer flex-col gap-0.5 border-b border-l border-border/20 p-1 transition-colors hover:bg-accent/30",
                          outside && "bg-muted/20"
                        )}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); goToDay(day) }}
                          title={hol}
                          className={cn(
                            "ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-accent",
                            today ? "bg-primary text-primary-foreground hover:bg-primary" : hol ? "text-emerald-500" : outside ? "text-muted-foreground/50" : "text-foreground"
                          )}
                        >
                          {day.getDate()}
                        </button>
                        {hol && (
                          <span className="truncate text-[9px] font-medium text-emerald-500" title={hol}>{hol}</span>
                        )}
                        <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                          {dayBlocks.slice(0, 3).map((occ) => (
                            <button
                              key={occ.key}
                              onClick={(e) => { e.stopPropagation(); openEdit(occ.block) }}
                              className="truncate rounded px-1 py-0.5 text-left text-[10px] font-medium"
                              style={{ backgroundColor: `${occ.block.color}22`, color: occ.block.color }}
                            >
                              {occ.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {occ.block.title}
                            </button>
                          ))}
                          {dayBlocks.length > 3 && (
                            <span className="px-1 text-[10px] text-muted-foreground">+{dayBlocks.length - 3} mais</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Day headers (reserva o espaço da barra de rolagem p/ alinhar com o corpo) */}
                <div className="flex overflow-y-auto border-b border-border/40 [scrollbar-gutter:stable]">
                  <div className="flex w-16 shrink-0 items-center justify-center py-3 text-[10px] font-medium uppercase text-muted-foreground">
                    {tzLabel}
                  </div>
                  <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                    {days.map((day) => {
                      const today = isSameDay(day, now)
                      const hol = holidayName(day)
                      return (
                        <div key={day.toISOString()} className="flex flex-col items-center justify-center gap-1 py-2" title={hol}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              {DAY_LABELS[day.getDay()]}
                            </span>
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                                today ? "bg-primary text-primary-foreground" : hol ? "text-emerald-500" : "text-foreground"
                              )}
                            >
                              {day.getDate()}
                            </span>
                          </div>
                          {hol && (
                            <span className="max-w-full truncate px-1 text-[10px] font-medium text-emerald-500">{hol}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Time grid */}
                <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                  <div className="flex pt-3">
                    {/* Hour labels */}
                    <div className="w-16 shrink-0">
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                          <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-muted-foreground">
                            {h.toString().padStart(2, "0")}:00
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    <div
                      ref={gridRef}
                      className="grid flex-1"
                      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                    >
                      {days.map((day) => {
                        const today = isSameDay(day, now)
                        return (
                          <div key={day.toISOString()} className="relative border-l border-border/30">
                            {/* Hour cells */}
                            {Array.from({ length: 24 }, (_, h) => (
                              <button
                                key={h}
                                onClick={() => handleSlotClick(day, h)}
                                className="block w-full border-b border-border/20 transition-colors hover:bg-accent/40"
                                style={{ height: HOUR_HEIGHT }}
                              />
                            ))}

                            {/* Current time indicator */}
                            {today && (
                              <div
                                className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                                style={{ top: (minutesFromMidnight(now) / 60) * HOUR_HEIGHT }}
                              >
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                <div className="h-px flex-1 bg-red-500" />
                              </div>
                            )}

                            {/* Blocks */}
                            {occurrencesForDay(day).map((occ) => {
                              const { start, end, block, virtual } = occ
                              const top = (minutesFromMidnight(start) / 60) * HOUR_HEIGHT
                              const rawHeight = ((end.getTime() - start.getTime()) / 3_600_000) * HOUR_HEIGHT
                              // não deixa o bloco ultrapassar o fim do dia (meia-noite fica no topo do dia seguinte)
                              const height = Math.max(24, Math.min(rawHeight, 24 * HOUR_HEIGHT - top))
                              const dragging = !virtual && drag?.id === block.id
                              return (
                                <div
                                  key={occ.key}
                                  onPointerDown={virtual ? undefined : (e) => startDrag(e, block, "move")}
                                  onClick={virtual ? () => openEdit(block) : undefined}
                                  className={cn(
                                    "absolute left-1 right-1 z-10 touch-none select-none overflow-hidden rounded-lg p-2 text-left shadow-sm",
                                    virtual
                                      ? "cursor-pointer opacity-70 transition-opacity hover:opacity-100"
                                      : dragging
                                        ? "z-30 cursor-grabbing opacity-90 shadow-lg ring-2 ring-primary/40"
                                        : "cursor-grab transition-shadow hover:shadow-md"
                                  )}
                                  style={{
                                    top,
                                    height,
                                    backgroundColor: `${block.color}22`,
                                    borderLeft: `3px solid ${block.color}`,
                                  }}
                                >
                                  <p className="flex items-center gap-1 truncate text-xs font-semibold" style={{ color: block.color }}>
                                    {block.is_recurring && <Repeat className="h-2.5 w-2.5 shrink-0" />}
                                    <span className="truncate">{block.title}</span>
                                  </p>
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    {" – "}
                                    {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                  {!virtual && (
                                    <div
                                      onPointerDown={(e) => startDrag(e, block, "resize")}
                                      className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Contextual panel */}
          <motion.aside
            animate={{ width: panelOpen ? 300 : 56 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-card/30 lg:block"
          >
            <button
              onClick={() => setPanelOpen((o) => !o)}
              className="flex w-full items-center justify-between p-4"
            >
              <AnimatePresence initial={false}>
                {panelOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-semibold"
                  >
                    Painel Contextual
                  </motion.span>
                )}
              </AnimatePresence>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !panelOpen && "-rotate-90")} />
            </button>

            <AnimatePresence initial={false}>
              {panelOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 px-4 pb-4"
                >
                  <ContextualNotes anchor={anchor} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
      </div>

      <TimeBlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        timeBlock={editingBlock}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        tasks={tasks}
        onSuccess={fetchData}
      />
    </div>
  )
}

function ContextualNotes({ anchor }: { anchor: Date }) {
  const supabase = createClient()
  const dateStr = dateKey(anchor)
  const [notes, setNotes] = useState("")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from("day_notes")
      .select("content")
      .eq("note_date", dateStr)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setNotes(data?.content ?? "")
      })
    return () => {
      active = false
    }
  }, [supabase, dateStr])

  const save = (value: string) => {
    setNotes(value)
    setSaveState("saving")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSaveState("idle")
        return
      }
      await supabase.from("day_notes").upsert(
        { user_id: user.id, note_date: dateStr, content: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,note_date" }
      )
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1500)
    }, 700)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anotações do dia
          </h3>
          <AnimatePresence mode="wait">
            {saveState !== "idle" && (
              <motion.span
                key={saveState}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn("text-[10px]", saveState === "saved" ? "text-emerald-500" : "text-muted-foreground")}
              >
                {saveState === "saving" ? "Salvando…" : "Salvo"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <textarea
          value={notes}
          onChange={(e) => save(e.target.value)}
          placeholder="Para interpretação por IA: Reflexões de hoje... Como tem sido seu foco? Alguma ideia solta?"
          className="min-h-[120px] w-full resize-none rounded-lg border border-border/40 bg-transparent p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
        />
      </div>

      <ContextualReminders anchor={anchor} />
    </div>
  )
}

function ContextualReminders({ anchor }: { anchor: Date }) {
  const supabase = createClient()
  const dateStr = dateKey(anchor)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [input, setInput] = useState("")
  const [time, setTime] = useState("")
  const [showTime, setShowTime] = useState(false)

  const fetchReminders = useCallback(async () => {
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("remind_date", dateStr)
      .order("created_at", { ascending: true })
    if (data) setReminders(data)
  }, [supabase, dateStr])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  useRealtime("reminders", fetchReminders)

  const addReminder = async () => {
    const content = input.trim()
    if (!content) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (time && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
    setInput("")
    setTime("")
    const { data } = await supabase
      .from("reminders")
      .insert({ content, remind_date: dateStr, remind_time: time || null, user_id: user.id })
      .select()
      .single()
    if (data) {
      setReminders((prev) => (prev.some((r) => r.id === data.id) ? prev : [...prev, data]))
    }
  }

  const removeReminder = async (r: Reminder) => {
    setReminders((prev) => prev.filter((x) => x.id !== r.id))
    await supabase.from("reminders").delete().eq("id", r.id)
  }

  const ordered = [...reminders].sort((a, b) => {
    if (a.remind_time && b.remind_time) return a.remind_time.localeCompare(b.remind_time)
    if (a.remind_time) return -1
    if (b.remind_time) return 1
    return a.created_at.localeCompare(b.created_at)
  })

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Lembretes do dia
      </h3>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addReminder()
              }
            }}
            placeholder="Adicionar lembrete..."
            className="min-w-0 flex-1 rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
          />
          <button
            onClick={() => setShowTime((s) => !s)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
              showTime || time ? "border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
            )}
            aria-label="Definir horário"
            title="Horário (notificação)"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={addReminder}
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Adicionar lembrete"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showTime && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground/60">Nenhum lembrete por enquanto.</p>
      ) : (
        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {ordered.map((r, i) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-accent/40"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: REMINDER_COLORS[i % REMINDER_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 break-words text-sm">{r.content}</span>
                {r.remind_time && (
                  <span className="flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {r.remind_time.slice(0, 5)}
                  </span>
                )}
                <button
                  onClick={() => removeReminder(r)}
                  className="shrink-0 text-muted-foreground/0 transition-colors hover:text-destructive group-hover:text-muted-foreground"
                  aria-label="Remover lembrete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
