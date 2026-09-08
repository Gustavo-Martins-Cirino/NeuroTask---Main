"use client"

import { useEffect, useState } from "react"
import { useDicionario, useLocale } from "@/hooks/use-idioma"
import { enfatizar } from "@/lib/enfase"
import { Header } from "@/components/header"
import { ErrorsPanel } from "@/components/errors-panel"
import { AgendaIo } from "@/components/agenda-io"
import { CalendarFeed } from "@/components/calendar-feed"
import { AgendaPublica } from "@/components/agenda-publica"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { nomeDeExibicao } from "@/lib/nome-usuario"
import { motion } from "framer-motion"
import { Settings, User, Palette, LogOut, Check, Loader2, Sun, Moon, Monitor, Clock, Minus, Plus, Trash2, Bell, Sparkles, X, Send, CalendarSync, CalendarClock, Share2 } from "lucide-react"
import { enablePush, disablePush, getPushStatus, pushSupported } from "@/lib/push"
import { generateTelegramCode, fetchTelegramLinks, unlinkTelegram, type TelegramLink } from "@/lib/telegram"
import { fetchRoutineSuggestions, ignoreSuggestion, type RoutineSuggestion } from "@/lib/routine-insights"
import { SeletorRegiao } from "@/components/seletor-regiao"
import { FotoPerfilCampo } from "@/components/foto-perfil-campo"
import { toast } from "sonner"
import {
  fetchRoutine, saveRoutine, DEFAULT_ROUTINE, type RoutineProfile,
  fetchActivities, addActivity, updateActivityDuration, deleteActivity,
  ACTIVITY_CATEGORIES, categoryColor, type RoutineActivity, type ActivityCategory,
} from "@/lib/routine"

