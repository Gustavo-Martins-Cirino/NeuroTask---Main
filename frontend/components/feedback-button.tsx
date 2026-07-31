"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { MessageSquarePlus, Loader2, Bug, Lightbulb, MessageCircle } from "lucide-react"
import { toast } from "sonner"

// Botão de feedback dentro do app (Fase 5 — fechar o ciclo). Grava junto a ROTA
// atual e o COMMIT (via /api/version) pra dar pra reproduzir o que a pessoa viu.
// Sem isso o feedback chega solto no WhatsApp, sem versão e sem contexto.

const KINDS = [
  { value: "bug", label: "Problema", icon: Bug },
  { value: "ideia", label: "Ideia", icon: Lightbulb },
  { value: "geral", label: "Outro", icon: MessageCircle },
] as const

type Kind = (typeof KINDS)[number]["value"]

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Kind>("geral")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = message.trim()
    if (!msg) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    let commit = "local"
    try {
      const v = await (await fetch("/api/version", { cache: "no-store" })).json()
      commit = v.commit ?? "?"
    } catch {
      /* sem versão — segue mesmo assim */
    }

    const { error: err } = await supabase.from("feedback").insert({
      user_id: user?.id ?? null,
      message: msg,
      kind,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      commit,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    })

    setLoading(false)
    if (err) {
      setError(
        err.message.includes("feedback") || err.message.includes("does not exist")
          ? "A tabela de feedback ainda não existe. Rode supabase/feedback.sql no Supabase."
          : err.message
      )
      return
    }
    toast.success("Valeu pelo feedback! 🙏", { description: "Faz muita diferença pra melhorar o app." })
    setMessage("")
    setKind("geral")
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="rounded-full"
        title="Enviar feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="sr-only">Enviar feedback</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Enviar feedback</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="flex gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors",
                      kind === k.value ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    <k.icon className="h-4 w-4" /> {k.label}
                  </button>
                ))}
              </div>

              <textarea
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="O que funcionou, o que quebrou, o que faltou…"
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50"
              />

              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-[11px] text-muted-foreground/70">
                Vai junto: a tela atual e a versão do app — pra a gente conseguir reproduzir.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading || !message.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
