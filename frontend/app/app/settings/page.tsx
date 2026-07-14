"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Settings, User, Palette, LogOut, Check, Loader2, Sun, Moon, Monitor, Bot, Clock, Minus, Plus, Trash2, Bell, Sparkles, X } from "lucide-react"
import { enablePush, disablePush, getPushStatus, pushSupported } from "@/lib/push"
import { fetchRoutineSuggestions, ignoreSuggestion, type RoutineSuggestion } from "@/lib/routine-insights"
import { toast } from "sonner"
import {
  fetchRoutine, saveRoutine, DEFAULT_ROUTINE, type RoutineProfile,
  fetchActivities, addActivity, updateActivityDuration, deleteActivity,
  ACTIVITY_CATEGORIES, categoryColor, type RoutineActivity, type ActivityCategory,
} from "@/lib/routine"

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
  const [activities, setActivities] = useState<RoutineActivity[]>([])
  const [newName, setNewName] = useState("")
  const [newCategory, setNewCategory] = useState<ActivityCategory>("deslocamento")
  const [newDuration, setNewDuration] = useState(30)
  const [addingActivity, setAddingActivity] = useState(false)

  useEffect(() => {
    fetchRoutine().then(setRoutine)
    fetchActivities().then(setActivities)
  }, [])

  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    getPushStatus().then(setPushOn)
  }, [])

  const handleTogglePush = async () => {
    setPushBusy(true)
    if (pushOn) {
      await disablePush()
      setPushOn(false)
      toast("Notificações desativadas neste dispositivo.")
    } else {
      const err = await enablePush()
      if (err) toast.error("Não deu para ativar", { description: err })
      else {
        setPushOn(true)
        toast.success("Notificações ativadas! 🔔", {
          description: "Lembretes e check-ins chegam mesmo com o app fechado.",
        })
      }
    }
    setPushBusy(false)
  }

  const handleAddActivity = async () => {
    const name = newName.trim()
    if (!name) return
    setAddingActivity(true)
    const { activity } = await addActivity({ name, category: newCategory, duration_minutes: newDuration })
    setAddingActivity(false)
    if (activity) {
      setActivities((prev) => [...prev, activity])
      setNewName("")
    }
  }

  const handleActivityDuration = (id: string, v: number) => {
    const value = Math.max(5, v)
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, duration_minutes: value } : a)))
    updateActivityDuration(id, value)
  }

  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
    deleteActivity(id)
  }

  // Rotina aprendida — sugestões mineradas dos seus blocos e check-ins
  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([])

  useEffect(() => {
    let alive = true
    fetchRoutineSuggestions(activities).then((s) => {
      if (alive) setSuggestions(s)
    })
    return () => { alive = false }
  }, [activities])

  const acceptSuggestion = async (s: RoutineSuggestion) => {
    if (s.kind === "new") {
      const { activity } = await addActivity({ name: s.title, category: s.category, duration_minutes: s.minutes })
      if (activity) setActivities((prev) => [...prev, activity])
    } else {
      handleActivityDuration(s.activityId, s.to)
    }
    ignoreSuggestion(s.key)
    setSuggestions((prev) => prev.filter((x) => x.key !== s.key))
    toast.success("Rotina atualizada! ✨")
  }

  const dismissSuggestion = (s: RoutineSuggestion) => {
    ignoreSuggestion(s.key)
    setSuggestions((prev) => prev.filter((x) => x.key !== s.key))
  }

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

              {/* Minhas atividades de rotina */}
              <div className="space-y-2 border-t border-border/40 pt-4">
                <p className="text-sm font-medium">Minhas atividades</p>
                <p className="text-xs text-muted-foreground">
                  Atividades nomeadas com duração — viram blocos de 1 toque no calendário e alimentam
                  o planejamento da Neuro. Ex.: &quot;Deslocamento → Trabalho&quot;, &quot;Se arrumar (evento)&quot;.
                </p>

                {activities.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {activities.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(a.category) }} />
                        <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleActivityDuration(a.id, a.duration_minutes - 5)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-14 text-center text-xs font-semibold tabular-nums">{a.duration_minutes} min</span>
                          <button
                            type="button"
                            onClick={() => handleActivityDuration(a.id, a.duration_minutes + 5)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(a.id)}
                          aria-label="Excluir atividade"
                          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Adicionar atividade */}
                <div className="space-y-2 rounded-xl border border-dashed border-border/60 p-3">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddActivity() }}
                    placeholder="Nome — ex.: Deslocamento → Trabalho"
                    className="h-9 w-full rounded-lg border border-border/50 bg-transparent px-3 text-sm outline-none transition-colors focus:border-primary/40"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {ACTIVITY_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewCategory(c.value)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          newCategory === c.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-border"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNewDuration((v) => Math.max(5, v - 5))}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 text-muted-foreground hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-14 text-center text-xs font-semibold tabular-nums">{newDuration} min</span>
                      <button
                        type="button"
                        onClick={() => setNewDuration((v) => v + 5)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 text-muted-foreground hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddActivity}
                    disabled={addingActivity || !newName.trim()}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
                  >
                    {addingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Adicionar atividade
                  </button>
                </div>

                {/* Rotina aprendida — sugestões dos padrões reais */}
                {suggestions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> Sugestões da sua rotina
                    </p>
                    {suggestions.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 text-xs leading-relaxed">
                          {s.kind === "new" ? (
                            <>
                              Você fez <strong>{s.title}</strong> em {s.days} dias diferentes — salvar como
                              atividade de {ACTIVITY_CATEGORIES.find((c) => c.value === s.category)?.label.toLowerCase() ?? s.category} de{" "}
                              <strong>{s.minutes} min</strong>?
                            </>
                          ) : (
                            <>
                              Em <strong>{s.title}</strong> você leva ~<strong>{s.to} min</strong> na prática
                              ({s.samples} check-ins), não {s.from} — ajustar?
                            </>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => acceptSuggestion(s)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85"
                          title="Aceitar sugestão"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissSuggestion(s)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-colors hover:bg-accent"
                          title="Ignorar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section
            icon={<Bell className="h-5 w-5" />}
            title="Notificações"
            description="Lembretes e check-ins mesmo com o app fechado"
          >
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushBusy}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:border-border disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-medium">Notificações neste dispositivo</span>
                <span className="block text-xs text-muted-foreground">
                  {pushSupported()
                    ? "Ative em cada aparelho que quiser receber (celular, computador)."
                    : "Não suportado neste navegador. No iPhone: adicione o app à tela de início e ative por lá."}
                </span>
              </span>
              <span
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  pushOn ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    pushOn ? "left-[22px]" : "left-0.5"
                  )}
                />
              </span>
            </button>
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
