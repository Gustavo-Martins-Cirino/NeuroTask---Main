"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { newFeedToken } from "@/lib/calendar-feed"
import { Loader2, Copy, Check, RefreshCw, Share2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useDicionario } from "@/hooks/use-idioma"
import type { Dicionario } from "@/lib/i18n"

// Compartilhar a agenda com quem NÃO usa o app (Configurações). Guarda/gera o
// token secreto em agenda_shares e mostra o link de /agenda/<token>.
// Ver supabase/agenda_publica.sql.
//
// Reaproveita `newFeedToken` do feed .ics: o segredo tem o mesmo trabalho (128
// bits do CSPRNG) e duplicar a função só criaria a chance de uma delas piorar.

const HORIZONTES = [7, 14, 30] as const

function explica(err: { code?: string; message: string }, d: Dicionario): string {
  if (err.code === "42P01") return d.compartilhar.erroSemTabela
  if (err.code === "PGRST205") return d.compartilhar.erroCacheSchema
  if (err.code === "42501") return d.compartilhar.erroPermissao
  return err.message
}

export function AgendaPublica() {
  const d = useDicionario()
  const [supabase] = useState(() => createClient())
  const [token, setToken] = useState<string | null>(null)
  const [dias, setDias] = useState<number>(14)
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
      const { data, error } = await supabase.from("agenda_shares").select("token, dias").maybeSingle()
      if (!alive) return
      if (error) setError(explica(error, d))
      else if (data) { setToken(data.token); setDias(data.dias ?? 14) }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [supabase])

  const url = token ? `${origin.replace(/\/+$/, "")}/agenda/${token}` : ""

  const gerar = async () => {
    setBusy(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const t = newFeedToken()
    const { error } = await supabase
      .from("agenda_shares")
      .upsert({ user_id: user.id, token: t, dias }, { onConflict: "user_id" })
    setBusy(false)
    if (error) { setError(explica(error, d)); return }
    setToken(t)
    toast.success(d.compartilhar.toastCriado)
  }

  // Mudar o horizonte não troca o token: quem já tem o link continua com ele,
  // só passa a ver mais (ou menos) dias.
  const mudarDias = async (novo: number) => {
    setDias(novo)
    if (!token) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from("agenda_shares").update({ dias: novo }).eq("user_id", user.id)
    if (error) setError(explica(error, d))
  }

  const revogar = async () => {
    setBusy(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const { error } = await supabase.from("agenda_shares").delete().eq("user_id", user.id)
    setBusy(false)
    if (error) { setError(explica(error, d)); return }
    setToken(null)
    toast.success(d.compartilhar.toastDesativado)
  }

  const copiar = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success(d.compartilhar.toastCopiado)
    } catch {
      toast.error(d.compartilhar.erroCopiar)
    }
  }

  if (loading) {
    return (
      <div className="flex h-9 items-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {d.compartilhar.carregando}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{d.compartilhar.explicacao}</p>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{d.compartilhar.mostrarProximos}</span>
        {HORIZONTES.map((dia) => (
          <button
            key={dia}
            type="button"
            onClick={() => mudarDias(dia)}
            className={
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors " +
              (dias === dia
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:border-border")
            }
          >
            {d.compartilhar.dias(dia)}
          </button>
        ))}
      </div>

      {token ? (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border/50 bg-muted/40 px-3 font-mono text-xs outline-none"
            />
            <button
              type="button"
              onClick={copiar}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {d.compartilhar.copiar}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={gerar}
              disabled={busy}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {d.compartilhar.gerarNovo}
            </button>
            <button
              type="button"
              onClick={revogar}
              disabled={busy}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {d.compartilhar.desativar}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={gerar}
          disabled={busy}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {d.compartilhar.criarLink}
        </button>
      )}
    </div>
  )
}
