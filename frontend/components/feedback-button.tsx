"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { MessageSquarePlus, Loader2, Bug, Lightbulb, MessageCircle, X } from "lucide-react"
import { toast } from "sonner"
import { colunaFaltante, envioSemColuna, explicaErro, MAX_TENTATIVAS } from "@/lib/feedback"
import { ancorarPainel, LARGURA_PAINEL, type CaixaAncorada } from "@/lib/painel-ancorado"

// Botão de feedback dentro do app (Fase 5 — fechar o ciclo). Grava junto a ROTA
// atual e o COMMIT (via /api/version) pra dar pra reproduzir o que a pessoa viu.
// Sem isso o feedback chega solto no WhatsApp, sem versão e sem contexto.
//
// **O botão VIRA o formulário — não abre um diálogo.**
// Referência: components/inspirações/feedback.jsx (`MorphSurface`).
//
// O que o diálogo custava não era bonito, era atrito: escurecia o app inteiro,
// tirava a tela de baixo de vista e pedia uma decisão ("vou parar o que estava
// fazendo pra escrever isso"). Feedback com atrito não chega — e feedback que
// não chega é, pelo ROADMAP, o pior resultado possível da Fase 5. Aqui a
// superfície cresce do próprio ícone, no canto, e a tela que a pessoa está
// comentando continua visível atrás. É justamente a tela que ela quer olhar
// enquanto escreve.
//
// Da referência veio a ideia, não o código: o `MorphSurface` original mede e
// anima com valores próprios, e aqui o crescimento é o `layoutId` do framer —
// o MESMO recurso da pílula do Dock. Um vocabulário de animação a menos para o
// app aprender.

const KINDS = [
  { value: "bug", label: "Problema", icon: Bug },
  { value: "ideia", label: "Ideia", icon: Lightbulb },
  { value: "geral", label: "Outro", icon: MessageCircle },
] as const

type Kind = (typeof KINDS)[number]["value"]

/** O ícone e a superfície são o MESMO elemento aos olhos do framer. */
const MORPH = "nt-feedback-superficie"

