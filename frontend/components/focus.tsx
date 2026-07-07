"use client"

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { awardXp, xpForTask } from "@/lib/gamification"
import { nextFutureOccurrence } from "@/lib/task-recurrence"
import { SoundMixer } from "@/components/sound-mixer"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, X, Check, RotateCcw, Activity, Minus, Plus, Palette, Music, Minimize2, Maximize2 } from "lucide-react"

interface FocusContextValue {
  openFocus: (task?: Task | null, minutes?: number) => void
  inProgress: Task | null
}

const FocusContext = createContext<FocusContextValue | null>(null)
export const useFocus = () => {
  const ctx = useContext(FocusContext)
  if (!ctx) throw new Error("useFocus deve ser usado dentro de FocusProvider")
  return ctx
}

const AMBIENTS = [
  { id: "transparent", name: "Transparente", bg: "bg-background/60 backdrop-blur-xl", mode: "themed" as const, clock: false },
  { id: "black", name: "Preto", bg: "bg-neutral-950", mode: "dark" as const, clock: false },
  { id: "gray", name: "Cinza", bg: "bg-neutral-700", mode: "dark" as const, clock: false },
  { id: "light", name: "Claro", bg: "bg-neutral-100", mode: "light" as const, clock: false },
  { id: "white", name: "Branco", bg: "bg-white", mode: "light" as const, clock: false },
  { id: "clock", name: "Relógio", bg: "bg-neutral-950", mode: "dark" as const, clock: true },
]

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0")
}

