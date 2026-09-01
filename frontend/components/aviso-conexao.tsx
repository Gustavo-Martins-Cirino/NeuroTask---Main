"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { CloudOff, RotateCw } from "lucide-react"
import {
  CONEXAO_INICIAL, EVENTO_CONEXAO, aplicaPulso, deveAvisar,
  type EstadoConexao, type PulsoDeConexao,
} from "@/lib/conexao"
import { duracaoDoMovimento } from "@/lib/movimento"

// O recado que faltava quando o servidor cai.
//
// A varredura de queda mostrou que as telas AGUENTAM o banco fora — nenhuma
// quebra. O problema é o que elas dizem: mostram o estado vazio. Quem abre
// durante uma queda lê "Nenhuma tarefa ainda" e conclui que perdeu tudo. Para
// quem acabou de confiar a rotina ao app, esse susto é o que faz voltar para o
// calendário de onde veio.
//
// Montado uma vez no AppShell, escutando o observador do cliente Supabase: as
// oito telas fazem consultas próprias, e avisar em cada uma seria oito chances
// de esquecer uma.

export function AvisoConexao() {
  const [estado, setEstado] = useState<EstadoConexao>(CONEXAO_INICIAL)
  const semMovimento = useReducedMotion()

  useEffect(() => {
    const aoPulsar = (e: Event) => {
      const pulso = (e as CustomEvent<PulsoDeConexao>).detail
      if (!pulso) return
      setEstado((atual) => aplicaPulso(atual, pulso))
    }
    window.addEventListener(EVENTO_CONEXAO, aoPulsar)
    return () => window.removeEventListener(EVENTO_CONEXAO, aoPulsar)
  }, [])

  const visivel = deveAvisar(estado)

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          role="status"
          initial={semMovimento ? { opacity: 0 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={semMovimento ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: duracaoDoMovimento(0.24, "informativo", semMovimento) }}
          // ABAIXO do cabeçalho (h-16), não em cima dele: a 12px do topo o
          // aviso cobria o botão de nova tarefa e a barra de XP — trocava um
          // problema de comunicação por um de uso. Acima do dock e de tudo o
          // mais, porque o recado perde a função atrás de um cartão; e no topo,
          // longe do polegar, para não atrapalhar quem vai usar o app assim
          // mesmo.
          className="fixed inset-x-0 top-[4.5rem] z-[130] mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-sm shadow-lg backdrop-blur-xl"
        >
          <CloudOff className="h-4 w-4 shrink-0 text-amber-500" />
          {/* O texto diz o que houve E o que NÃO houve. "Seus dados estão a
              salvo" é a metade que importa: sem ela, a tela vazia por trás do
              aviso continua parecendo perda de dados. */}
          <span className="min-w-0">
            <span className="font-medium text-foreground">Sem conexão com o servidor.</span>{" "}
            <span className="text-muted-foreground">Seus dados estão a salvo.</span>
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/20"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Tentar de novo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
