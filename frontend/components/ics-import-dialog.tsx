"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { parseIcs, type IcsEvent } from "@/lib/ics"
import { cn } from "@/lib/utils"
import { useTimeFormat } from "@/hooks/use-time-format"
import { formatTime, type TimeFormat } from "@/lib/time-format"
import { CalendarPlus, Upload, Loader2, Repeat } from "lucide-react"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

const IMPORT_COLOR = "#3b82f6"
const RECUR_LABEL: Record<NonNullable<IcsEvent["recurrence"]>, string> = {
  daily: "diário",
  weekly: "semanal",
  weekdays: "dias úteis",
}

// Chave de dedupe: mesmo título + mesmo minuto de início (o start é gravado em
// ISO/UTC nos dois lados). Reimportar o mesmo arquivo não duplica.
const dedupeKey = (title: string, startISO: string) => `${title.trim().toLowerCase()}|${startISO.slice(0, 16)}`

function formatWhen(e: IcsEvent, f: TimeFormat): string {
  const dia = e.start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  if (e.allDay) return `${dia} · dia inteiro`
  return `${dia} · ${formatTime(e.start, f)}–${formatTime(e.end, f)}`
}

export function IcsImportDialog({ open, onOpenChange, onImported }: Props) {
  const timeFormat = useTimeFormat()
  const [fileName, setFileName] = useState("")
  const [events, setEvents] = useState<IcsEvent[]>([])
  const [dupes, setDupes] = useState<Set<number>>(new Set())
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const reset = () => {
    setFileName(""); setEvents([]); setDupes(new Set()); setSel(new Set()); setError(null)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setParsing(true); setError(null); setFileName(file.name)
    try {
      const text = await file.text()
      const parsed = parseIcs(text)
      if (parsed.length === 0) {
        setError("Não encontrei eventos nesse arquivo. Exporte a agenda como .ics no seu calendário.")
        setEvents([]); setSel(new Set()); setDupes(new Set())
        return
      }
      // Dedupe contra os blocos já existentes
      const { data } = await supabase.from("time_blocks").select("title, start_time")
      const existing = new Set((data ?? []).map((b) => dedupeKey(b.title, b.start_time)))
      const dupeSet = new Set<number>()
      const selSet = new Set<number>()
      parsed.forEach((e, i) => {
        if (existing.has(dedupeKey(e.title, e.start.toISOString()))) dupeSet.add(i)
        else selSet.add(i) // pré-seleciona só os que ainda não existem
      })
      setEvents(parsed); setDupes(dupeSet); setSel(selSet)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não consegui ler o arquivo.")
    } finally {
      setParsing(false)
    }
  }

  const toggle = (i: number) =>
    setSel((prev) => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  const allImportable = events.map((_, i) => i).filter((i) => !dupes.has(i))
  const allSelected = allImportable.length > 0 && allImportable.every((i) => sel.has(i))
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(allImportable))

  const doImport = async () => {
    const chosen = [...sel].filter((i) => !dupes.has(i))
    if (chosen.length === 0) return
    setImporting(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Você precisa estar logado."); setImporting(false); return }

    const rows = chosen.map((i) => {
      const e = events[i]
      const desc = [e.description, e.location ? `📍 ${e.location}` : null].filter(Boolean).join("\n\n") || null
      return {
        title: e.title,
        description: desc,
        start_time: e.start.toISOString(),
        end_time: e.end.toISOString(),
        color: IMPORT_COLOR,
        task_id: null,
        recurrence_rule: e.recurrence,
        is_recurring: e.recurrence !== null,
        user_id: user.id,
      }
    })

    const { error: insErr } = await supabase.from("time_blocks").insert(rows)
    setImporting(false)
    if (insErr) { setError(insErr.message); return }
    toast.success(`${rows.length} ${rows.length === 1 ? "evento importado" : "eventos importados"}! 📅`)
    onImported()
    onOpenChange(false)
    reset()
  }

  const chosenCount = [...sel].filter((i) => !dupes.has(i)).length

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}
    >
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Importar agenda (.ics)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload */}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/40">
            {parsing ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
            <span className="text-sm font-medium">{fileName || "Escolher arquivo .ics"}</span>
            <span className="max-w-sm text-xs text-muted-foreground">
              No Google Calendar: Configurações → Importar e exportar → <b>Exportar</b> (baixa um .zip com o .ics).
            </span>
            <input type="file" accept=".ics,text/calendar" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          {/* Prévia */}
          {events.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{events.length} {events.length === 1 ? "evento" : "eventos"} · {dupes.size > 0 && `${dupes.size} já existe(m) · `}selecione o que criar</span>
                <button onClick={toggleAll} className="font-medium text-primary hover:underline">
                  {allSelected ? "Desmarcar todos" : "Marcar todos"}
                </button>
              </div>
              <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
                {events.map((e, i) => {
                  const isDupe = dupes.has(i)
                  const checked = sel.has(i) && !isDupe
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isDupe}
                      onClick={() => toggle(i)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                        isDupe ? "border-border/40 opacity-50" : checked ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-border"
                      )}
                    >
                      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {checked && <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{e.title}</span>
                          {e.recurrence && (
                            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                              <Repeat className="h-2.5 w-2.5" /> {RECUR_LABEL[e.recurrence]}
                            </span>
                          )}
                          {isDupe && <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">já existe</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{formatWhen(e, timeFormat)}{e.location ? ` · ${e.location}` : ""}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={doImport} disabled={importing || chosenCount === 0}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {chosenCount > 0 ? `Importar ${chosenCount}` : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
