"use client"

import { useCallback, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
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

  return null
}
