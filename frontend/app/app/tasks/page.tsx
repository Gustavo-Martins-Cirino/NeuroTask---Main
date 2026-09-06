"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TaskCard } from "@/components/task-card"
import { TaskDialog } from "@/components/task-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { awardXp, taskXpAmount, MIN_TASK_AGE_MIN } from "@/lib/gamification"
import { nextFutureOccurrence, recurrenceLabel } from "@/lib/task-recurrence"
import type { Task, TaskStatus, TaskList } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Plus, Loader2, ListTodo, Rows3, LayoutGrid, ChevronRight, Check, X, Trash2 } from "lucide-react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useLenis } from "lenis/react"

const GENERAL = "__general__"

type Scope = "today" | "upcoming" | "all"

// "Próximos" = vence amanhã em diante. "Hoje" = vence hoje, está atrasada ou não
// tem data (fica no radar do dia). Assim, tarefa de amanhã não se mistura com a
// de hoje — e uma recorrente concluída hoje (prazo avança p/ amanhã) sai de "Hoje".
function isUpcoming(t: Task): boolean {
  if (!t.due_date) return false
  const endToday = new Date()
  endToday.setHours(23, 59, 59, 999)
  return new Date(t.due_date).getTime() > endToday.getTime()
}

// Ordem de exibição: manual (sort_order) primeiro; sem ordem manual → mais recentes
function sortTasks(list: Task[]): Task[] {
  return [...list].sort(
    (a, b) =>
      (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

// Envelope arrastável de um card (tolerância de 8px preserva os cliques)
function SortableTask({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "manipulation" }}
      className={cn(className, isDragging && "z-20 opacity-85")}
    >
      {children}
    </div>
  )
}

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
  const [scope, setScope] = useState<Scope>("today")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [destacada, setDestacada] = useState<string | null>(null)
  const lenis = useLenis()

  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*")
    if (data) setTasks(sortTasks(data))
    setLoading(false)
  }, [supabase])

  // Chegando do dashboard com ?tarefa=<id>: desliza até o card e o destaca por
  // um instante. A URL é lida direto de window em vez de useSearchParams para
  // não obrigar a página inteira a viver dentro de um <Suspense>.
  useEffect(() => {
    if (loading) return

    const alvo = new URLSearchParams(window.location.search).get("tarefa")
    if (!alvo) return

    const el = document.getElementById(`tarefa-${alvo}`)
    if (!el) return

    if (lenis) lenis.scrollTo(el, { offset: -120 })
    else el.scrollIntoView({ block: "center", behavior: "smooth" })

    setDestacada(alvo)
    // Some com o parâmetro: recarregar a página não deve repetir o deslize.
    window.history.replaceState(null, "", "/app/tasks")

    const timer = setTimeout(() => setDestacada(null), 2400)
    return () => clearTimeout(timer)
  }, [loading, lenis])

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  // Arrastar e soltar: reordena dentro do mesmo grupo/lista e persiste
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const a = tasks.find((t) => t.id === active.id)
    const b = tasks.find((t) => t.id === over.id)
    if (!a || !b) return
    if ((a.list_id ?? null) !== (b.list_id ?? null)) return // v1: só dentro do mesmo grupo

    const group = tasks.filter(
      (t) =>
        (t.list_id ?? null) === (a.list_id ?? null) &&
        t.status !== "completed" &&
        t.status !== "cancelled"
    )
    const oldIndex = group.findIndex((t) => t.id === a.id)
    const newIndex = group.findIndex((t) => t.id === b.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(group, oldIndex, newIndex)

    // Otimista: aplica a nova ordem localmente
    const orderOf = new Map(reordered.map((t, i) => [t.id, i]))
    setTasks((prev) => sortTasks(prev.map((t) => (orderOf.has(t.id) ? { ...t, sort_order: orderOf.get(t.id)! } : t))))

    // Persiste (só as que mudaram)
    Promise.all(
      reordered.map((t, i) =>
        t.sort_order === i ? null : supabase.from("tasks").update({ sort_order: i }).eq("id", t.id)
      )
    )
  }

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
        const recAmt = taskXpAmount(previous)
        if (recAmt > 0) awardXp(recAmt)
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
      const amount = taskXpAmount(previous)
      if (status === "completed" && !wasCompleted) {
        if (amount > 0) awardXp(amount)
        else
          toast.info("Concluída — sem XP desta vez 😉", {
            description: `Tarefas criadas há menos de ${MIN_TASK_AGE_MIN} min não geram XP.`,
          })
      } else if (status !== "completed" && wasCompleted && amount > 0) {
        awardXp(-amount)
      }
    }
    // Notifica o card de "Em andamento" para aparecer/sumir na hora
    window.dispatchEvent(new Event("neurotask:tasks-changed"))
    fetchTasks()
  }

  const handleToggleFavorite = async (task: Task) => {
    await supabase.from("tasks").update({ is_favorite: !task.is_favorite }).eq("id", task.id)
    fetchTasks()
  }

  // Trocar a repetição pelo menu do cartão. Mexe SÓ na regra: o prazo continua
  // onde estava, e é ao concluir que ele avança (ver lib/task-recurrence). Se
  // isto reescrevesse o due_date, marcar "semanalmente" numa tarefa de hoje a
  // jogaria para a semana que vem sem ninguém pedir.
  const handleRecurrenceChange = async (task: Task, rule: string | null) => {
    if ((task.recurrence_rule ?? null) === rule) return
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, recurrence_rule: rule } : t)))
    const { error } = await supabase.from("tasks").update({ recurrence_rule: rule }).eq("id", task.id)
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, recurrence_rule: task.recurrence_rule } : t)))
      toast.error("Não consegui mudar a repetição agora.")
      return
    }
    toast.success(rule ? `Repete: ${recurrenceLabel(rule)?.toLowerCase()}` : "Não repete mais")
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingTask(null)
  }

  // Geral mostra TODAS as tarefas (agrupadas por seção); as demais abas filtram pela lista
  const inScope = (t: Task) => activeList === GENERAL || (t.list_id ?? null) === activeListId
  const active = tasks.filter((t) => inScope(t) && t.status !== "completed" && t.status !== "cancelled")
  const completed = tasks.filter((t) => inScope(t) && t.status === "completed")

  const todayCount = active.filter((t) => !isUpcoming(t)).length
  const upcomingCount = active.filter((t) => isUpcoming(t)).length
  const activeScoped =
    scope === "all" ? active : scope === "upcoming" ? active.filter(isUpcoming) : active.filter((t) => !isUpcoming(t))
  const SCOPES: { key: Scope; label: string; count: number }[] = [
    { key: "today", label: "Hoje", count: todayCount },
    { key: "upcoming", label: "Próximos", count: upcomingCount },
    { key: "all", label: "Todos", count: active.length },
  ]

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

  const renderTasks = (items: Task[], sortable = true) => {
    // Grid = masonry por colunas (columns + break-inside-avoid): cards de
    // alturas diferentes empacotam sem deixar buracos entre as linhas.
    const itemCls = view === "grid" ? "mb-3 break-inside-avoid" : undefined
    const cards = (
      <div className={cn(view === "grid" ? "columns-1 gap-3 sm:columns-2" : "space-y-3")}>
        <AnimatePresence>
          {items.map((task) => {
            const card = (
              <div
                id={`tarefa-${task.id}`}
                className={cn(
                  "rounded-xl transition-shadow duration-300",
                  destacada === task.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <TaskCard
                  task={task}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onToggleFavorite={handleToggleFavorite}
                  onRecurrenceChange={handleRecurrenceChange}
                />
              </div>
            )
            return sortable ? (
              <SortableTask key={task.id} id={task.id} className={itemCls}>
                {card}
              </SortableTask>
            ) : (
              <div key={task.id} className={itemCls}>
                {card}
              </div>
            )
          })}
        </AnimatePresence>
      </div>
    )
    return sortable ? (
      <SortableContext items={items.map((t) => t.id)} strategy={rectSortingStrategy}>
        {cards}
      </SortableContext>
    ) : (
      cards
    )
  }

  const tabBtn = (selected: boolean) =>
    cn(
      "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
      selected ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"
    )

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Tarefas" icon={<ListTodo className="h-4 w-4" />}>
        {/* Só o ícone no celular. O rótulo disputava a linha com o título da
            tela e ganhava: numa largura de 390px, "Tarefas" aparecia como
            "Taref…" — o nome da própria tela ilegível para caber um botão que
            o ícone já explica. */}
        <Button onClick={() => setDialogOpen(true)} size="sm" className="ml-2 shrink-0">
          <Plus className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Nova tarefa</span>
          <span className="sr-only sm:hidden">Nova tarefa</span>
        </Button>
      </Header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                <Button onClick={() => setDialogOpen(true)} size="sm" className="mt-4">
                  <Plus className="mr-1.5 h-4 w-4" /> Criar tarefa
                </Button>
              </div>
            ) : (
              <>
                {/* Filtro por data: Hoje (vence hoje/atrasada/sem data) · Próximos · Todos */}
                <div className="mb-5 inline-flex items-center gap-0.5 rounded-full border border-border/50 p-0.5">
                  {SCOPES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setScope(s.key)}
                      className={cn(
                        "relative rounded-full px-3 py-1 text-sm font-medium transition-colors",
                        scope === s.key ? "text-background" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {scope === s.key && (
                        <motion.span
                          layoutId="tasks-scope-pill"
                          className="absolute inset-0 rounded-full bg-foreground"
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">
                        {s.label} <span className="tabular-nums opacity-60">{s.count}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {activeScoped.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {scope === "today" ? "Nada para hoje. 🎉" : scope === "upcoming" ? "Nada nos próximos dias." : "Nenhuma tarefa."}
                  </p>
                ) : activeList === GENERAL ? (
                  <div className="space-y-6">
                    {groupsFor(activeScoped).map((g) => {
                      const isCol = collapsed.has(g.key)
                      return (
                        <section key={g.key}>
                          <button
                            onClick={() => toggleCollapsed(g.key)}
                            className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", !isCol && "rotate-90")} />
                            {g.label} <span className="opacity-60">({g.items.length})</span>
                          </button>
                          <AnimatePresence initial={false}>
                            {!isCol && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                {renderTasks(g.items)}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </section>
                      )
                    })}
                  </div>
                ) : (
                  renderTasks(activeScoped)
                )}
              </>
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
                      <div className="pt-4">{renderTasks(completed, false)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </DndContext>
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
