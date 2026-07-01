"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { DatePicker } from "@/components/date-picker"
import type { Task, TaskPriority } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Loader2, ArrowDown, ArrowRight, ArrowUp, AlertCircle, Minus, Plus } from "lucide-react"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  listId?: string | null
  onSuccess: () => void
}

const PRIORITIES: { value: TaskPriority; label: string; active: string; icon: React.ReactNode }[] = [
  { value: "low", label: "Baixa", active: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: <ArrowDown className="h-3.5 w-3.5" /> },
  { value: "medium", label: "Média", active: "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: <ArrowRight className="h-3.5 w-3.5" /> },
  { value: "high", label: "Alta", active: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: <ArrowUp className="h-3.5 w-3.5" /> },
  { value: "urgent", label: "Urgente", active: "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400", icon: <AlertCircle className="h-3.5 w-3.5" /> },
]

const TIME_PRESETS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 h" },
]

type DueMode = "none" | "today" | "tomorrow" | "days" | "date"

function fmtMinutes(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m ? `${h}h${m}` : `${h}h`
  }
  return `${min} min`
}

function endOfDay(d: Date): string {
  const x = new Date(d)
  x.setHours(23, 59, 0, 0)
  return x.toISOString()
}

export function TaskDialog({ open, onOpenChange, task, listId = null, onSuccess }: TaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [estimated, setEstimated] = useState<number | null>(null)
  const [dueMode, setDueMode] = useState<DueMode>("none")
  const [days, setDays] = useState(3)
  const [customDate, setCustomDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? "")
    setDescription(task?.description ?? "")
    setPriority(task?.priority ?? "medium")
    setEstimated(task?.estimated_minutes ?? null)
    if (task?.due_date) {
      setDueMode("date")
      setCustomDate(new Date(task.due_date).toISOString().split("T")[0])
    } else {
      setDueMode("none")
      setCustomDate("")
    }
    setDays(3)
    setError(null)
  }, [open, task])

  const resolveDueDate = (): string | null => {
    const today = new Date()
    switch (dueMode) {
      case "none":
        return null
      case "today":
        return endOfDay(today)
      case "tomorrow": {
        const d = new Date(today)
        d.setDate(d.getDate() + 1)
        return endOfDay(d)
      }
      case "days": {
        const d = new Date(today)
        d.setDate(d.getDate() + days)
        return endOfDay(d)
      }
      case "date":
        return customDate ? endOfDay(new Date(customDate)) : null
    }
  }

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

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      estimated_minutes: estimated,
      due_date: resolveDueDate(),
      list_id: task ? task.list_id : listId,
      user_id: user.id,
    }

    const { error: dbError } = task
      ? await supabase.from("tasks").update(payload).eq("id", task.id)
      : await supabase.from("tasks").insert({ ...payload, status: "pending" })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess()
  }

  const isCustomTime = estimated != null && !TIME_PRESETS.some((t) => t.value === estimated)
  const chipBase = "rounded-full border px-3 py-1 text-xs font-medium transition-colors"
  const chipOff = "border-border/50 text-muted-foreground hover:border-border"
  const chipOn = "border-primary bg-primary/10 text-primary"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              required
              className="h-11 text-base"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="h-16 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50"
            />

            {/* Prioridade */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Prioridade</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                      priority === p.value ? p.active : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {p.icon}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo estimado */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tempo estimado</Label>
              <div className="flex flex-wrap items-center gap-2">
                {TIME_PRESETS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEstimated(estimated === t.value ? null : t.value)}
                    className={cn(chipBase, estimated === t.value ? chipOn : chipOff)}
                  >
                    {t.label}
                  </button>
                ))}
                {/* Personalizar com stepper */}
                <div className={cn("flex items-center gap-1 rounded-full border px-1 py-0.5", isCustomTime ? chipOn : chipOff)}>
                  <button
                    type="button"
                    onClick={() => setEstimated((v) => Math.max(0, (v ?? 0) - 15) || null)}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-12 text-center text-xs font-medium">
                    {isCustomTime ? fmtMinutes(estimated!) : "Personalizar"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEstimated((v) => (v ?? 0) + 15)}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Vencimento */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Vencimento</Label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setDueMode("none")} className={cn(chipBase, dueMode === "none" ? chipOn : chipOff)}>Sem data</button>
                <button type="button" onClick={() => setDueMode("today")} className={cn(chipBase, dueMode === "today" ? chipOn : chipOff)}>Hoje</button>
                <button type="button" onClick={() => setDueMode("tomorrow")} className={cn(chipBase, dueMode === "tomorrow" ? chipOn : chipOff)}>Amanhã</button>

                {/* Personalizar dias com stepper */}
                <div className={cn("flex items-center gap-1 rounded-full border px-1 py-0.5", dueMode === "days" ? chipOn : chipOff)}>
                  <button type="button" onClick={() => { setDueMode("days"); setDays((d) => Math.max(1, d - 1)) }} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent">
                    <Minus className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => setDueMode("days")} className="min-w-16 text-center text-xs font-medium">
                    {dueMode === "days" ? `em ${days} dia${days > 1 ? "s" : ""}` : "Em X dias"}
                  </button>
                  <button type="button" onClick={() => { setDueMode("days"); setDays((d) => d + 1) }} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button type="button" onClick={() => setDueMode("date")} className={cn(chipBase, dueMode === "date" ? chipOn : chipOff)}>Data</button>
              </div>
              {dueMode === "date" && (
                <DatePicker value={customDate} onChange={setCustomDate} />
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? "Salvar" : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
