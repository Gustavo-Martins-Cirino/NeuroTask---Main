"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { DatePicker } from "@/components/date-picker"
import { fetchActivities, categoryColor, type RoutineActivity } from "@/lib/routine"
import type { TimeBlock, Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Loader2, ChevronDown, Check, Clock, Trash2 } from "lucide-react"

interface TimeBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeBlock?: TimeBlock | null
  defaultStart?: Date
  defaultEnd?: Date
  tasks: Task[]
  onSuccess: () => void
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
]

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Não repete" },
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
  { value: "weekdays", label: "Dias úteis (seg–sex)" },
]

type OptKey = "" | "date" | "color" | "task" | "repeat"

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function toHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
function dateLabel(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00")
  if (isNaN(d.getTime())) return dateKey
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
}

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

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const [hh = "09", mm = "00"] = value.split(":")
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))

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
        <span className="tabular-nums">{value}</span>
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

            <WheelColumn values={hours} selected={hh} onSelect={(h) => onChange(`${h}:${mm}`)} />
            <div className="z-0 flex w-4 items-center justify-center text-sm font-bold text-muted-foreground">:</div>
            <WheelColumn values={minutes} selected={mm} onSelect={(m) => onChange(`${hh}:${m}`)} />
          </div>
        </div>
      )}
    </div>
  )
}

// Linha compacta expansível (opções discretas: data, cor, tarefa, repetir)
function OptionRow({
  label,
  value,
  open,
  onToggle,
  children,
}: {
  label: string
  value: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          {value}
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {open && <div className="border-t border-border/40 p-3">{children}</div>}
    </div>
  )
}

