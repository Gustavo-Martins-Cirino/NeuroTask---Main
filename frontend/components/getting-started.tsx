"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Sparkles, Check, ArrowRight, X, Armchair, Bot, CalendarPlus } from "lucide-react"
import { useDicionario } from "@/hooks/use-idioma"
import { type Dicionario } from "@/lib/i18n"

// "Comece por aqui" — primeiro caminho óbvio pro novo usuário (que hoje cai num
// dashboard vazio). Os passos se marcam sozinhos a partir do estado real (tarefa
// criada / concluída / algum bloco no calendário); quando os três fecham, o card
// some ("graduação"). Dá pra dispensar antes (guardado no localStorage).

const DISMISS_KEY = "neurotask:onboarded"

/** O texto de cada passo mora no dicionário, indexado por este id. */
type IdPasso = keyof Dicionario["inicio"]["comecePorAqui"]["passos"]

interface Counts {
  tasks: number
  done: number
  blocks: number
}

export function GettingStarted() {
  const t = useDicionario().inicio.comecePorAqui
  const [counts, setCounts] = useState<Counts | null>(null)
  const [dismissed, setDismissed] = useState(true) // some por padrão até saber

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1")
    const supabase = createClient()
    ;(async () => {
      const [tarefas, feitas, blocos] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("time_blocks").select("id", { count: "exact", head: true }),
      ])
      setCounts({ tasks: tarefas.count ?? 0, done: feitas.count ?? 0, blocks: blocos.count ?? 0 })
    })()
  }, [])

  if (!counts || dismissed) return null

  const steps: { id: IdPasso; done: boolean; href: string }[] = [
    { id: "criarTarefa", done: counts.tasks > 0, href: "/app/tasks" },
    { id: "concluirTarefa", done: counts.done > 0, href: "/app/tasks" },
    { id: "montarDia", done: counts.blocks > 0, href: "/app/calendar" },
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
      <button onClick={dispensar} aria-label={t.dispensar} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t.titulo}</h3>
        <span className="rounded-full bg-primary/15 px-2 text-[11px] font-semibold tabular-nums text-primary">{feitos}/{steps.length}</span>
      </div>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        {t.descricao}
      </p>

      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3">
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border")}>
              {s.done && <Check className="h-3 w-3" />}
            </span>
            <span className={cn("min-w-0 flex-1 text-sm", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
              {t.passos[s.id].rotulo}
            </span>
            {!s.done && s === proximo && (
              <Link href={s.href} className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03]">
                {t.passos[s.id].acao} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/15 pt-3">
        <span className="text-xs text-muted-foreground">{t.exploreTambem}</span>
        <Link href="/app/ai" className="flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <Bot className="h-3.5 w-3.5" /> {t.planejarComIa}
        </Link>
        <Link href="/app/calendar" className="flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <CalendarPlus className="h-3.5 w-3.5" /> {t.trazerAgenda}
        </Link>
        <Link href="/app/office" className="flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <Armchair className="h-3.5 w-3.5" /> {t.seuEscritorio}
        </Link>
      </div>
    </motion.div>
  )
}
