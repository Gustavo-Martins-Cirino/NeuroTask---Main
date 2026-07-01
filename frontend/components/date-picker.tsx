"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"]

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string // "YYYY-MM-DD"
  onChange: (v: string) => void
}) {
  const selected = value ? new Date(value + "T00:00:00") : null
  const [month, setMonth] = useState(() => {
    const base = selected ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - firstDay.getDay())

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const today = new Date()
  const todayKey = toKey(today)
  const selectedKey = selected ? toKey(selected) : null

  const shiftMonth = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <div className="rounded-xl border border-border/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">
          {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={() => shiftMonth(1)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = toKey(d)
          const outside = d.getMonth() !== month.getMonth()
          const isSelected = key === selectedKey
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-sm transition-colors",
                isSelected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : isToday
                    ? "text-foreground ring-1 ring-primary/50 hover:bg-accent"
                    : outside
                      ? "text-muted-foreground/40 hover:bg-accent"
                      : "text-foreground hover:bg-accent"
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
