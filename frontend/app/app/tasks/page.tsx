"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TaskCard } from "@/components/task-card"
import { TaskDialog } from "@/components/task-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { awardXp, xpForTask } from "@/lib/gamification"
import { nextFutureOccurrence } from "@/lib/task-recurrence"
import type { Task, TaskStatus, TaskList } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Plus, Loader2, ListTodo, Rows3, LayoutGrid, ChevronRight, Check, X, Trash2 } from "lucide-react"

const GENERAL = "__general__"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [loading, setLoading] = useState(true)
  const [activeList, setActiveList] = useState<string>(GENERAL) // GENERAL ou list.id
  const [view, setView] = useState<"list" | "grid">("list")
  const [showCompleted, setShowCompleted] = useState(false)
  const [creatingList, setCreatingList] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [listError, setListError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }, [supabase])

  const fetchLists = useCallback(async () => {
    const { data } = await supabase.from("task_lists").select("*").order("created_at", { ascending: true })
    if (data) setLists(data)
  }, [supabase])

  useEffect(() => {
    fetchTasks()
    fetchLists()
  }, [fetchTasks, fetchLists])

  useRealtime("tasks", () => fetchTasks())
  useRealtime("task_lists", () => fetchLists())

  const activeListId = activeList === GENERAL ? null : activeList

  const createList = async () => {
    const name = newListName.trim()
    if (!name) return
    setListError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from("task_lists")
      .insert({ user_id: user.id, name })
      .select("*")
      .single()
    if (error) {
      console.error("Erro ao criar lista:", error)
      setListError(
        error.message.includes("task_lists")
          ? "A tabela de listas ainda não existe. Rode supabase/task_lists.sql no Supabase."
          : error.message
      )
      return
    }
    if (data) {
      setLists((prev) => [...prev, data])
      setActiveList(data.id)
    }
    setNewListName("")
    setCreatingList(false)
  }

  const deleteActiveList = async () => {
    if (!activeListId) return
    await supabase.from("task_lists").delete().eq("id", activeListId)
    setLists((prev) => prev.filter((l) => l.id !== activeListId))
    setActiveList(GENERAL)
    fetchTasks()
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleDelete = async (taskId: string) => {
    // Remove blocos do calendário vinculados (evita bloqueio por chave estrangeira)
    await supabase.from("time_blocks").delete().eq("task_id", taskId)
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)
    if (error) {
      console.error("Erro ao excluir tarefa:", error)
      toast.error("Não consegui excluir a tarefa.", { description: error.message })
      return
    }
    fetchTasks()
  }

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    const previous = tasks.find((t) => t.id === taskId)
    const wasCompleted = previous?.status === "completed"

    // Tarefa recorrente concluída → ganha XP e o prazo avança para a próxima ocorrência
    if (status === "completed" && !wasCompleted && previous?.recurrence_rule) {
      const base = previous.due_date ? new Date(previous.due_date) : new Date()
      const next = nextFutureOccurrence(base, previous.recurrence_rule)
      if (next) {
        await supabase
          .from("tasks")
          .update({ status: "pending", completed_at: null, due_date: next.toISOString() })
          .eq("id", taskId)
        awardXp(xpForTask(previous.priority))
        toast.success("Tarefa recorrente concluída! 🔁", {
          description: `Próxima ocorrência: ${next.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}`,
        })
        window.dispatchEvent(new Event("neurotask:tasks-changed"))
        fetchTasks()
        return
      }
    }

    const updateData: Partial<Task> = { status }
    updateData.completed_at = status === "completed" ? new Date().toISOString() : null
    await supabase.from("tasks").update(updateData).eq("id", taskId)
    if (previous) {
      const amount = xpForTask(previous.priority)
      if (status === "completed" && !wasCompleted) awardXp(amount)
      else if (status !== "completed" && wasCompleted) awardXp(-amount)
    }
    // Notifica o card de "Em andamento" para aparecer/sumir na hora
    window.dispatchEvent(new Event("neurotask:tasks-changed"))
    fetchTasks()
  }

  const handleToggleFavorite = async (task: Task) => {
    await supabase.from("tasks").update({ is_favorite: !task.is_favorite }).eq("id", task.id)
    fetchTasks()
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingTask(null)
  }

  // Geral mostra TODAS as tarefas (agrupadas por seção); as demais abas filtram pela lista
  const inScope = (t: Task) => activeList === GENERAL || (t.list_id ?? null) === activeListId
  const active = tasks.filter((t) => inScope(t) && t.status !== "completed" && t.status !== "cancelled")
  const completed = tasks.filter((t) => inScope(t) && t.status === "completed")

  const groupsFor = (items: Task[]) => {
    const groups: { key: string; label: string; items: Task[] }[] = []
    const general = items.filter((t) => !t.list_id)
    if (general.length) groups.push({ key: "__geral__", label: "Geral", items: general })
    for (const l of lists) {
      const its = items.filter((t) => t.list_id === l.id)
      if (its.length) groups.push({ key: l.id, label: l.name, items: its })
    }
    const known = new Set(lists.map((l) => l.id))
    const orphan = items.filter((t) => t.list_id && !known.has(t.list_id))
    if (orphan.length) groups.push({ key: "__outras__", label: "Outras", items: orphan })
    return groups
  }

  const renderTasks = (items: Task[]) => (
    <div className={cn(view === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-3")}>
      <AnimatePresence>
        {items.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </AnimatePresence>
    </div>
  )

  const tabBtn = (selected: boolean) =>
    cn(
      "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
      selected ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"
    )

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Tarefas" icon={<ListTodo className="h-4 w-4" />}>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="ml-2">
          <Plus className="mr-1.5 h-4 w-4" />
          Nova tarefa
        </Button>
      </Header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        {/* Listas + visualização */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="scrollbar-thin flex items-center gap-1.5 overflow-x-auto">
            <button onClick={() => setActiveList(GENERAL)} className={tabBtn(activeList === GENERAL)}>
              Geral
            </button>
            {lists.map((l) => (
              <button key={l.id} onClick={() => setActiveList(l.id)} className={tabBtn(activeList === l.id)}>
                {l.name}
              </button>
            ))}
            {creatingList ? (
              <div className="flex shrink-0 items-center gap-1">
                <Input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createList()
                    if (e.key === "Escape") { setCreatingList(false); setNewListName("") }
                  }}
                  placeholder="Nome da lista"
                  className="h-8 w-32 text-sm"
                />
                <button onClick={createList} className="rounded-md p-1.5 text-emerald-500 hover:bg-accent">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => { setCreatingList(false); setNewListName("") }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreatingList(true)}
                className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova lista
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {activeListId && (
              <button onClick={deleteActiveList} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title="Excluir lista">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <div className="flex rounded-lg border border-border/50 p-0.5">
              <button onClick={() => setView("list")} className={cn("rounded-md p-1.5 transition-colors", view === "list" ? "bg-accent text-foreground" : "text-muted-foreground")}>
                <Rows3 className="h-4 w-4" />
              </button>
              <button onClick={() => setView("grid")} className={cn("rounded-md p-1.5 transition-colors", view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {listError && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {listError}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">Nenhuma tarefa por aqui. Que tal adicionar uma?</p>
              </div>
            ) : activeList === GENERAL ? (
              <div className="space-y-6">
                {groupsFor(active).map((g) => (
                  <section key={g.key}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {g.label} <span className="opacity-60">({g.items.length})</span>
                    </h2>
                    {renderTasks(g.items)}
                  </section>
                ))}
              </div>
            ) : (
              renderTasks(active)
            )}

            {/* Seção Concluídas (retrátil) */}
            {completed.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowCompleted((s) => !s)}
                  className="flex w-full items-center gap-2 border-t border-border/40 pt-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform", showCompleted && "rotate-90")} />
                  Concluídas ({completed.length})
                </button>
                <AnimatePresence initial={false}>
                  {showCompleted && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">{renderTasks(completed)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        task={editingTask}
        listId={activeListId}
        onSuccess={fetchTasks}
      />
    </div>
  )
}
