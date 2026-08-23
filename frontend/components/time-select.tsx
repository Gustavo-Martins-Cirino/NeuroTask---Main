"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"
import { useTimeFormat } from "@/hooks/use-time-format"
import { formatClock, to12h, to24h } from "@/lib/time-format"

// Seletor de horário compartilhado pelos diálogos (bloco de tempo, tarefa,
// convite).
//
// Existe porque o `<input type="time">` nativo não é estilizável E segue o
// locale do SISTEMA — quem escolhia AM/PM em Configurações lia "2:30 PM" no app
// inteiro e, na hora de DIGITAR, caía em 24h. Aqui a preferência vale nos dois
// sentidos.
//
// O valor de entrada e saída é sempre "HH:mm" em 24 horas, igual ao do input
// nativo. É isso que torna a troca segura: o que chega ao banco não muda.

// Seletor de horário estilo "wheel" (iOS): duas rodinhas com scroll magnético,
// faixa central destacada e fade nas bordas. O input nativo não é estilizável.
const ITEM_H = 32
const WHEEL_H = 160
const WHEEL_PAD = (WHEEL_H - ITEM_H) / 2

function WheelColumn({
  values,
  selected,
  onSelect,
}: {
  values: string[]
  selected: string
  onSelect: (v: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const guard = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // posiciona no valor atual (ou no mais próximo) sem disparar onSelect
    const num = parseInt(selected, 10)
    let idx = values.indexOf(selected)
    if (idx < 0 && !isNaN(num)) {
      idx = values.reduce(
        (best, v, i) =>
          Math.abs(parseInt(v, 10) - num) < Math.abs(parseInt(values[best], 10) - num) ? i : best,
        0
      )
    }
    guard.current = Date.now() + 400
    ref.current?.scrollTo({ top: Math.max(0, idx) * ITEM_H })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    if (Date.now() < guard.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const idx = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)))
      if (values[idx] !== selected) onSelect(values[idx])
    }, 90)
  }

  const clickItem = (v: string, i: number) => {
    onSelect(v)
    guard.current = Date.now() + 450
    ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" })
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="h-40 flex-1 snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingTop: WHEEL_PAD, paddingBottom: WHEEL_PAD }}
    >
      {values.map((v, i) => (
        <button
          key={v}
          type="button"
          onClick={() => clickItem(v, i)}
          className={cn(
            "flex h-8 w-full snap-center items-center justify-center text-sm tabular-nums transition-colors",
            v === selected ? "text-base font-bold text-primary" : "text-muted-foreground/70 hover:text-foreground"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export function TimeSelect({
  value,
  onChange,
  label,
  vazioRotulo = "Escolher",
}: {
  /** "HH:mm" em 24h. Vazio = nada escolhido ainda (campo opcional). */
  value: string
  onChange: (v: string) => void
  label: string
  /** O que mostrar quando `value` está vazio. */
  vazioRotulo?: string
}) {
  const timeFormat = useTimeFormat()
  const is12h = timeFormat === "12h"
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Campo opcional pode chegar vazio: sem isto o split devolveria "" e a roda
  // abriria numa hora inexistente. O padrão só é EMITIDO quando se escolhe algo.
  const vazio = !value
  const [hh = "09", mm = "00"] = (value || "09:00").split(":")
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))

  // Modo 12h: os wheels mostram 12,1..11 + AM/PM, mas o valor emitido continua
  // "HH:mm" em 24h — a preferência é só de apresentação, o banco não muda.
  const h24 = Number(hh)
  const { h12, period } = to12h(Number.isFinite(h24) ? h24 : 9)
  const hours12 = ["12", ...Array.from({ length: 11 }, (_, i) => String(i + 1))]
  const emit12 = (nh12: number, np: "AM" | "PM") =>
    onChange(`${String(to24h(nh12, np)).padStart(2, "0")}:${mm}`)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 text-sm transition-colors focus:outline-none",
          open ? "border-primary/50" : "border-input focus:border-ring/50"
        )}
      >
        <span className={cn("tabular-nums", vazio && "text-muted-foreground")}>
          {vazio ? vazioRotulo : formatClock(value, timeFormat)}
        </span>
        <Clock className={cn("h-4 w-4 transition-colors", open ? "text-primary" : "text-muted-foreground")} />
      </button>

      {open && (
        <div className="absolute inset-x-0 z-50 mt-1.5 rounded-2xl border border-border bg-popover p-2 shadow-xl">
          <div className="relative flex">
            {/* faixa central (o "cursor" da rodinha) */}
            <div className="pointer-events-none absolute inset-x-1 top-1/2 z-0 h-8 -translate-y-1/2 rounded-xl bg-primary/10 ring-1 ring-primary/25" />
            {/* fades superior e inferior */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 rounded-t-2xl bg-gradient-to-b from-popover to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 rounded-b-2xl bg-gradient-to-t from-popover to-transparent" />

            {is12h ? (
              <>
                <WheelColumn values={hours12} selected={String(h12)} onSelect={(h) => emit12(Number(h), period)} />
                <div className="z-0 flex w-4 items-center justify-center text-sm font-bold text-muted-foreground">:</div>
                <WheelColumn values={minutes} selected={mm} onSelect={(m) => onChange(`${hh}:${m}`)} />
                <WheelColumn values={["AM", "PM"]} selected={period} onSelect={(p) => emit12(h12, p as "AM" | "PM")} />
              </>
            ) : (
              <>
                <WheelColumn values={hours} selected={hh} onSelect={(h) => onChange(`${h}:${mm}`)} />
                <div className="z-0 flex w-4 items-center justify-center text-sm font-bold text-muted-foreground">:</div>
                <WheelColumn values={minutes} selected={mm} onSelect={(m) => onChange(`${hh}:${m}`)} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
