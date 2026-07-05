"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Task, TaskPriority, TaskStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Confetti } from "@/components/confetti"
import { motion } from "framer-motion"
import {
  MoreHorizontal, Pencil, Trash2, Clock, AlertCircle,
  ArrowUp, ArrowRight, ArrowDown, Check, Play, Star, Repeat,
} from "lucide-react"
import { recurrenceLabel } from "@/lib/task-recurrence"

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onToggleFavorite?: (task: Task) => void
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; icon: React.ReactNode }> = {
  low: { label: "Baixa", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: <ArrowDown className="h-3 w-3" /> },
  medium: { label: "Média", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: <ArrowRight className="h-3 w-3" /> },
  high: { label: "Alta", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: <ArrowUp className="h-3 w-3" /> },
  urgent: { label: "Urgente", color: "bg-red-500/10 text-red-600 dark:text-red-400", icon: <AlertCircle className="h-3 w-3" /> },
}

// Progresso e rótulo do prazo
function dueInfo(task: Task) {
  if (!task.due_date) return null
  const due = new Date(task.due_date).getTime()
  const created = new Date(task.created_at).getTime()
  const now = Date.now()
  const overdue = now > due
  const total = Math.max(due - created, 1)
  const pct = Math.min(100, Math.max(0, ((now - created) / total) * 100))

  let label: string
  if (overdue) {
    label = "Atrasada"
  } else {
    const ms = due - now
    const mins = Math.round(ms / 60_000)
    if (mins < 60) label = `faltam ${mins} min`
    else if (mins < 60 * 24) label = `faltam ${Math.round(mins / 60)} h`
    else label = `faltam ${Math.round(mins / 60 / 24)} dia(s)`
  }

  const color = overdue
    ? "bg-red-500"
    : pct > 85
      ? "bg-red-500"
      : pct > 60
        ? "bg-amber-500"
        : "bg-emerald-500"

  return { pct, overdue, label, color }
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange, onToggleFavorite }: TaskCardProps) {
  const [confetti, setConfetti] = useState(false)
  const priority = priorityConfig[task.priority]
  const isCompleted = task.status === "completed"
  const isInProgress = task.status === "in_progress"
  const due = dueInfo(task)

  const toggleComplete = () => {
    if (!isCompleted) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 800)
      onStatusChange(task.id, "completed")
    } else {
      onStatusChange(task.id, "pending")
    }
  }

  const toggleProgress = () => {
    onStatusChange(task.id, isInProgress ? "pending" : "in_progress")
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isCompleted ? 0.65 : 1, y: 0 }}
      className={cn(
        "group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
        isInProgress ? "border-blue-500/40" : "border-border/50 hover:border-border"
      )}
    >
      {/* Checkbox circular */}
      <div className="relative mt-0.5">
        <button
          onClick={toggleComplete}
          aria-label={isCompleted ? "Marcar como pendente" : "Concluir tarefa"}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isCompleted
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-muted-foreground/40 hover:border-emerald-500"
          )}
        >
          {isCompleted && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </button>
        {confetti && <Confetti />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn("font-medium text-foreground", isCompleted && "text-muted-foreground line-through")}>
            {task.title}
          </h3>

          <div className="flex shrink-0 items-center">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(task)}
                aria-label={task.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                className={cn(
                  "rounded-lg p-1.5 transition-colors",
                  task.is_favorite
                    ? "text-amber-400"
                    : "text-muted-foreground opacity-0 hover:text-amber-400 group-hover:opacity-100"
                )}
              >
                <Star className={cn("h-4 w-4", task.is_favorite && "fill-current")} />
              </button>
            )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {task.description && (
          <p className={cn("mt-1 text-sm text-muted-foreground line-clamp-2", isCompleted && "line-through")}>
            {task.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={cn("text-xs", priority.color)}>
            {priority.icon}
            <span className="ml-1">{priority.label}</span>
          </Badge>

          {task.estimated_minutes && (
            <Badge variant="secondary" className="bg-muted text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {task.estimated_minutes >= 60
                ? `${task.estimated_minutes / 60}h`
                : `${task.estimated_minutes}min`}
            </Badge>
          )}

          {task.recurrence_rule && recurrenceLabel(task.recurrence_rule) && (
            <Badge variant="secondary" className="bg-primary/10 text-xs text-primary">
              <Repeat className="mr-1 h-3 w-3" />
              {recurrenceLabel(task.recurrence_rule)}
            </Badge>
          )}

          {/* Botão Em andamento (some quando concluída) */}
          {!isCompleted && (
            <button
              onClick={toggleProgress}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                isInProgress ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {isInProgress ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  Em andamento
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Iniciar
                </>
              )}
            </button>
          )}
        </div>

        {/* Barra de prazo */}
        {due && !isCompleted && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className={cn(due.overdue ? "font-medium text-red-500" : "text-muted-foreground")}>
                {due.label}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full", due.color)}
                initial={{ width: 0 }}
                animate={{ width: `${due.pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
