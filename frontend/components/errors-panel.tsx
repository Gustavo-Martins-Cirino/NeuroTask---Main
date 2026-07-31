"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle, RefreshCw } from "lucide-react"

// Painel de erros pro DONO (Fase 5 — "ver quando quebra na mão dos outros" sem
// abrir o Supabase). Chama GET /api/errors, que só devolve dados se o e-mail
// logado for OWNER_EMAIL. Pra qualquer outra pessoa, `owner:false` → não renderiza
// nada. Fica em Configurações, discreto no fim.

interface ErrItem {
  id: string
  mensagem: string
  rota: string | null
  origem: string
  commit_sha: string | null
  criado_em: string
  user_id: string | null
}
interface Data {
  owner: boolean
  unconfigured?: boolean
  resumo?: { total24: number; total7: number; porRota: Record<string, number> }
  recentes?: ErrItem[]
}

export function ErrorsPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setData(await (await fetch("/api/errors", { cache: "no-store" })).json())
    } catch {
      setData({ owner: false })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  if (loading || !data) return null
  if (!data.owner) {
    if (!data.unconfigured) return null
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <b className="text-foreground">Painel de erros:</b> defina a env <code className="rounded bg-muted px-1">OWNER_EMAIL</code> (seu
        e-mail) na Vercel pra ver aqui os erros dos testadores.
      </div>
    )
  }

  const resumo = data.resumo!
  const recentes = data.recentes ?? []
  const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  const rotasTop = Object.entries(resumo.porRota).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Erros <span className="text-xs font-normal text-muted-foreground">(só você vê)</span>
        </h2>
        <button onClick={load} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        <b className={cn("tabular-nums", resumo.total24 > 0 && "text-amber-600 dark:text-amber-400")}>{resumo.total24}</b> nas últimas 24h ·{" "}
        <span className="tabular-nums">{resumo.total7}</span> em 7 dias
        {rotasTop.length > 0 && <span> · {rotasTop.map(([r, n]) => `${n}× ${r}`).join(", ")}</span>}
      </p>

      {recentes.length > 0 ? (
        <div className="scrollbar-thin mt-4 max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {recentes.map((e) => (
            <div key={e.id} className="rounded-lg border border-border/40 p-2.5 text-sm">
              <p className="break-words font-medium text-foreground">{e.mensagem}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{fmt(e.criado_em)}</span>
                {e.rota && <span>· {e.rota}</span>}
                <span>· {e.origem}</span>
                {e.commit_sha && <span>· <code className="rounded bg-muted px-1">{e.commit_sha}</code></span>}
                {!e.user_id && <span>· (deslogado)</span>}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum erro registrado. 🎉</p>
      )}
    </div>
  )
}
