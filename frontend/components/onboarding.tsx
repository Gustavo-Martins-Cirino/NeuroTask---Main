"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Sparkles, ListTodo, CalendarClock, Bot, ArrowRight, ArrowLeft, type LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  PASSOS_ONBOARDING, CHAVE_ONBOARDING, jaViuOnboarding,
  passoSeguinte, passoAnterior, ehUltimoPasso,
} from "@/lib/onboarding"

// Primeiro contato — montado global no AppShell (só na área logada). Aparece uma
// vez por conta: a marca "já vi" fica no user_metadata, como avatar_modo. Regras
// e textos são puros em lib/onboarding.ts; aqui mora o diálogo e o I/O.

const ICONES: Record<string, LucideIcon> = {
  "bem-vindo": Sparkles,
  tarefas: ListTodo,
  calendario: CalendarClock,
  "neuro-ia": Bot,
}

export function Onboarding() {
  const [mostrar, setMostrar] = useState(false)
  const [passo, setPasso] = useState(0)
  const reduzido = useReducedMotion()
  const total = PASSOS_ONBOARDING.length

  // Só decide mostrar depois de ler o metadata — assim quem já viu nunca vê um
  // flash do diálogo.
  useEffect(() => {
    const supabase = createClient()
    let vivo = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (vivo && user && !jaViuOnboarding(user.user_metadata)) setMostrar(true)
    })
    return () => { vivo = false }
  }, [])

  // Fechar de qualquer jeito (Começar, Pular, X, Esc) é uma escolha: marca visto.
  // Fecha na hora para não travar, e grava em segundo plano — se a gravação
  // falhar, o pior caso é rever o guia numa próxima sessão, o que é inofensivo.
  const concluir = () => {
    setMostrar(false)
    createClient().auth.updateUser({ data: { [CHAVE_ONBOARDING]: new Date().toISOString() } }).catch(() => {})
  }

  const dados = PASSOS_ONBOARDING[passo]
  const Icone = ICONES[dados.id] ?? Sparkles
  const ultimo = ehUltimoPasso(passo, total)

  return (
    <Dialog open={mostrar} onOpenChange={(aberto) => { if (!aberto) concluir() }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Icone className="h-7 w-7 text-primary" />
          </span>

          <div className="min-h-[7rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={dados.id}
                initial={reduzido ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduzido ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <DialogTitle className="text-xl font-bold">{dados.titulo}</DialogTitle>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dados.texto}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bolinhas de progresso */}
          <div className="flex items-center gap-1.5">
            {PASSOS_ONBOARDING.map((p, i) => (
              <span
                key={p.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === passo ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <div className="mt-1 flex w-full items-center justify-between gap-3">
            {passo > 0 ? (
              <button
                type="button"
                onClick={() => setPasso((p) => passoAnterior(p))}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={concluir}
                className="rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Pular
              </button>
            )}

            <button
              type="button"
              onClick={() => (ultimo ? concluir() : setPasso((p) => passoSeguinte(p, total)))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              {ultimo ? "Começar" : "Próximo"}
              {!ultimo && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
