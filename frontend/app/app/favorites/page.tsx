"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import type { Task, Note } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Star, ListTodo, FileText, Loader2, ArrowRight } from "lucide-react"

export default function FavoritesPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFavorites = useCallback(async () => {
    const [{ data: t }, { data: n }] = await Promise.all([
      supabase.from("tasks").select("*").eq("is_favorite", true).order("updated_at", { ascending: false }),
      supabase.from("notes").select("*").eq("is_favorite", true).order("updated_at", { ascending: false }),
    ])
    setTasks(t ?? [])
    setNotes(n ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])
  useRealtime("tasks", () => fetchFavorites())
  useRealtime("notes", () => fetchFavorites())

  const unfavTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await supabase.from("tasks").update({ is_favorite: false }).eq("id", id)
  }
  const unfavNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await supabase.from("notes").update({ is_favorite: false }).eq("id", id)
  }

  const empty = !loading && tasks.length === 0 && notes.length === 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Favoritos" icon={<Star className="h-4 w-4" />} />

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              Nada favoritado ainda. Toque na ⭐ de uma tarefa ou nota para vê-la aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {tasks.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <ListTodo className="h-4 w-4" /> Tarefas ({tasks.length})
                  </h2>
                  <Link href="/app/tasks" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {tasks.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn("flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-3", t.status === "completed" && "opacity-60")}
                      >
                        <span className={cn("truncate text-sm font-medium", t.status === "completed" && "line-through text-muted-foreground")}>
                          {t.title}
                        </span>
                        <button onClick={() => unfavTask(t.id)} aria-label="Remover dos favoritos" className="shrink-0 text-amber-400 transition-transform hover:scale-110">
                          <Star className="h-4 w-4 fill-current" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {notes.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-4 w-4" /> Notas ({notes.length})
                  </h2>
                  <Link href="/app/notes" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <AnimatePresence>
                    {notes.map((n) => (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="flex flex-col rounded-xl border border-border/50 bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-medium">{n.title.trim() || "Sem título"}</span>
                          <button onClick={() => unfavNote(n.id)} aria-label="Remover dos favoritos" className="shrink-0 text-amber-400 transition-transform hover:scale-110">
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.content.replace(/<[^>]+>/g, " ").trim() || "Vazia"}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
