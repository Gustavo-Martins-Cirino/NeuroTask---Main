"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { feedUrl, newFeedToken } from "@/lib/calendar-feed"
import { Loader2, Copy, Check, RefreshCw, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { useDicionario } from "@/hooks/use-idioma"
import { enfatizar } from "@/lib/enfase"
import { type Dicionario } from "@/lib/i18n"

// Assinar a agenda no Google/Outlook (feed .ics só-leitura). Guarda/gera o token
// secreto do usuário em calendar_feeds e mostra a URL pra colar no outro app.
// Ver supabase/calendar_feed.sql e a rota app/api/calendar/[token].

type Textos = Dicionario["configuracoes"]["assinar"]

// A mensagem do banco vem em inglês do PostgREST; o que traduzimos é a
// EXPLICAÇÃO, que é a parte que diz qual .sql rodar. Código desconhecido cai na
// mensagem original de propósito: inventar texto esconderia a causa.
function explica(err: { code?: string; message: string }, t: Textos): string {
  if (err.code === "42P01") return t.erroSemTabela
  if (err.code === "PGRST205") return t.erroCacheSchema
  if (err.code === "42501") return t.erroPermissao
  return err.message
}

export function CalendarFeed() {
  const t = useDicionario().configuracoes.assinar
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
      if (error) setError(explica(error, t))
      else setToken(data?.token ?? null)
      setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // Cria (ou regenera) o token. Regenerar invalida o link antigo — quem tinha
  // assinado para de receber, de propósito.
  const gerar = async () => {
    setBusy(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const novo = newFeedToken()
    const { error } = await supabase.from("calendar_feeds").upsert({ user_id: user.id, token: novo }, { onConflict: "user_id" })
    setBusy(false)
    if (error) { setError(explica(error, t)); return }
    setToken(novo)
    toast.success(t.toastPronto)
  }

  const copiar = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(feedUrl(token, origin))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success(t.toastCopiado)
    } catch {
      toast.error(t.erroCopiar)
    }
  }

  if (loading) {
    return (
      <div className="flex h-9 items-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.carregando}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.explicacao}</p>

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
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t.copiar}
            </button>
          </div>

          <button
            type="button"
            onClick={gerar}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t.gerarNovo}
          </button>

          <p className="text-[11px] leading-relaxed text-muted-foreground/70">{enfatizar(t.ondeColar)}</p>
        </>
      ) : (
        <button
          type="button"
          onClick={gerar}
          disabled={busy}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          {t.gerar}
        </button>
      )}
    </div>
  )
}