export function TimeBlockDialog({
  open,
  onOpenChange,
  timeBlock,
  defaultStart,
  defaultEnd,
  tasks,
  onSuccess,
}: TimeBlockDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [color, setColor] = useState("#6366f1")
  const [taskId, setTaskId] = useState("none")
  const [recurrence, setRecurrence] = useState("none")
  const [expanded, setExpanded] = useState<OptKey>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activities, setActivities] = useState<RoutineActivity[]>([])

  // Preenche os campos sempre que o dialog abre (edição traz os dados do bloco)
  useEffect(() => {
    if (!open) return
    if (timeBlock) {
      const s = new Date(timeBlock.start_time)
      const e = new Date(timeBlock.end_time)
      setTitle(timeBlock.title)
      setDescription(timeBlock.description || "")
      setDate(toDateKey(s))
      setStartTime(toHM(s))
      setEndTime(toHM(e))
      setColor(timeBlock.color || "#6366f1")
      setTaskId(timeBlock.task_id || "none")
      setRecurrence(timeBlock.recurrence_rule || "none")
    } else {
      const s = defaultStart ?? new Date()
      const e = defaultEnd ?? new Date(s.getTime() + 60 * 60 * 1000)
      setTitle("")
      setDescription("")
      setDate(toDateKey(s))
      setStartTime(toHM(s))
      setEndTime(toHM(e))
      setColor("#6366f1")
      setTaskId("none")
      setRecurrence("none")
    }
    setExpanded("")
    setError(null)
  }, [open, timeBlock, defaultStart, defaultEnd])

  useEffect(() => {
    if (open) fetchActivities().then(setActivities)
  }, [open])

  const handleDeleteBlock = async () => {
    if (!timeBlock) return
    await supabase.from("time_blocks").delete().eq("id", timeBlock.id)
    onOpenChange(false)
    onSuccess()
  }

  // Backspace/Delete exclui o bloco em edição (fora de campos de texto)
  useEffect(() => {
    if (!open || !timeBlock) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return
      const t = e.target as HTMLElement
      const typing =
        t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable
      if (typing) return
      e.preventDefault()
      handleDeleteBlock()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timeBlock])

  // Aplica uma atividade de rotina: título + duração (fim) + cor da categoria
  const applyActivity = (a: RoutineActivity) => {
    setTitle(a.name)
    setColor(categoryColor(a.category))
    const [h, m] = startTime.split(":").map(Number)
    if (!isNaN(h) && !isNaN(m)) {
      const total = h * 60 + m + a.duration_minutes
      const eh = Math.floor(total / 60) % 24
      const em = total % 60
      setEndTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`)
    }
  }

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Você precisa estar logado")
      setLoading(false)
      return
    }

    const start = new Date(`${date}T${startTime}:00`)
    const end = new Date(`${date}T${endTime}:00`)
    // Fim menor/igual ao início → cruza a meia-noite (termina no dia seguinte)
    if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1)

    const blockData = {
      title,
      description: description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      color,
      task_id: taskId === "none" ? null : taskId,
      recurrence_rule: recurrence === "none" ? null : recurrence,
      is_recurring: recurrence !== "none",
      user_id: user.id,
    }

    if (timeBlock) {
      const { error: updateError } = await supabase
        .from("time_blocks")
        .update(blockData)
        .eq("id", timeBlock.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from("time_blocks")
        .insert(blockData)

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess()
  }

  const toggle = (k: OptKey) => setExpanded((cur) => (cur === k ? "" : k))
  const pendingTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled")
  const linkedTask = pendingTasks.find((t) => t.id === taskId)
  const recurrenceLabel = RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label ?? "Não repete"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{timeBlock ? "Editar Bloco" : "Novo Bloco de Tempo"}</DialogTitle>
            <DialogDescription>
              {timeBlock ? "Atualize os detalhes do bloco" : "Agende um novo bloco de foco"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Foco em desenvolvimento"
                required
              />
            </div>

            {/* Rotinas — preenchem título, duração e cor com 1 toque */}
            {activities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => applyActivity(a)}
                    className="flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor(a.category) }} />
                    {a.name}
                    <span className="opacity-60">{a.duration_minutes}min</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes opcionais..."
                className="min-h-16 max-h-40 w-full resize-none overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors [field-sizing:content] placeholder:text-muted-foreground focus:border-ring/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <TimeSelect label="Horário de início" value={startTime} onChange={setStartTime} />
              </div>

              <div className="space-y-2">
                <Label>Fim</Label>
                <TimeSelect label="Horário de fim" value={endTime} onChange={setEndTime} />
              </div>
            </div>

            {/* Opções discretas — expandem só se o usuário quiser mexer */}
            <div className="space-y-2">
              <OptionRow
                label="Data"
                value={<span className="capitalize">{dateLabel(date)}</span>}
                open={expanded === "date"}
                onToggle={() => toggle("date")}
              >
                <DatePicker value={date} onChange={(v) => { setDate(v); setExpanded("") }} />
              </OptionRow>

              <OptionRow
                label="Cor"
                value={<span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />}
                open={expanded === "color"}
                onToggle={() => toggle("color")}
              >
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setColor(c); setExpanded("") }}
                      aria-label={`Cor ${c}`}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                        color === c && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </OptionRow>

              <OptionRow
                label="Vincular tarefa"
                value={
                  <span className="max-w-40 truncate">
                    {linkedTask ? linkedTask.title : <span className="text-muted-foreground">Nenhuma</span>}
                  </span>
                }
                open={expanded === "task"}
                onToggle={() => toggle("task")}
              >
                <p className="mb-2 text-xs text-muted-foreground">
                  Liga este bloco a uma tarefa da sua lista — o bloco vira o horário de fazê-la.
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setTaskId("none"); setExpanded("") }}
                    className={cn(
                      "block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                      taskId === "none" && "bg-accent font-medium"
                    )}
                  >
                    Nenhuma
                  </button>
                  {pendingTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => { setTaskId(task.id); setExpanded("") }}
                      className={cn(
                        "block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                        taskId === task.id && "bg-accent font-medium"
                      )}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </OptionRow>

              <OptionRow
                label="Repetir"
                value={
                  recurrence === "none"
                    ? <span className="text-muted-foreground">Não repete</span>
                    : <span>{recurrenceLabel}</span>
                }
                open={expanded === "repeat"}
                onToggle={() => toggle("repeat")}
              >
                <div className="flex flex-wrap gap-2">
                  {RECURRENCE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { setRecurrence(o.value); setExpanded("") }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        recurrence === o.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-border"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </OptionRow>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            {timeBlock && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteBlock}
                aria-label="Excluir bloco"
                title="Excluir bloco (Backspace)"
                className="mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : timeBlock ? (
                "Salvar"
              ) : (
                "Criar Bloco"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
