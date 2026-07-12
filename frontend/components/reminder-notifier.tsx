"use client"

import { useCallback, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { awardXp, taskXpAmount } from "@/lib/gamification"
import { nextFutureOccurrence } from "@/lib/task-recurrence"
import { logActivity } from "@/lib/activity-log"
import { toast } from "sonner"

function localDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function fire(content: string) {
  if (typeof window === "undefined") return
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Lembrete · NeuroTask", { body: content, icon: "/favicon.ico" })
  } else {
    toast("🔔 Lembrete", { description: content })
  }
}

/**
 * Agenda notificações do navegador para os lembretes de hoje que têm horário.
 * Funciona enquanto o app estiver aberto (não usa Service Worker / Push).
 * Montado globalmente no AppShell.
 */
export function ReminderNotifier() {
  const supabase = createClient()
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const schedule = useCallback(async () => {
    timers.current.forEach(clearTimeout)
    timers.current = []

    const { data } = await supabase
      .from("reminders")
      .select("id, content, remind_time")
      .eq("remind_date", localDateKey())
      .not("remind_time", "is", null)
    if (!data) return

    const now = Date.now()
    for (const r of data) {
      if (!r.remind_time) continue
      const notifiedKey = `nt-notified-${r.id}-${localDateKey()}`
      if (localStorage.getItem(notifiedKey)) continue

      const [h, m] = r.remind_time.split(":")
      const target = new Date()
      target.setHours(Number(h), Number(m), 0, 0)
      const delay = target.getTime() - now
      if (delay <= 0) continue // horário já passou: não dispara atrasado

      const id = setTimeout(() => {
        fire(r.content)
        localStorage.setItem(notifiedKey, "1")
      }, delay)
      timers.current.push(id)
    }
  }, [supabase])

  useEffect(() => {
    schedule()
    const ref = timers
    return () => {
      ref.current.forEach(clearTimeout)
      ref.current = []
    }
  }, [schedule])

  useRealtime("reminders", schedule)

  // ---- Check-in pós-horário (Fase 2 · copiloto) ----
  // Quando um bloco termina, pergunta "Conseguiu fazer?" com Concluir/Reagendar.
  // As respostas alimentam o autoconhecimento (activity_log).
  const blocksRef = useRef<{ id: string; title: string; start_time: string; end_time: string; task_id: string | null }[]>([])

  const fetchTodayBlocks = useCallback(async () => {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const { data } = await supabase
      .from("time_blocks")
      .select("id, title, start_time, end_time, task_id")
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString())
    if (data) blocksRef.current = data
  }, [supabase])

  const completeFromCheckin = useCallback(
    async (block: { id: string; title: string; start_time: string; end_time: string; task_id: string | null }) => {
      const start = new Date(block.start_time).getTime()
      const end = new Date(block.end_time).getTime()
      const planned = Math.max(1, Math.round((end - start) / 60_000))
      const actual = Math.max(1, Math.round((Date.now() - start) / 60_000))
      logActivity(block.title, planned, actual)

      // Se o bloco está ligado a uma tarefa, conclui (respeitando recorrência)
      if (block.task_id) {
        const { data: task } = await supabase
          .from("tasks")
          .select("id, priority, status, due_date, recurrence_rule, created_at, estimated_minutes")
          .eq("id", block.task_id)
          .maybeSingle()
        if (task && task.status !== "completed") {
          if (task.recurrence_rule) {
            const base = task.due_date ? new Date(task.due_date) : new Date()
            const next = nextFutureOccurrence(base, task.recurrence_rule)
            await supabase
              .from("tasks")
              .update(
                next
                  ? { status: "pending", completed_at: null, due_date: next.toISOString() }
                  : { status: "completed", completed_at: new Date().toISOString() }
              )
              .eq("id", task.id)
          } else {
            await supabase
              .from("tasks")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", task.id)
          }
          const amt = taskXpAmount(task)
          if (amt > 0) awardXp(amt)
          window.dispatchEvent(new Event("neurotask:tasks-changed"))
        }
      }
      toast.success(`"${block.title}" registrado! 🎯`, { description: "Isso alimenta seu autoconhecimento." })
    },
    [supabase]
  )

  const rescheduleFromCheckin = useCallback(
    async (block: { id: string; title: string; start_time: string; end_time: string }) => {
      const start = new Date(block.start_time).getTime()
      const end = new Date(block.end_time).getTime()
      const duration = Math.max(15 * 60_000, end - start)
      const newStart = new Date()
      const newEnd = new Date(newStart.getTime() + duration)
      await supabase
        .from("time_blocks")
        .update({ start_time: newStart.toISOString(), end_time: newEnd.toISOString() })
        .eq("id", block.id)
      toast.success(`"${block.title}" reagendado para agora.`)
    },
    [supabase]
  )

  useEffect(() => {
    fetchTodayBlocks()
    const tick = setInterval(() => {
      const now = Date.now()
      for (const b of blocksRef.current) {
        const end = new Date(b.end_time).getTime()
        // terminou nos últimos 2 minutos e ainda não perguntamos
        if (end > now || now - end > 2 * 60_000) continue
        const key = `nt-checkin-${b.id}-${b.end_time}`
        if (localStorage.getItem(key)) continue
        localStorage.setItem(key, "1")
        toast(`⏱️ "${b.title}" terminou`, {
          description: "Conseguiu fazer?",
          duration: 60_000,
          action: { label: "Concluí ✅", onClick: () => completeFromCheckin(b) },
          cancel: { label: "Reagendar", onClick: () => rescheduleFromCheckin(b) },
        })
      }
    }, 30_000)
    return () => clearInterval(tick)
  }, [fetchTodayBlocks, completeFromCheckin, rescheduleFromCheckin])

  useRealtime("time_blocks", fetchTodayBlocks)

  return null
}