const themeOptions = [
  { value: "light", chave: "claro", icon: Sun },
  { value: "dark", chave: "escuro", icon: Moon },
  { value: "system", chave: "sistema", icon: Monitor },
] as const

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
      className="rounded-2xl border border-border/40 bg-card/30 p-4 md:p-6"
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
  const traducao = useDicionario()
  const locale = useLocale()
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
      toast(traducao.configuracoes.notificacoes.toastDesativadas)
    } else {
      const err = await enablePush()
      if (err) toast.error(traducao.configuracoes.notificacoes.erroAtivar, { description: err })
      else {
        setPushOn(true)
        toast.success(traducao.configuracoes.notificacoes.toastAtivadas, {
          description: traducao.configuracoes.notificacoes.toastAtivadasDetalhe,
        })
      }
    }
    setPushBusy(false)
  }

  const [tgLinks, setTgLinks] = useState<TelegramLink[]>([])
  const [tgPairing, setTgPairing] = useState<{ code: string; expiresAt: string } | null>(null)
  const [tgBusy, setTgBusy] = useState(false)
  const [tgLeft, setTgLeft] = useState(0)

  useEffect(() => {
    fetchTelegramLinks().then(setTgLinks)
  }, [])

  useEffect(() => {
    if (!tgPairing) return
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(tgPairing.expiresAt).getTime() - Date.now()) / 1000))
      setTgLeft(left)
      if (left === 0) setTgPairing(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tgPairing])

  const handleGenerateTelegramCode = async () => {
    setTgBusy(true)
    const result = await generateTelegramCode()
    setTgBusy(false)
    if (!result) {
      toast.error(traducao.configuracoes.telegram.erroGerar, { description: traducao.configuracoes.telegram.tenteNovamente })
      return
    }
    setTgPairing(result)
    // O vínculo nasce do lado do bot: recarrega para ele aparecer aqui.
    setTimeout(() => fetchTelegramLinks().then(setTgLinks), 15_000)
  }

  const handleUnlinkTelegram = async (id: string) => {
    setTgLinks((prev) => prev.filter((l) => l.id !== id))
    await unlinkTelegram(id)
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
    toast.success(traducao.configuracoes.rotina.toastAtualizada)
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
        // Sem ler `full_name`, o campo nascia vazio para quem entrou por Google ou
        // GitHub — e parecia que o app tinha perdido o nome da pessoa.
        const n = nomeDeExibicao(user.user_metadata, null)
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
      <Header title={traducao.telas.configuracoes} icon={<Settings className="h-4 w-4" />} />

      <div className="flex-1 px-4 py-8 md:px-6">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <Section icon={<User className="h-5 w-5" />} title={traducao.configuracoes.perfil.titulo} description={traducao.configuracoes.perfil.descricao}>
            <div className="space-y-4">
              <FotoPerfilCampo nome={name || initialName} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{traducao.configuracoes.perfil.nome}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={traducao.configuracoes.perfil.nomePlaceholder}
                  className="h-10 w-full rounded-lg border border-border/50 bg-transparent px-3 text-sm outline-none transition-colors focus:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{traducao.configuracoes.perfil.email}</label>
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
                {saved ? traducao.configuracoes.perfil.salvo : traducao.configuracoes.perfil.salvar}
              </button>
            </div>
          </Section>

          <Section icon={<Palette className="h-5 w-5" />} title={traducao.configuracoes.aparencia.titulo} description={traducao.configuracoes.aparencia.descricao}>
            {mounted && (
              <div className="space-y-4">
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
                        <span className="text-sm font-medium">{traducao.configuracoes.aparencia[opt.chave]}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="space-y-2 border-t border-border/40 pt-4">
                  <p className="text-sm font-medium">{traducao.configuracoes.aparencia.regiao}</p>
                  <p className="text-xs text-muted-foreground">
                    {traducao.configuracoes.aparencia.regiaoAjuda}
                  </p>
                  <SeletorRegiao />
                </div>
              </div>
            )}
          </Section>

          <Section
            icon={<Clock className="h-5 w-5" />}
            title={traducao.configuracoes.rotina.titulo}
            description={traducao.configuracoes.rotina.descricao}
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <RoutineField
                  label={traducao.configuracoes.rotina.sonoDesejado}
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
                  <span className="block text-sm font-medium">{traducao.configuracoes.rotina.avisos}</span>
                  <span className="block text-xs text-muted-foreground">
                    {traducao.configuracoes.rotina.avisosDetalhe}
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
                {routineSaved ? "Salvo" : traducao.configuracoes.rotina.salvar}
              </button>

              {/* Minhas atividades de rotina */}
              <div className="space-y-2 border-t border-border/40 pt-4">
                <p className="text-sm font-medium">{traducao.configuracoes.rotina.minhasAtividades}</p>
                <p className="text-xs text-muted-foreground">{traducao.configuracoes.rotina.atividadesAjuda}</p>

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
                          aria-label={traducao.configuracoes.rotina.excluir}
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
                    placeholder={traducao.configuracoes.rotina.nomePlaceholder}
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
                    {traducao.configuracoes.rotina.adicionar}
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
                          {s.kind === "new"
                            ? enfatizar(
                                traducao.configuracoes.rotina.sugestaoNova(
                                  s.title,
                                  s.days,
                                  ACTIVITY_CATEGORIES.find((c) => c.value === s.category)?.label.toLowerCase() ?? s.category,
                                  s.minutes
                                )
                              )
                            : enfatizar(traducao.configuracoes.rotina.sugestaoAjuste(s.title, s.to, s.samples, s.from))}
                        </span>
                        <button
                          type="button"
                          onClick={() => acceptSuggestion(s)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85"
                          title={traducao.configuracoes.rotina.aceitar}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissSuggestion(s)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-colors hover:bg-accent"
                          title={traducao.configuracoes.rotina.ignorar}
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
            icon={<CalendarSync className="h-5 w-5" />}
            title={traducao.configuracoes.importarExportar.titulo}
            description={traducao.configuracoes.importarExportar.descricao}
          >
            <AgendaIo />
          </Section>

          <Section
            icon={<CalendarClock className="h-5 w-5" />}
            title={traducao.configuracoes.assinar.titulo}
            description={traducao.configuracoes.assinar.descricao}
          >
            <CalendarFeed />
          </Section>

          <Section
            icon={<Share2 className="h-5 w-5" />}
            title={traducao.configuracoes.compartilharAgenda.titulo}
            description={traducao.configuracoes.compartilharAgenda.descricao}
          >
            <AgendaPublica />
          </Section>

          <Section
            icon={<Bell className="h-5 w-5" />}
            title={traducao.configuracoes.notificacoes.titulo}
            description={traducao.configuracoes.notificacoes.descricao}
          >
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushBusy}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:border-border disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-medium">{traducao.configuracoes.notificacoes.nesteDispositivo}</span>
                <span className="block text-xs text-muted-foreground">
                  {pushSupported()
                    ? traducao.configuracoes.notificacoes.suportado
                    : traducao.configuracoes.notificacoes.naoSuportado}
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

          <Section
            icon={<Send className="h-5 w-5" />}
            title={traducao.configuracoes.telegram.titulo}
            description={traducao.configuracoes.telegram.descricao}
          >
            <div className="space-y-3">
              {tgPairing ? (
                <div className="rounded-xl border border-border/50 p-4 text-center">
                  <p className="text-2xl font-bold tracking-[0.3em] tabular-nums">{tgPairing.code}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {traducao.configuracoes.telegram.mandeParaOBot}{" "}
                    <code className="rounded bg-muted px-1 py-0.5">/start {tgPairing.code}</code>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {traducao.configuracoes.telegram.expiraEm(`${Math.floor(tgLeft / 60)}:${String(tgLeft % 60).padStart(2, "0")}`)}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateTelegramCode}
                  disabled={tgBusy}
                  className="flex h-9 items-center gap-2 rounded-lg border border-border/50 px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {tgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {traducao.configuracoes.telegram.gerarCodigo}
                </button>
              )}

              {tgLinks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{traducao.configuracoes.telegram.conversasConectadas}</p>
                  {tgLinks.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3"
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {l.username ? `@${l.username}` : traducao.configuracoes.telegram.conversaSemNome}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {l.last_seen_at
                            ? traducao.configuracoes.telegram.ultimaMensagem(new Date(l.last_seen_at).toLocaleDateString(locale))
                            : traducao.configuracoes.telegram.semMensagens}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnlinkTelegram(l.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                {traducao.configuracoes.telegram.ajudaComandos}
              </p>
            </div>
          </Section>

          <ErrorsPanel />

          <Section icon={<LogOut className="h-5 w-5" />} title={traducao.configuracoes.conta.titulo}>
            <button
              onClick={signOut}
              className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {traducao.configuracoes.conta.sair}
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}
