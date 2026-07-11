"use client"

import { Header } from "@/components/header"
import { Calendar, CheckSquare, Bot, ArrowRight, Clock, Target, ListTodo, LayoutDashboard, Bell } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Reminder } from "@/lib/types"
import { REMINDER_COLORS } from "@/lib/reminders"
import { motion, animate } from "framer-motion"
import { cn } from "@/lib/utils"

function localDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

interface Stats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  todayBlocks: number
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value])

  return <>{display}</>
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    todayBlocks: 0,
  })
  const [userName, setUserName] = useState("")
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [todayBlocks, setTodayBlocks] = useState<{ id: string; title: string; start_time: string; end_time: string }[]>([])
  const [todayTasks, setTodayTasks] = useState<{ id: string; title: string; priority: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email?.split("@")[0] || "")
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")

      if (tasks) {
        setStats((prev) => ({
          ...prev,
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t) => t.status === "completed").length,
          pendingTasks: tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length,
        }))
        setTodayTasks(
          tasks
            .filter(
              (t) =>
                (t.status === "pending" || t.status === "in_progress") &&
                t.due_date &&
                new Date(t.due_date) >= today &&
                new Date(t.due_date) < tomorrow
            )
            .slice(0, 5)
        )
      }

      const { data: blocks } = await supabase
        .from("time_blocks")
        .select("id, title, start_time, end_time")
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString())
        .order("start_time", { ascending: true })

      if (blocks) {
        setStats((prev) => ({ ...prev, todayBlocks: blocks.length }))
        setTodayBlocks(blocks)
      }

      const { data: rem } = await supabase
        .from("reminders")
        .select("*")
        .eq("remind_date", localDateKey())
      if (rem) setReminders(rem)
    }

    fetchData()
  }, [supabase])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

  const metrics = [
    { label: "Tarefas", value: stats.totalTasks, icon: ListTodo, color: "text-foreground" },
    { label: "Concluídas", value: stats.completedTasks, icon: Target, color: "text-emerald-500" },
    { label: "Pendentes", value: stats.pendingTasks, icon: Clock, color: "text-amber-500" },
    { label: "Blocos hoje", value: stats.todayBlocks, icon: Calendar, color: "text-primary" },
  ]

  const actions = [
    { href: "/app/calendar", title: "Calendário", desc: "Organize seu tempo com blocos de foco", icon: Calendar, color: "primary" },
    { href: "/app/tasks", title: "Tarefas", desc: "Gerencie e priorize suas atividades", icon: CheckSquare, color: "emerald" },
    { href: "/app/ai", title: "Neuro IA", desc: "Insights e sugestões inteligentes", icon: Bot, color: "cyan" },
  ]

  const orderedReminders = [...reminders].sort((a, b) => {
    if (a.remind_time && b.remind_time) return a.remind_time.localeCompare(b.remind_time)
    if (a.remind_time) return -1
    if (b.remind_time) return 1
    return a.created_at.localeCompare(b.created_at)
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Início" icon={<LayoutDashboard className="h-4 w-4" />} />

      <div className="flex-1 px-4 py-8 md:px-10">
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
          >
            <p className="text-sm capitalize text-muted-foreground">{today}</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {greeting()}{userName && `, ${userName}`}
            </h2>
            <p className="text-muted-foreground">
              {stats.pendingTasks > 0
                ? `Você tem ${stats.pendingTasks} ${stats.pendingTasks === 1 ? "tarefa pendente" : "tarefas pendentes"}. ${completionRate}% concluído.`
                : "Tudo em dia. Que tal planejar algo novo?"}
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {metrics.map((m) => (
              <motion.div
                key={m.label}
                variants={item}
                className="rounded-2xl border border-border/40 bg-card/50 p-5 backdrop-blur-sm transition-colors hover:border-border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{m.label}</span>
                  <m.icon className={cn("h-4 w-4", m.color)} />
                </div>
                <div className={cn("mt-3 text-3xl font-bold tabular-nums", m.color)}>
                  <CountUp value={m.value} />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Agora + Tarefas de hoje (preenchem o dia de forma útil) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="rounded-2xl border border-border/40 bg-card/50 p-5 backdrop-blur-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" /> Agora
              </h3>
              {(() => {
                const nowMs = Date.now()
                const fmt = (iso: string) =>
                  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                const current = todayBlocks.find(
                  (b) => new Date(b.start_time).getTime() <= nowMs && new Date(b.end_time).getTime() > nowMs
                )
                const next = todayBlocks.find((b) => new Date(b.start_time).getTime() > nowMs)
                if (current)
                  return (
                    <div className="mt-3">
                      <p className="font-semibold text-foreground">{current.title}</p>
                      <p className="text-sm text-muted-foreground">até {fmt(current.end_time)}</p>
                      {next && (
                        <p className="mt-2 text-xs text-muted-foreground/70">
                          Depois: {next.title} às {fmt(next.start_time)}
                        </p>
                      )}
                    </div>
                  )
                if (next)
                  return (
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground">Próximo bloco</p>
                      <p className="font-semibold text-foreground">{next.title}</p>
                      <p className="text-sm text-muted-foreground">às {fmt(next.start_time)}</p>
                    </div>
                  )
                return (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Nenhum bloco pela frente hoje.</p>
                    <Link
                      href="/app/calendar"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Planejar o dia
                    </Link>
                  </div>
                )
              })()}
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/50 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <ListTodo className="h-4 w-4" /> Tarefas de hoje
                </h3>
                <Link href="/app/tasks" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {todayTasks.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nada com prazo para hoje. 🎉</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {todayTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm text-foreground">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-amber-500" : t.priority === "medium" ? "bg-blue-500" : "bg-emerald-500"
                        )}
                      />
                      <span className="truncate">{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>

          {orderedReminders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Bell className="h-4 w-4" /> Lembretes de hoje
                </h3>
                <Link href="/app/calendar" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Ver no calendário <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm">
                <ul className="divide-y divide-border/30">
                  {orderedReminders.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: REMINDER_COLORS[i % REMINDER_COLORS.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{r.content}</span>
                      {r.remind_time && (
                        <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {r.remind_time.slice(0, 5)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-3"
          >
            {actions.map((a) => (
              <motion.div key={a.href} variants={item} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link
                  href={a.href}
                  className="group flex h-full flex-col rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      a.color === "primary" && "bg-primary/10 text-primary",
                      a.color === "emerald" && "bg-emerald-500/10 text-emerald-500",
                      a.color === "cyan" && "bg-cyan-500/10 text-cyan-500",
                    )}>
                      <a.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-5 w-5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
