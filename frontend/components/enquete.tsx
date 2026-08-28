"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, MessageSquareQuote, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  CHAVE_ENQUETE, adiado, comResposta, mensagemDaResposta, proximaPergunta, saneiaEstado,
  type EstadoEnquete, type Pergunta,
} from "@/lib/enquete"
import { colunaFaltante, envioSemColuna, MAX_TENTATIVAS } from "@/lib/feedback"

// A enquete de uma pergunta, no início. As regras puras (quais perguntas, quando
// perguntar, quanto tempo calar) moram em lib/enquete.ts; aqui ficam a tela e o
// I/O. Referência: components/inspirações/votacao2-feedback.tsx (`PollWidget`).
//
// **Por que ela é um cartão no dashboard e não um pop-up.** O botão de feedback
// já aprendeu essa lição: o que custava caro no diálogo não era estética, era
// atrito — ele escurecia o app e pedia a decisão de parar o que se estava
// fazendo. Aqui é pior ainda, porque quem começa a conversa somos nós. Um cartão
// na tela em que a pessoa já ia passar não interrompe nada, e "agora não" está a
// um toque.
//
// O estado vive no `user_metadata` (como atalhos_neuro_v1 e onboarding_v1) e não
// no localStorage: a mesma pergunta voltando no celular depois de respondida no
// computador é exatamente o incômodo que faz alguém parar de responder.

const MOLA = { type: "spring" as const, stiffness: 380, damping: 34 }

export function Enquete() {
  const [estado, setEstado] = useState<EstadoEnquete | null>(null)
  const [pergunta, setPergunta] = useState<Pergunta | null>(null)
  const [respondida, setRespondida] = useState(false)
  const semMovimento = useReducedMotion()

  useEffect(() => {
    let vivo = true
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!vivo) return
      const e = saneiaEstado(user?.user_metadata?.[CHAVE_ENQUETE])
      setEstado(e)
      // A pergunta é escolhida UMA vez, na abertura, e congelada: recalcular a
      // cada render faria o cartão trocar de pergunta debaixo do dedo de quem
      // está lendo as opções.
      setPergunta(proximaPergunta(e, Date.now()))
    })
    return () => { vivo = false }
  }, [])

  const guardar = (novo: EstadoEnquete) => {
    setEstado(novo)
    // Se a gravação falhar, o pior caso é a pergunta voltar na próxima visita.
    // Travar a tela esperando a rede seria pior que perguntar duas vezes.
    createClient().auth.updateUser({ data: { [CHAVE_ENQUETE]: novo } }).catch(() => {})
  }

  const responder = async (opcao: string) => {
    if (!pergunta || !estado) return
    setRespondida(true)
    guardar(comResposta(estado, pergunta.id))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let envio: Record<string, unknown> = {
      user_id: user?.id ?? null,
      message: mensagemDaResposta(pergunta, opcao),
      // A resposta entra como feedback comum: sem tabela nova, sem RLS nova, e
      // o painel do dono já a mostra junto com o resto.
      kind: "geral",
      route: typeof window !== "undefined" ? window.location.pathname : null,
    }
    // Mesma resiliência do botão de feedback: um banco com uma coluna a menos
    // não pode fazer a resposta se perder por causa de um metadado.
    for (let i = 0; i < MAX_TENTATIVAS; i++) {
      const { error } = await supabase.from("feedback").insert(envio)
      if (!error) break
      const coluna = colunaFaltante(error)
      const menor = coluna ? envioSemColuna(envio, coluna) : null
      if (!menor) break
      envio = menor
    }
  }

  const agoraNao = () => {
    if (!estado) return
    guardar(adiado(estado, Date.now()))
    setPergunta(null)
  }

  if (!pergunta) return null

  const transicao = semMovimento ? { duration: 0 } : MOLA

  return (
    <AnimatePresence initial={false}>
      <motion.section
        key={respondida ? "obrigado" : pergunta.id}
        initial={semMovimento ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={transicao}
        aria-label="Enquete rápida"
        className="rounded-2xl border border-border/50 bg-card/60 p-4"
      >
        {respondida ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary" />
            Obrigado! Isso ajuda mais do que parece.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-start gap-2">
              <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="flex-1 text-sm font-medium leading-snug">{pergunta.texto}</p>
              <button
                type="button"
                onClick={agoraNao}
                title="Agora não"
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Agora não</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pergunta.opcoes.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => responder(o)}
                  className={cn(
                    "rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium",
                    "transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </>
        )}
      </motion.section>
    </AnimatePresence>
  )
}
