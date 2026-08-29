"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Sparkles, Check, ArrowRight, X, Armchair, Bot, CalendarPlus } from "lucide-react"

// "Comece por aqui" — primeiro caminho óbvio pro novo usuário (que hoje cai num
// dashboard vazio). Os passos se marcam sozinhos a partir do estado real (tarefa
// criada / concluída / algum bloco no calendário); quando os três fecham, o card
// some ("graduação"). Dá pra dispensar antes (guardado no localStorage).

const DISMISS_KEY = "neurotask:onboarded"

interface Counts {
  tasks: number
  done: number
  blocks: number
}

export function GettingStarted() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [dismissed, setDismissed] = useState(true) // some por padrão até saber

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1")
    const supabase = createClient()
    ;(async () => {
      const [t, d, b] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("time_blocks").select("id", { count: "exact", head: true }),
      ])
      setCounts({ tasks: t.count ?? 0, done: d.count ?? 0, blocks: b.count ?? 0 })
    })()
  }, [])

  if (!counts || dismissed) return null

  const steps = [
    { done: counts.tasks > 0, label: "Crie sua primeira tarefa", href: "/app/tasks", cta: "Criar tarefa" },
    { done: counts.done > 0, label: "Conclua uma tarefa — você ganha XP e moedas pro Escritório", href: "/app/tasks", cta: "Ver tarefas" },
    { done: counts.blocks > 0, label: "Monte seu dia no calendário (ou importe algum!)", href: "/app/calendar", cta: "Abrir calendário" },
  ]
  const feitos = steps.filter((s) => s.done).length
  if (feitos === steps.length) return null // graduou — some sozinho

  const dispensar = () => {
    localStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
  }

  const proximo = steps.find((s) => !s.done)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-5 backdrop-blur-sm"
    >
      <button onClick={dispensar} aria-label="Dispensar" className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Comece por aqui</h3>
        <span className="rounded-full bg-primary/15 px-2 text-[11px] font-semibold tabular-nums text-primary">{feitos}/{steps.length}</span>
      </div>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        O NeuroTask não é um calendário passivo — é um copiloto de rotina. Em 3 passos ele já começa a trabalhar pra você.
      </p>

      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border")}>
              {s.done && <Check className="h-3 w-3" />}
            </span>
            <span className={cn("min-w-0 flex-1 text-sm", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
              {s.label}
            </span>
            {!s.done && s === proximo && (
              <Link href={s.href} className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03]">
                {s.cta} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/15 pt-3">
        <span className="text-xs text-muted-foreground">Explore também:</span>
        <Link href="/app/ai" className="flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <Bot className="h-3.5 w-3.5" /> Planejar o dia com a IA
        </Link>
        <Link href="/app/calendar" className="flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <CalendarPlus className="h-3.5 w-3.5" /> Trazer minha agenda
        </Link>
        <Link href="/app/office" className="flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <Armchair className="h-3.5 w-3.5" /> Seu Escritório
        </Link>
      </div>
    </motion.div>
  )
}
