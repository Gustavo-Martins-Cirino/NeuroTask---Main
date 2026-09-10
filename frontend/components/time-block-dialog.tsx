"use client"
import { maiusculaInicial } from "@/lib/texto"

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
import { useTimeFormat } from "@/hooks/use-time-format"
import { TimeSelect } from "@/components/time-select"
import { useDicionario, useLocale } from "@/hooks/use-idioma"
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

/**
 * A repetição de um BLOCO — e por que ela não é a mesma lista da tarefa.
 *
 * O roadmap perguntava se as duas deviam virar uma só. Não devem, e o motivo é
 * que elas não são a mesma coisa: a tarefa repete `daily | weekly | monthly |
 * yearly | every:N`, e é `nextOccurrence` que empurra o PRAZO ao concluir; o
 * bloco repete na GRADE, e tem `weekdays` (seg–sex), que tarefa nenhuma tem.
 * Fundir as duas ofereceria "mensalmente" para um bloco que não sabe repetir
 * assim, e "dias úteis" para uma tarefa cujo `nextOccurrence` devolveria null —
 * a tarefa repetiria na tela e nunca avançaria de prazo.
 *
 * O que elas compartilham é o VOCABULÁRIO, e é só isso que vale unificar: as
 * três chaves em comum vêm do mesmo lugar do dicionário que as tarefas usam, e
 * só `diasUteis` é daqui. Assim não existe o estado em que metade do app diz
 * "Semanalmente" e a outra metade "Weekly".
 */
const REPETICOES_DE_BLOCO = [
  { value: "none", chave: "naoRepete" },
  { value: "daily", chave: "diariamente" },
  { value: "weekly", chave: "semanalmente" },
  { value: "weekdays", chave: "diasUteis" },
] as const

type OptKey = "" | "date" | "color" | "task" | "repeat"

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function toHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
function dateLabel(dateKey: string, locale: string): string {
  const d = new Date(dateKey + "T00:00:00")
  if (isNaN(d.getTime())) return dateKey
  return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })
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
  const traducao = useDicionario()
  // Atalho para o bloco inteiro: ele aparece em quase toda linha do formulário,
  // e `traducao.calendario.bloco` repetido trinta vezes esconde o texto.
  const t = traducao.calendario.bloco
  const locale = useLocale()
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
      setError(t.precisaLogin)
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
  // O nome da repetição sai do dicionário: as três chaves em comum são as
  // MESMAS das tarefas, e só "diasUteis" é daqui.
  const nomeDaRepeticao = (v: string): string => {
    const achada = REPETICOES_DE_BLOCO.find((o) => o.value === v) ?? REPETICOES_DE_BLOCO[0]
    return achada.chave === "diasUteis"
      ? traducao.calendario.bloco.diasUteis
      : traducao.tarefas.repeticao[achada.chave]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{timeBlock ? t.editarTitulo : t.novoTitulo}</DialogTitle>
            <DialogDescription>
              {timeBlock ? t.editarSubtitulo : t.novoSubtitulo}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t.titulo}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.tituloPlaceholder}
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
              <Label htmlFor="description">{t.descricao}</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descricaoPlaceholder}
                className="min-h-16 max-h-40 w-full resize-none overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors [field-sizing:content] placeholder:text-muted-foreground focus:border-ring/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.inicio}</Label>
                <TimeSelect label={t.horarioDeInicio} value={startTime} onChange={setStartTime} />
              </div>

              <div className="space-y-2">
                <Label>{t.fim}</Label>
                <TimeSelect label={t.horarioDeFim} value={endTime} onChange={setEndTime} />
              </div>
            </div>

            {/* Opções discretas — expandem só se o usuário quiser mexer */}
            <div className="space-y-2">
              <OptionRow
                label={t.data}
                value={<span>{maiusculaInicial(dateLabel(date, locale))}</span>}
                open={expanded === "date"}
                onToggle={() => toggle("date")}
              >
                <DatePicker value={date} onChange={(v) => { setDate(v); setExpanded("") }} />
              </OptionRow>

              <OptionRow
                label={t.cor}
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
                label={t.vincularTarefa}
                value={
                  <span className="max-w-40 truncate">
                    {linkedTask ? linkedTask.title : <span className="text-muted-foreground">{t.nenhumaTarefa}</span>}
                  </span>
                }
                open={expanded === "task"}
                onToggle={() => toggle("task")}
              >
                <p className="mb-2 text-xs text-muted-foreground">
                  {t.vincularAjuda}
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
                    {t.nenhumaTarefa}
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
                label={t.repetir}
                value={
                  recurrence === "none"
                    ? <span className="text-muted-foreground">{traducao.tarefas.repeticao.naoRepete}</span>
                    : <span>{nomeDaRepeticao(recurrence)}</span>
                }
                open={expanded === "repeat"}
                onToggle={() => toggle("repeat")}
              >
                <div className="flex flex-wrap gap-2">
                  {REPETICOES_DE_BLOCO.map((o) => (
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
                      {nomeDaRepeticao(o.value)}
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
                aria-label={t.excluir}
                title={t.excluirAtalho}
                className="mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancelar}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.salvando}
                </>
              ) : timeBlock ? (
                t.salvar
              ) : (
                t.criar
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
