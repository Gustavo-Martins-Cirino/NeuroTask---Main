"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { DatePicker } from "@/components/date-picker"
import { fetchActivities, categoryColor, type RoutineActivity } from "@/lib/routine"
import type { TimeBlock, Task } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface TimeBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeBlock?: TimeBlock | null
  defaultStart?: Date
  defaultEnd?: Date
  tasks: Task[]
  onSuccess: () => void
}

const colors = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#f43f5e", label: "Vermelho" },
  { value: "#f97316", label: "Laranja" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Azul" },
]

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function toHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
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
              <div className="space-y-2">
                <Label>Rotinas</Label>
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
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes opcionais..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Início</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Fim</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vincular Tarefa</Label>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {tasks
                      .filter((t) => t.status !== "completed" && t.status !== "cancelled")
                      .map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Repetir</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não repete</SelectItem>
                  <SelectItem value="daily">Diariamente</SelectItem>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                  <SelectItem value="weekdays">Dias úteis (seg–sex)</SelectItem>
                </SelectContent>
              </Select>
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