// Relógio analógico (hora atual, ponteiros em tempo real)
function AnalogClock({ stroke }: { stroke: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const s = now.getSeconds()
  const min = now.getMinutes()
  const h = now.getHours() % 12
  const secA = s * 6
  const minA = min * 6 + s * 0.1
  const hourA = h * 30 + min * 0.5
  return (
    <svg viewBox="0 0 200 200" className="h-[min(60vh,420px)] w-[min(60vh,420px)]" style={{ color: stroke }}>
      <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const r1 = i % 3 === 0 ? 78 : 84
        return (
          <line
            key={i}
            x1={100 + r1 * Math.sin(a)} y1={100 - r1 * Math.cos(a)}
            x2={100 + 90 * Math.sin(a)} y2={100 - 90 * Math.cos(a)}
            stroke="currentColor" strokeOpacity={i % 3 === 0 ? 0.7 : 0.3}
            strokeWidth={i % 3 === 0 ? 3 : 1.5} strokeLinecap="round"
          />
        )
      })}
      <line x1="100" y1="100" x2={100 + 48 * Math.sin((hourA * Math.PI) / 180)} y2={100 - 48 * Math.cos((hourA * Math.PI) / 180)} stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <line x1="100" y1="100" x2={100 + 70 * Math.sin((minA * Math.PI) / 180)} y2={100 - 70 * Math.cos((minA * Math.PI) / 180)} stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="100" y1="100" x2={100 + 78 * Math.sin((secA * Math.PI) / 180)} y2={100 - 78 * Math.cos((secA * Math.PI) / 180)} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="100" r="4" fill="currentColor" />
    </svg>
  )
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [inProgress, setInProgress] = useState<Task | null>(null)
  const [, setTick] = useState(0)

  const [open, setOpen] = useState(false)
  const [focusTask, setFocusTask] = useState<Task | null>(null)
  const [duration, setDuration] = useState(25 * 60)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [ambient, setAmbient] = useState(1)
  const [panel, setPanel] = useState<"none" | "ambient" | "sounds">("none")
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [minimized, setMinimized] = useState(false)

  const fetchInProgress = useCallback(async () => {
    const { data } = await supabase
      .from("tasks").select("*").eq("status", "in_progress")
      .order("updated_at", { ascending: false }).limit(1)
    setInProgress(data?.[0] ?? null)
  }, [supabase])

  useEffect(() => { fetchInProgress() }, [fetchInProgress])
  useRealtime("tasks", () => fetchInProgress())

  useEffect(() => {
    const onChange = () => fetchInProgress()
    window.addEventListener("neurotask:tasks-changed", onChange)
    return () => window.removeEventListener("neurotask:tasks-changed", onChange)
  }, [fetchInProgress])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open || !running) return
    const id = setInterval(() => {
      setRemaining((r) => { if (r <= 1) { setRunning(false); return 0 } return r - 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [open, running])

  // Fecha o painel (Sons / Ambiente) ao clicar fora dele
  useEffect(() => {
    if (panel === "none") return
    const onDown = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setPanel("none")
      }
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [panel])

  const openFocus = useCallback((task?: Task | null, minutes?: number) => {
    const mins = minutes ?? task?.estimated_minutes ?? 25
    setFocusTask(task ?? null)
    setDuration(mins * 60)
    setRemaining(mins * 60)
    setRunning(false)
    setMinimized(false)
    setOpen(true)
  }, [])

  const setDurationMin = (mins: number) => {
    const m = Math.min(180, Math.max(5, mins))
    setDuration(m * 60)
    setRemaining(m * 60)
    setRunning(false)
  }

  const reset = () => { setRemaining(duration); setRunning(false) }

  const completeTask = async () => {
    if (focusTask) {
      if (focusTask.recurrence_rule) {
        // Tarefa recorrente: o prazo avança para a próxima ocorrência
        const base = focusTask.due_date ? new Date(focusTask.due_date) : new Date()
        const next = nextFutureOccurrence(base, focusTask.recurrence_rule)
        await supabase
          .from("tasks")
          .update(
            next
              ? { status: "pending", completed_at: null, due_date: next.toISOString() }
              : { status: "completed", completed_at: new Date().toISOString() }
          )
          .eq("id", focusTask.id)
      } else {
        await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", focusTask.id)
      }
      awardXp(xpForTask(focusTask.priority))
      window.dispatchEvent(new Event("neurotask:tasks-changed"))
    }
    setOpen(false)
  }

  const mm = pad(Math.floor(remaining / 60))
  const ss = pad(remaining % 60)
  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0
  const durationMin = Math.round(duration / 60)
  const amb = AMBIENTS[ambient]
  const m = amb.mode

  // Classes por modo (themed = segue tema do app; dark = texto branco; light = texto escuro)
  const txt = m === "themed" ? "text-foreground" : m === "light" ? "text-neutral-900" : "text-white"
  const soft = m === "themed" ? "text-muted-foreground" : m === "light" ? "text-neutral-900/60" : "text-white/60"
  const ctrl = m === "themed" ? "text-muted-foreground hover:bg-accent hover:text-foreground" : m === "light" ? "text-neutral-900/70 hover:bg-black/10 hover:text-neutral-900" : "text-white/70 hover:bg-white/10 hover:text-white"
  const solid = m === "themed" ? "bg-primary text-primary-foreground" : m === "light" ? "bg-neutral-900 text-white" : "bg-white text-neutral-900"
  const panelCls = m === "themed" ? "bg-card border-border text-foreground" : m === "light" ? "bg-white/95 border-black/10 text-neutral-900" : "bg-black/50 border-white/15 text-white backdrop-blur-xl"
  const trackBg = m === "themed" ? "bg-muted" : m === "light" ? "bg-black/15" : "bg-white/15"
  const fill = m === "themed" ? "bg-primary" : m === "light" ? "bg-neutral-900" : "bg-white"
  const ring = m === "light" ? "border-neutral-900" : m === "themed" ? "border-primary" : "border-white"

  const inProgressRemaining = (() => {
    if (!inProgress?.estimated_minutes) return null
    const started = new Date(inProgress.updated_at).getTime()
    return inProgress.estimated_minutes * 60_000 - (Date.now() - started)
  })()

  return (
    <FocusContext.Provider value={{ openFocus, inProgress }}>
      {children}

      {/* Card de tarefa em andamento */}
      <AnimatePresence>
        {inProgress && !open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 z-40 w-64 rounded-2xl border border-border/50 bg-card/90 p-4 shadow-lg backdrop-blur-xl md:bottom-6 md:right-6"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-blue-500">Em andamento</span>
            </div>
            <p className="mt-2 truncate font-medium text-foreground">{inProgress.title}</p>
            {inProgressRemaining !== null && (
              <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                {inProgressRemaining >= 0
                  ? `${pad(Math.floor(inProgressRemaining / 60000))}:${pad(Math.floor((inProgressRemaining % 60000) / 1000))} restantes`
                  : "Tempo estimado esgotado"}
              </p>
            )}
            <button onClick={() => openFocus(inProgress)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]">
              <Activity className="h-4 w-4" />
              Entrar no foco
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modo Foco */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn("fixed inset-0 z-[100] flex flex-col items-center justify-center", amb.bg, txt, minimized && "hidden")}
          >
            <div className="absolute right-6 top-6 flex items-center gap-1">
              <button onClick={() => { setMinimized(true); setPanel("none") }} aria-label="Minimizar" className={cn("rounded-full p-2 transition-colors", ctrl)}>
                <Minimize2 className="h-5 w-5" />
              </button>
              <button onClick={() => { setOpen(false); setMinimized(false) }} aria-label="Cancelar foco" className={cn("rounded-full p-2 transition-colors", ctrl)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-2 text-center">
              <p className={cn("text-xs uppercase tracking-[0.3em]", soft)}>Foco ativo</p>
              {focusTask && <h2 className="mt-1 text-2xl font-bold">{focusTask.title}</h2>}
            </div>

            {amb.clock ? (
              <div className="my-4 flex flex-col items-center gap-2">
                <AnalogClock stroke="#ffffff" />
                <div className="text-4xl font-bold tabular-nums opacity-80">{mm}:{ss}</div>
              </div>
            ) : (
              <div className="my-6 flex items-center gap-4 font-bold tabular-nums" style={{ fontSize: "clamp(5rem, 17vw, 13rem)", lineHeight: 1 }}>
                <span>{mm}</span>
                <span className="opacity-40">:</span>
                <span>{ss}</span>
              </div>
            )}

            <div className={cn("h-1 w-72 max-w-[80vw] overflow-hidden rounded-full", trackBg)}>
              <motion.div className={cn("h-full rounded-full", fill)} animate={{ width: `${progress}%` }} transition={{ ease: "linear", duration: 0.4 }} />
            </div>

            {/* Controle de tempo (some quando rodando) */}
            <AnimatePresence>
              {!running && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 flex items-center gap-3 overflow-hidden">
                  <button onClick={() => setDurationMin(durationMin - 5)} className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors", ctrl)}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex flex-col items-center">
                    <input type="range" min={5} max={120} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={cn("w-56 max-w-[60vw] cursor-pointer", m === "light" ? "accent-neutral-900" : m === "themed" ? "accent-primary" : "accent-white")} />
                    <span className={cn("mt-1 text-xs", soft)}>{durationMin} min</span>
                  </div>
                  <button onClick={() => setDurationMin(durationMin + 5)} className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors", ctrl)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex items-center gap-4">
              <button onClick={reset} className={cn("rounded-full p-3 transition-colors", ctrl)}>
                <RotateCcw className="h-5 w-5" />
              </button>
              <button onClick={() => setRunning((r) => !r)} className={cn("flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105", solid)}>
                {running ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
              </button>
              <div className="w-11" />
            </div>

            {focusTask && (
              <button onClick={completeTask} className={cn("mt-8 flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition-colors", m === "light" ? "border-black/20 hover:bg-black/5" : m === "themed" ? "border-border hover:bg-accent" : "border-white/20 hover:bg-white/10")}>
                <Check className="h-4 w-4" />
                Concluir tarefa
              </button>
            )}

            {/* Toolbar discreta */}
            <div ref={toolbarRef} className="absolute bottom-6 right-6 flex flex-col items-end gap-3">
              {/* Painel Ambiente */}
              <AnimatePresence>
                {panel === "ambient" && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} className={cn("w-60 rounded-2xl border p-4 shadow-xl", panelCls)}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide opacity-70">Ambiente</p>
                    <div className="grid grid-cols-3 gap-2">
                      {AMBIENTS.map((a, i) => (
                        <button key={a.id} onClick={() => setAmbient(i)} className="flex flex-col items-center gap-1">
                          <span className={cn("h-12 w-full overflow-hidden rounded-lg border-2 transition-transform hover:scale-105", a.bg, ambient === i ? ring : "border-transparent")} />
                          <span className="text-[10px] opacity-70">{a.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Painel Sons — mantido montado enquanto o foco está aberto (áudio persiste) */}
              <div className={cn("w-[min(92vw,640px)] rounded-2xl border p-4 shadow-xl", panelCls, panel === "sounds" ? "block" : "hidden")}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide opacity-70">Mixer de sons</p>
                <SoundMixer />
              </div>

              <div className="flex items-center gap-2 self-end">
                <button onClick={() => setPanel((p) => (p === "sounds" ? "none" : "sounds"))} className={cn("rounded-full border p-3 transition-colors", panel === "sounds" ? solid : cn("border-transparent", ctrl))} title="Sons">
                  <Music className="h-5 w-5" />
                </button>
                <button onClick={() => setPanel((p) => (p === "ambient" ? "none" : "ambient"))} className={cn("rounded-full border p-3 transition-colors", panel === "ambient" ? solid : cn("border-transparent", ctrl))} title="Ambiente">
                  <Palette className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer minimizado — discreto, permite navegar pela plataforma */}
      <AnimatePresence>
        {open && minimized && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            onClick={() => setMinimized(false)}
            aria-label="Restaurar modo foco"
            className="fixed bottom-20 right-4 z-[110] flex items-center gap-3 rounded-2xl border border-border/50 bg-card/90 px-4 py-3 shadow-lg backdrop-blur-xl transition-transform hover:scale-[1.03] md:bottom-6 md:right-6"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <div className="text-left">
              <p className="text-lg font-bold leading-none tabular-nums text-foreground">{mm}:{ss}</p>
              {focusTask && <p className="mt-0.5 max-w-[140px] truncate text-xs text-muted-foreground">{focusTask.title}</p>}
            </div>
            <Maximize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </FocusContext.Provider>
  )
}
