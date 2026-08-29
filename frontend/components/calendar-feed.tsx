"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { feedUrl, newFeedToken } from "@/lib/calendar-feed"
import { Loader2, Copy, Check, RefreshCw, CalendarClock } from "lucide-react"
import { toast } from "sonner"

// Assinar a agenda no Google/Outlook (feed .ics só-leitura). Guarda/gera o token
// secreto do usuário em calendar_feeds e mostra a URL pra colar no outro app.
// Ver supabase/calendar_feed.sql e a rota app/api/calendar/[token].

function explica(err: { code?: string; message: string }): string {
  if (err.code === "42P01") return "A tabela do feed ainda não existe. Rode supabase/calendar_feed.sql no Supabase."
  if (err.code === "PGRST205") return "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e recarregue."
  if (err.code === "42501") return "Sem permissão (RLS). Confira se as policies do calendar_feed.sql foram criadas."
  return err.message
}

export function CalendarFeed() {
  const [supabase] = useState(() => createClient())
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => setOrigin(window.location.origin), [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (alive) setLoading(false); return }
      const { data, error } = await supabase.from("calendar_feeds").select("token").maybeSingle()
      if (!alive) return
      if (error) setError(explica(error))
      else setToken(data?.token ?? null)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [supabase])

  // Cria (ou regenera) o token. Regenerar invalida o link antigo — quem tinha
  // assinado para de receber, de propósito.
  const gerar = async () => {
    setBusy(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const t = newFeedToken()
    const { error } = await supabase.from("calendar_feeds").upsert({ user_id: user.id, token: t }, { onConflict: "user_id" })
    setBusy(false)
    if (error) { setError(explica(error)); return }
    setToken(t)
    toast.success("Link de assinatura pronto! 📆")
  }

  const copiar = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(feedUrl(token, origin))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success("Link copiado! Cole no seu calendário, em \"assinar por URL\".")
    } catch {
      toast.error("Não consegui copiar — selecione o link e copie manualmente.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-9 items-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Assine sua agenda no Google Calendar, Outlook e outros: eles leem este link e mostram seus
        blocos, atualizando sozinhos. É só-leitura — ninguém edita sua agenda por aqui.
      </p>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {token ? (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={feedUrl(token, origin)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border/50 bg-muted/40 px-3 font-mono text-xs outline-none"
            />
            <button
              type="button"
              onClick={copiar}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar
            </button>
          </div>

          <button
            type="button"
            onClick={gerar}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Gerar novo link (invalida o antigo)
          </button>

          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            No Google Calendar: <b>Outros calendários → Adicionar → De URL</b>, cole o link. A
            atualização do lado deles pode levar horas — o Google reamostra quando quer.
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={gerar}
          disabled={busy}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          Gerar link de assinatura
        </button>
      )}
    </div>
  )
}
