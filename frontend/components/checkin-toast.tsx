"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check, Clock, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"
import { useDicionario } from "@/hooks/use-idioma"
import { useTimeFormat } from "@/hooks/use-time-format"
import { formatTime } from "@/lib/time-format"

// O aviso que pergunta se você conseguiu fazer o bloco que acabou de terminar.
//
// Era um `toast()` padrão do sonner: título, descrição e dois botõezinhos de
// texto, sem nada do resto do app. Agora é um cartão com a mesma cara dos do
// dashboard — `rounded-2xl`, borda em `border/40`, `bg-card` e `backdrop-blur` —
// porque ele aparece POR CIMA das telas e destoar ali é o que mais salta.
//
// Chega por `toast.custom`, e não por `toast({ action, cancel })`: os botões do
// sonner são links de texto, e o que esta pergunta precisa é de dois alvos de
// dedo — ela aparece no celular, no meio de outra coisa, e some em 60s.

export interface BlocoDoCheckin {
  id: string
  title: string
  start_time: string
  end_time: string
}

interface CartaoProps {
  bloco: BlocoDoCheckin
  aoConcluir: () => void
  aoReagendar: () => void
  aoFechar: () => void
}

function CartaoDeCheckin({ bloco, aoConcluir, aoReagendar, aoFechar }: CartaoProps) {
  const t = useDicionario().moldura.checkin
  const formato = useTimeFormat()
  const semMovimento = useReducedMotion()

  const faixa = `${formatTime(new Date(bloco.start_time), formato)} – ${formatTime(new Date(bloco.end_time), formato)}`

  return (
    <motion.div
      // Entra deslizando de baixo, como as outras coisas do app. Com
      // `prefers-reduced-motion` ele só aparece.
      initial={semMovimento ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={semMovimento ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 32 }}
      className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border/40 bg-card/95 p-4 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          {/* O título do bloco é o que identifica o aviso — vem primeiro e
              inteiro. `truncate` porque título longo não pode empurrar o X. */}
          <p className="truncate text-sm font-semibold text-foreground">{bloco.title}</p>
          <p className="text-xs text-muted-foreground">{faixa}</p>
        </div>

        <button
          type="button"
          onClick={aoFechar}
          aria-label={t.dispensar}
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-3 text-sm text-foreground">{t.conseguiu}</p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={aoConcluir}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Check className="h-3.5 w-3.5" />
          {t.conclui}
        </button>
        <button
          type="button"
          onClick={aoReagendar}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t.reagendar}
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Mostra a pergunta do check-in.
 *
 * Os dois botões fecham o aviso por conta: quem respondeu não quer continuar
 * olhando para a pergunta, e deixar o toast aberto depois da resposta foi o que
 * mais incomodou na versão antiga.
 */
export function mostrarCheckin(
  bloco: BlocoDoCheckin,
  acoes: { aoConcluir: () => void; aoReagendar: () => void }
) {
  toast.custom(
    (id) => (
      <CartaoDeCheckin
        bloco={bloco}
        aoConcluir={() => {
          acoes.aoConcluir()
          toast.dismiss(id)
        }}
        aoReagendar={() => {
          acoes.aoReagendar()
          toast.dismiss(id)
        }}
        aoFechar={() => toast.dismiss(id)}
      />
    ),
    { duration: 60_000 }
  )
}
