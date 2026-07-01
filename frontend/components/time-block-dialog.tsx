"use client"

import { useState } from "react"
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

export function TimeBlockDialog({
  open,
  onOpenChange,
  timeBlock,
  defaultStart,
  defaultEnd,
  tasks,
  onSuccess,
}: TimeBlockDialogProps) {
  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const [title, setTitle] = useState(timeBlock?.title || "")
  const [description, setDescription] = useState(timeBlock?.description || "")
  const [startTime, setStartTime] = useState(
    timeBlock?.start_time
      ? formatDateTimeLocal(new Date(timeBlock.start_time))
      : defaultStart
        ? formatDateTimeLocal(defaultStart)
        : ""
  )
  const [endTime, setEndTime] = useState(
    timeBlock?.end_time
      ? formatDateTimeLocal(new Date(timeBlock.end_time))
      : defaultEnd
        ? formatDateTimeLocal(defaultEnd)
        : ""
  )
  const [color, setColor] = useState(timeBlock?.color || "#6366f1")
  const [taskId, setTaskId] = useState(timeBlock?.task_id || "none")
  const [recurrence, setRecurrence] = useState(timeBlock?.recurrence_rule || "none")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    const blockData = {
      title,
      description: description || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
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
      <DialogContent className="sm:max-w-[500px]">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Início</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Fim</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
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