const MOLA = { type: "spring" as const, stiffness: 420, damping: 38 }

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Kind>("geral")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const semMovimento = useReducedMotion()
  const supabase = createClient()
  const caixa = useRef<HTMLDivElement>(null)
  const [ancora, setAncora] = useState<CaixaAncorada>({ largura: LARGURA_PAINEL, deslocamento: 0 })

  // A medida sai NO CLIQUE, e não num efeito depois de montar: o framer captura
  // a caixa do painel no primeiro quadro para animar o morph, e um ajuste que
  // chegasse depois viraria um pulo lateral no meio da animação.
  const medir = () => {
    const r = caixa.current?.getBoundingClientRect()
    if (r) setAncora(ancorarPainel(r.right, document.documentElement.clientWidth))
  }

  const abrir = () => {
    medir()
    setOpen(true)
  }

  // Girar o telefone com o painel aberto muda a conta inteira.
  useEffect(() => {
    if (!open) return
    window.addEventListener("resize", medir)
    return () => window.removeEventListener("resize", medir)
  }, [open])

  // Sem diálogo, fechar passa a ser responsabilidade nossa: Esc e clique fora.
  // O `pointerdown` (e não `click`) fecha antes de o alvo processar o clique —
  // com `click`, apertar um botão da tela de trás fechava o painel E acionava o
  // botão, o que faz o app parecer que fez duas coisas por um toque só.
  useEffect(() => {
    if (!open) return
    const onTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onFora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onTecla)
    // Captura: um `stopPropagation` de qualquer componente no caminho deixaria
    // o painel preso aberto, e o único jeito de fechar seria o X.
    document.addEventListener("pointerdown", onFora, true)
    return () => {
      window.removeEventListener("keydown", onTecla)
      document.removeEventListener("pointerdown", onFora, true)
    }
  }, [open])

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

    let envio: Record<string, unknown> = {
      user_id: user?.id ?? null,
      message: msg,
      kind,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      commit,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    }

    // Se a tabela estiver com uma coluna a menos (SQL rodado numa versão
    // anterior), o insert inteiro falha e a pessoa perde o que escreveu por
    // causa de um METADADO. Aqui o metadado é descartado e a mensagem passa —
    // com um aviso no console para o SQL ainda ser corrigido.
    let err: { code?: string; message?: string } | null = null
    const perdidas: string[] = []
    for (let i = 0; i < MAX_TENTATIVAS; i++) {
      const r = await supabase.from("feedback").insert(envio)
      err = r.error
      if (!err) break
      const coluna = colunaFaltante(err)
      const menor = coluna ? envioSemColuna(envio, coluna) : null
      if (!menor) break
      console.warn(`feedback: a tabela não tem a coluna "${coluna}" — enviando sem ela. Rode supabase/feedback.sql.`)
      perdidas.push(coluna!)
      envio = menor
    }

    setLoading(false)
    if (err) {
      setError(explicaErro(err))
      return
    }
    toast.success("Valeu pelo feedback! 🙏", {
      description: perdidas.length
        ? "Chegou aqui. (Sem o contexto da versão — rode supabase/feedback.sql.)"
        : "Faz muita diferença pra melhorar o app.",
    })
    setMessage("")
    setKind("geral")
    setOpen(false)
  }

  const transicao = semMovimento ? { duration: 0 } : MOLA

  return (
    // A caixa guarda o lugar do ícone na fileira do cabeçalho. Sem ela, o botão
    // sai do fluxo ao virar painel e o tema e o avatar escorregam para a direita
    // — um pulo lateral que nada na tela pediu.
    <div ref={caixa} className="relative h-9 w-9">
      {/* Modo padrão de propósito: é ele que deixa o framer ver os dois com o
          mesmo `layoutId` e transformar um no outro. O `popLayout` tira o que
          sai do fluxo antes disso, e o morph vira um corte seco. */}
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.button
            key="gatilho"
            layoutId={MORPH}
            onClick={abrir}
            title="Enviar feedback"
            aria-expanded={false}
            // `borderRadius` no style, e não numa classe: durante o morph o
            // framer escala o elemento, e um raio vindo do CSS escala junto —
            // o canto vira uma elipse no meio do caminho.
            style={{ borderRadius: 9999 }}
            transition={transicao}
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <motion.span layout="position">
              <MessageSquarePlus className="h-5 w-5" />
            </motion.span>
            <span className="sr-only">Enviar feedback</span>
          </motion.button>
        ) : (
          <motion.div
            key="superficie"
            layoutId={MORPH}
            role="dialog"
            aria-label="Enviar feedback"
            // `right` negativo empurra o painel para fora do botão, que é o
            // que o traz de volta para dentro da tela no celular. Vai no style e
            // não numa classe porque o valor é medido — e não em `transform`,
            // que é justamente o que o framer usa para animar o morph.
            style={{ borderRadius: 16, width: ancora.largura, right: -ancora.deslocamento }}
            transition={transicao}
            className="absolute top-0 z-50 overflow-hidden border border-border/60 bg-popover shadow-xl"
          >
            {/* O conteúdo entra depois que a superfície já tem quase o tamanho
                final. Aparecendo junto, ele é desenhado dentro de um retângulo
                que ainda está crescendo, e o texto estica com ele. */}
            <motion.form
              onSubmit={submit}
              initial={semMovimento ? false : { opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: semMovimento ? 0 : 0.18, delay: semMovimento ? 0 : 0.09 } }}
              className="p-3"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span className="flex-1 text-sm font-medium">Enviar feedback</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:h-7 sm:w-7"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </button>
              </div>

              <div className="flex gap-1.5">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors sm:h-auto sm:py-1.5",
                      kind === k.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    <k.icon className="h-3.5 w-3.5" /> {k.label}
                  </button>
                ))}
              </div>

              <textarea
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="O que funcionou, o que quebrou, o que faltou…"
                className="mt-2.5 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50"
              />

              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

              <div className="mt-2.5 flex items-center gap-2">
                <p className="flex-1 text-[11px] leading-tight text-muted-foreground/70">
                  Vai junto: a tela atual e a versão do app.
                </p>
                <Button type="submit" size="sm" className="h-9 sm:h-8" disabled={loading || !message.trim()}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar
                </Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
