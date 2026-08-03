"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toIcs } from "@/lib/ics"
import { IcsImportDialog } from "@/components/ics-import-dialog"
import { CalendarPlus, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

// Importar/exportar agenda (.ics) — mora nas Configurações, como no Google
// Calendar, pra não poluir a tela do calendário. Importar reaproveita o dialog
// (com prévia + dedupe); exportar baixa todos os blocos como .ics (UTC + RRULE).
export function AgendaIo() {
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const supabase = createClient()

  const exportarIcs = async () => {
    setExporting(true)
    const { data } = await supabase
      .from("time_blocks")
      .select("id, title, description, start_time, end_time, recurrence_rule")
    const eventos = (data ?? []).map((b) => ({
      uid: b.id as string,
      title: b.title as string,
      start: new Date(b.start_time as string),
      end: new Date(b.end_time as string),
      description: (b.description as string | null) ?? null,
      recurrence: (["daily", "weekly", "weekdays"] as const).find((r) => r === b.recurrence_rule) ?? null,
    }))
    setExporting(false)
    if (eventos.length === 0) { toast.info("Nenhum bloco pra exportar ainda."); return }
    const blob = new Blob([toIcs(eventos)], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "neurotask.ics"
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${eventos.length} ${eventos.length === 1 ? "bloco exportado" : "blocos exportados"} (.ics)`)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:border-border"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <CalendarPlus className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Importar</span>
          <span className="block text-xs text-muted-foreground">
            Traga sua agenda de um arquivo .ics (Google Calendar, Outlook…)
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={exportarIcs}
        disabled={exporting}
        className="flex w-full items-center gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:border-border disabled:opacity-60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Exportar</span>
          <span className="block text-xs text-muted-foreground">
            Baixe seus blocos como .ics pra usar em outro calendário
          </span>
        </span>
      </button>

      <IcsImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => {}} />
    </div>
  )
}
