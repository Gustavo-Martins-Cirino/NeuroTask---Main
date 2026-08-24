"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Pencil, Plus, RotateCcw, Trash2, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  ATALHOS_PADRAO, CHAVE_ATALHOS, MAX_CARACTERES,
  ehPadrao, leAtalhos, podeAdicionar, saneiaAtalhos,
} from "@/lib/atalhos-neuro"

// Os atalhos da tela vazia da Neuro IA, agora salvos e editáveis.
// Referência: components/inspirações/prompts.jsx. As regras puras (padrões,
// saneamento, tetos) estão em lib/atalhos-neuro.ts; aqui mora a tela e o I/O.
//
// Guardados no `user_metadata`, como avatar_modo e onboarding_v1 — e não numa
// tabela. São quatro frases: uma tabela nova custaria SQL rodado à mão, RLS e
// uma consulta a mais na abertura do chat, para guardar menos dado do que o
// retrato do avatar. O metadata também acompanha a pessoa entre aparelhos, o
// que o localStorage não faz.

interface Props {
  /** Clicar num atalho manda a frase para o chat. */
  aoEscolher: (texto: string) => void
}

export function AtalhosNeuro({ aoEscolher }: Props) {
  const [atalhos, setAtalhos] = useState<string[] | null>(null)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState<string[]>([])
  const semMovimento = useReducedMotion()

  useEffect(() => {
    let vivo = true
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (vivo) setAtalhos(leAtalhos(user?.user_metadata))
    })
    return () => { vivo = false }
  }, [])

  const abrirEdicao = () => {
    setRascunho(atalhos ?? [])
    setEditando(true)
  }

  // Salva o que sobrou de pé e fecha na hora. Se a gravação falhar, o pior caso
  // é a edição não sobreviver ao próximo carregamento — inofensivo perto de
  // travar a tela esperando a rede para editar uma frase.
  const salvar = () => {
    const limpos = saneiaAtalhos(rascunho)
    setAtalhos(limpos)
    setEditando(false)
    createClient().auth.updateUser({ data: { [CHAVE_ATALHOS]: limpos } }).catch(() => {})
  }

  // Enquanto o metadata não chegou não se desenha nada: mostrar os padrões
  // enquanto carrega faria os cartões de quem editou piscarem nos originais
  // antes de virarem os certos.
  if (atalhos === null) return null

  const lista = editando ? rascunho : atalhos

  return (
    <div className="w-full max-w-xl">
      <AnimatePresence mode="wait" initial={false}>
        {editando ? (
          <motion.div
            key="editando"
            initial={semMovimento ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: semMovimento ? 0 : 0.15 }}
            className="space-y-2"
          >
            {rascunho.map((texto, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={texto}
                  maxLength={MAX_CARACTERES}
                  autoFocus={i === rascunho.length - 1 && texto === ""}
                  onChange={(e) =>
                    setRascunho((r) => r.map((t, j) => (j === i ? e.target.value : t)))
                  }
                  // Enter salva: num campo de uma linha só, é o que a mão espera.
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); salvar() }
                    if (e.key === "Escape") setEditando(false)
                  }}
                  placeholder="O que você quer perguntar…"
                  className="flex-1 rounded-xl border border-border/50 bg-card/50 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setRascunho((r) => r.filter((_, j) => j !== i))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remover atalho</span>
                </button>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1">
              {podeAdicionar(rascunho) && (
                <BotaoDeTexto onClick={() => setRascunho((r) => [...r, ""])} icone={Plus}>
                  Adicionar
                </BotaoDeTexto>
              )}
              {!ehPadrao(rascunho) && (
                <BotaoDeTexto onClick={() => setRascunho([...ATALHOS_PADRAO])} icone={RotateCcw}>
                  Restaurar padrão
                </BotaoDeTexto>
              )}
              <BotaoDeTexto onClick={salvar} icone={Check} destaque>
                Concluir
              </BotaoDeTexto>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="lendo"
            initial={semMovimento ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: semMovimento ? 0 : 0.15 }}
            className="space-y-3"
          >
            {lista.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {lista.map((p) => (
                  <button
                    key={p}
                    onClick={() => aoEscolher(p)}
                    className="rounded-xl border border-border/50 bg-card/50 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* O lápis fica visível mesmo com a lista vazia: sem ele, apagar
                todos os atalhos seria uma porta que só abre para fora. */}
            <div className="flex justify-center">
              <BotaoDeTexto onClick={abrirEdicao} icone={Pencil}>
                {lista.length > 0 ? "Editar atalhos" : "Criar um atalho"}
              </BotaoDeTexto>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BotaoDeTexto({
  onClick, icone: Icone, destaque, children,
}: {
  onClick: () => void
  icone: React.ComponentType<{ className?: string }>
  destaque?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors",
        destaque
          ? "font-medium text-primary hover:bg-primary/10"
          : "text-muted-foreground/70 hover:text-foreground"
      )}
    >
      <Icone className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}
