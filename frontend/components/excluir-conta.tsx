"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDicionario, useIdioma } from "@/hooks/use-idioma"
import { enfatizar } from "@/lib/enfase"
import { PALAVRA_DE_EXCLUSAO, confirmaExclusao } from "@/lib/excluir-conta"
import { createClient } from "@/lib/supabase/client"

// Excluir a própria conta (Configurações → Conta). A LGPD garante o direito de
// apagar os dados, e o caminho tem de estar no app, não num e-mail.
//
// Atrito de propósito, e só na medida: a lista do que some e uma palavra para
// digitar. Um clique sem querer não apaga meses de tarefas; uma pessoa decidida
// não precisa mandar e-mail para ninguém.

type MotivoDaFalha = "sessao" | "confirmacao" | "generico"

export function ExcluirConta() {
  const t = useDicionario().configuracoes.conta.excluir
  const idioma = useIdioma()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [digitado, setDigitado] = useState("")
  const [excluindo, setExcluindo] = useState(false)
  const [falha, setFalha] = useState<MotivoDaFalha | null>(null)
  const palavra = PALAVRA_DE_EXCLUSAO[idioma]
  const confirmado = confirmaExclusao(digitado, idioma)

  const mudarAbertura = (abrir: boolean) => {
    if (excluindo) return
    setAberto(abrir)
    setDigitado("")
    setFalha(null)
  }

  const excluir = async () => {
    setExcluindo(true)
    setFalha(null)
    try {
      const res = await fetch("/api/conta/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacao: digitado }),
      })
      if (!res.ok) {
        const { motivo } = (await res.json().catch(() => ({}))) as { motivo?: string }
        setFalha(motivo === "sessao" || motivo === "confirmacao" ? motivo : "generico")
        setExcluindo(false)
        return
      }
    } catch {
      setFalha("generico")
      setExcluindo(false)
      return
    }
    // A conta já não existe no servidor; isto só limpa a sessão deste navegador.
    await createClient().auth.signOut({ scope: "local" })
    toast.success(t.excluida)
    router.replace("/")
    router.refresh()
  }

  return (
    <div className="space-y-2 border-t border-border/40 pt-4">
      <button
        type="button"
        onClick={() => mudarAbertura(true)}
        className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
        {t.botao}
      </button>
      <p className="text-xs text-muted-foreground">{t.aviso}</p>

      <Dialog open={aberto} onOpenChange={mudarAbertura}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.tituloDialogo}</DialogTitle>
            <DialogDescription>{t.oQueSai}</DialogDescription>
          </DialogHeader>

          <ul className="space-y-1.5 text-sm">
            {t.itens.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/70" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t.feedbackFica}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (confirmado && !excluindo) excluir()
            }}
            className="space-y-2"
          >
            <label htmlFor="confirmar-exclusao" className="text-sm">
              {enfatizar(t.digite(palavra))}
            </label>
            <Input
              id="confirmar-exclusao"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={excluindo}
              className="h-10"
            />
            {falha && <p className="text-sm text-destructive">{t.erros[falha]}</p>}

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={excluindo}>
                  {t.cancelar}
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={!confirmado || excluindo}>
                {excluindo && <Loader2 className="h-4 w-4 animate-spin" />}
                {excluindo ? t.excluindo : t.confirmar}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
