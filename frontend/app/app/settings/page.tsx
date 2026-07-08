"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Settings, User, Palette, LogOut, Check, Loader2, Sun, Moon, Monitor, Bot, Clock, Minus, Plus } from "lucide-react"
import { fetchRoutine, saveRoutine, DEFAULT_ROUTINE, type RoutineProfile } from "@/lib/routine"

const themeOptions = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
]

function RoutineField({
  label,
  value,
  suffix,
  step,
  min,
  onChange,
}: {
  label: string
  value: number
  suffix: string
  step: number
  min: number
  onChange: (v: number) => void
}) {
  const adjust = (delta: number) => onChange(Math.max(min, Math.round((value + delta) * 10) / 10))
  return (
    <div className="rounded-xl border border-border/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => adjust(-step)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-semibold tabular-nums">
          {String(value).replace(".", ",")} {suffix}
        </span>
        <button
          type="button"
          onClick={() => adjust(step)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function Section({ icon, title, description, children }: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-card/30 p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [initialName, setInitialName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [routine, setRoutine] = useState<RoutineProfile>({ ...DEFAULT_ROUTINE })
  const [routineSaving, setRoutineSaving] = useState(false)
  const [routineSaved, setRoutineSaved] = useState(false)

  useEffect(() => {
    fetchRoutine().then(setRoutine)
  }, [])

  const handleSaveRoutine = async () => {
    setRoutineSaving(true)
    const err = await saveRoutine(routine)
    setRoutineSaving(false)
    if (!err) {
      setRoutineSaved(true)
      setTimeout(() => setRoutineSaved(false), 1800)
    }
  }

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const n = user.user_metadata?.name || ""
        setName(n)
        setInitialName(n)
        setEmail(user.email ?? "")
      }
    })
  }, [supabase])

  const saveName = async () => {
    setSaving(true)
    await supabase.auth.updateUser({ data: { name } })
    setInitialName(name)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Configurações" icon={<Settings className="h-4 w-4" />} />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <Section icon={<User className="h-5 w-5" />} title="Perfil" description="Seu nome e email">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-10 w-full rounded-lg border border-border/50 bg-transparent px-3 text-sm outline-none transition-colors focus:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input
                  value={email}
                  disabled
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-border/50 bg-muted/40 px-3 text-sm text-muted-foreground"
                />
              </div>
              <button
                onClick={saveName}
                disabled={saving || name === initialName}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
                {saved ? "Salvo" : "Salvar"}
              </button>
            </div>
          </Section>

          <Section icon={<Palette className="h-5 w-5" />} title="Aparência" description="Tema da interface">
            {mounted && (
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((opt) => {
                  const active = theme === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                        active ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      <opt.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </Section>

          <Section
            icon={<Clock className="h-5 w-5" />}
            title="Rotina"
            description="Seus tempos pessoais — usados pelo planejamento e pelos avisos do calendário"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <RoutineField
                  label="Se arrumar"
                  value={routine.get_ready_minutes}
                  suffix="min"
                  step={5}
                  min={5}
                  onChange={(v) => setRoutine({ ...routine, get_ready_minutes: v })}
                />
                <RoutineField
                  label="Refeição"
                  value={routine.meal_minutes}
                  suffix="min"
                  step={5}
                  min={5}
                  onChange={(v) => setRoutine({ ...routine, meal_minutes: v })}
                />
                <RoutineField
                  label="Deslocamento"
                  value={routine.commute_minutes}
                  suffix="min"
                  step={5}
                  min={0}
                  onChange={(v) => setRoutine({ ...routine, commute_minutes: v })}
                />
                <RoutineField
                  label="Sono desejado"
                  value={routine.sleep_hours}
                  suffix="h"
                  step={0.5}
                  min={4}
                  onChange={(v) => setRoutine({ ...routine, sleep_hours: v })}
                />
              </div>

              <button
                type="button"
                onClick={() => setRoutine({ ...routine, calendar_warnings: !routine.calendar_warnings })}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:border-border"
              >
                <span>
                  <span className="block text-sm font-medium">Avisos inteligentes no calendário</span>
                  <span className="block text-xs text-muted-foreground">
                    Sono curto antes de compromissos, telas perto da hora de dormir
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    routine.calendar_warnings ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      routine.calendar_warnings ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </span>
              </button>

              <button
                onClick={handleSaveRoutine}
                disabled={routineSaving}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
              >
                {routineSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : routineSaved ? <Check className="h-4 w-4" /> : null}
                {routineSaved ? "Salvo" : "Salvar rotina"}
              </button>
            </div>
          </Section>

          <Section icon={<Bot className="h-5 w-5" />} title="Neuro IA" description="Assistente de produtividade">
            <p className="text-sm text-muted-foreground">
              O provedor de IA é configurado no servidor (variável de ambiente no
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>).
              Atualmente o app suporta Groq, Gemini e Claude — basta ter a chave correspondente.
            </p>
          </Section>

          <Section icon={<LogOut className="h-5 w-5" />} title="Conta">
            <button
              onClick={signOut}
              className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}
