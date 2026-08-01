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

// O erro do Postgres vem pelo código, não pelo texto: a mensagem de violação de
// RLS cita o nome da tabela ("...for table \"feedback\""), então casar por
// substring fazia RLS e cache virarem "a tabela não existe" — e mandava rodar de
// novo um SQL que já estava rodado.
function explicaErro(err: { code?: string; message: string }): string {
  switch (err.code) {
    case "42P01":
      return "A tabela de feedback ainda não existe. Rode supabase/feedback.sql no Supabase."
    case "PGRST205":
      return "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e tente de novo."
    case "42501":
      return "Sem permissão para gravar (RLS). Confira se você está logado e se a policy de insert do feedback.sql foi criada."
    default:
      return err.message
  }
}

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
      setError(explicaErro(err))
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
