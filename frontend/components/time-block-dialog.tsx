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
import { Loader2, ChevronDown, Check, Clock } from "lucide-react"

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

// Seletor de horário no tema do app (o nativo do navegador não é estilizável)
function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const options: string[] = []
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  if (value && !options.includes(value)) {
    options.push(value)
    options.sort()
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    // centraliza o horário selecionado
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>("[data-selected='true']")
      el?.scrollIntoView({ block: "center" })
    })
    return () => document.removeEventListener("pointerdown", onDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm transition-colors focus:border-ring/50 focus:outline-none"
      >
        <span className="tabular-nums">{value}</span>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div
          ref={listRef}
          className="scrollbar-thin absolute inset-x-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {options.map((t) => (
            <button
              key={t}
              type="button"
              data-selected={t === value}
              onClick={() => { onChange(t); setOpen(false) }}
              className={cn(
                "block w-full rounded-md px-3 py-1.5 text-left text-sm tabular-nums transition-colors hover:bg-accent",
                t === value && "bg-accent font-semibold text-primary"
              )}
            >
              {t}
            </button>
          ))}
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
