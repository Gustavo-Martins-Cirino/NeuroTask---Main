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
import { RECURRENCE_OPTIONS } from "@/lib/task-recurrence"
import type { Task, TaskPriority } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Loader2, ArrowDown, ArrowRight, ArrowUp, AlertCircle, Minus, Plus, Video, Copy, MapPin, ChevronDown, Check } from "lucide-react"
import { toast } from "sonner"

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

function meetingHost(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "")
  } catch {
    return "link"
  }
}

export function TaskDialog({ open, onOpenChange, task, listId = null, onSuccess }: TaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [estimated, setEstimated] = useState<number | null>(null)
  const [dueMode, setDueMode] = useState<DueMode>("none")
  const [days, setDays] = useState(3)
  const [customDate, setCustomDate] = useState("")
  const [recurrence, setRecurrence] = useState("none")
  const [everyDays, setEveryDays] = useState(2)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [meetingUrl, setMeetingUrl] = useState("")
  const [meetingTime, setMeetingTime] = useState("")
  const [location, setLocation] = useState("")
  const [showLocation, setShowLocation] = useState(false)
  const [copied, setCopied] = useState(false)
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
    setMeetingUrl(task?.meeting_url ?? "")
    setLocation(task?.location ?? "")
    setShowLocation(!!task?.location)
    setMeetingOpen(false)
    setCopied(false)
    // Horário: se o prazo tem hora "de verdade" (≠ 23:59), preenche
    if (task?.due_date) {
      const d = new Date(task.due_date)
      const isEndOfDay = d.getHours() === 23 && d.getMinutes() === 59
      setMeetingTime(isEndOfDay ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
    } else {
      setMeetingTime("")
    }
    const rule = task?.recurrence_rule ?? "none"
    const everyMatch = rule.match(/^every:(\d+)$/)
    if (everyMatch) {
      setRecurrence("every")
      setEveryDays(Math.max(1, Number(everyMatch[1])))
    } else {
      setRecurrence(rule)
      setEveryDays(2)
    }
    setError(null)
  }, [open, task])

  const resolveDueDate = (): string | null => {
    // Com horário definido (aba Reunião), o prazo ganha hora real em vez de 23:59
    const withTime = (d: Date): string => {
      if (meetingTime) {
        const [h, m] = meetingTime.split(":").map(Number)
        const x = new Date(d)
        x.setHours(h, m, 0, 0)
        return x.toISOString()
      }
      return endOfDay(d)
    }
    const today = new Date()
    switch (dueMode) {
      case "none":
        return meetingTime ? withTime(today) : null
      case "today":
        return withTime(today)
      case "tomorrow": {
        const d = new Date(today)
        d.setDate(d.getDate() + 1)
        return withTime(d)
      }
      case "days": {
        const d = new Date(today)
        d.setDate(d.getDate() + days)
        return withTime(d)
      }
      case "date":
        return customDate ? withTime(new Date(customDate + "T00:00:00")) : null
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
      recurrence_rule:
        recurrence === "none" ? null : recurrence === "every" ? `every:${Math.max(1, everyDays)}` : recurrence,
      meeting_url: meetingUrl.trim() || null,
      location: location.trim() || null,
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
                    onClick={() => setEstimated((v) => Math.max(0, (v ?? 0) - 5) || null)}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-12 text-center text-xs font-medium">
                    {isCustomTime ? fmtMinutes(estimated!) : estimated != null ? fmtMinutes(estimated) : "Personalizar"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEstimated((v) => (v ?? 0) + 5)}
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

            {/* Reunião (discreta, expansível) */}
            <div className="rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setMeetingOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="h-4 w-4" /> Reunião
                </span>
                <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <span className="truncate text-xs text-muted-foreground">
                    {meetingUrl ? meetingHost(meetingUrl) : location ? location : meetingTime ? `às ${meetingTime}` : "Opcional"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", meetingOpen && "rotate-180")} />
                </span>
              </button>
              {meetingOpen && (
                <div className="space-y-3 border-t border-border/40 p-3">
                  {/* Link + copiar em 1 clique */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="Cole o link — Meet, Zoom, Teams…"
                      className="h-9 flex-1 text-sm"
                      inputMode="url"
                    />
                    <button
                      type="button"
                      disabled={!meetingUrl.trim()}
                      onClick={async () => {
                        await navigator.clipboard.writeText(meetingUrl.trim())
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                        toast.success("Link copiado!")
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                      title="Copiar link"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Horário */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Horário</span>
                    <input
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="h-8 rounded-lg border border-border/50 bg-transparent px-2 text-sm outline-none transition-colors focus:border-primary/40"
                    />
                    {meetingTime && (
                      <button type="button" onClick={() => setMeetingTime("")} className="text-xs text-muted-foreground hover:text-foreground">
                        limpar
                      </button>
                    )}
                  </div>
                  {meetingTime && dueMode === "none" && (
                    <p className="text-[11px] text-muted-foreground/70">Sem data escolhida — vale para hoje às {meetingTime}.</p>
                  )}

                  {/* Local (presencial), discreto */}
                  {showLocation ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Local — sala, endereço…"
                        className="h-9 flex-1 text-sm"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLocation(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Adicionar local (presencial)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Repetição */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Repetir</Label>
              <div className="flex flex-wrap items-center gap-2">
                {RECURRENCE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setRecurrence(o.value)}
                    className={cn(chipBase, recurrence === o.value ? chipOn : chipOff)}
                  >
                    {o.label}
                  </button>
                ))}
                {/* Personalizado: a cada N dias */}
                <div className={cn("flex items-center gap-1 rounded-full border px-1 py-0.5", recurrence === "every" ? chipOn : chipOff)}>
                  <button
                    type="button"
                    onClick={() => { setRecurrence("every"); setEveryDays((d) => Math.max(1, d - 1)) }}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => setRecurrence("every")} className="min-w-20 text-center text-xs font-medium">
                    {recurrence === "every" ? `a cada ${everyDays} dia${everyDays > 1 ? "s" : ""}` : "Personalizado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecurrence("every"); setEveryDays((d) => d + 1) }}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {recurrence !== "none" && (
                <p className="text-[11px] text-muted-foreground/70">
                  Ao concluir, o prazo avança automaticamente para a próxima ocorrência.
                </p>
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
