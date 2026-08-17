"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Bandeira } from "@/components/bandeira"
import { REGIOES, regiaoDoFormato, formatoDaRegiao, infoDaRegiao } from "@/lib/regiao"
import { useTimeFormat, setTimeFormat } from "@/hooks/use-time-format"

// Seletor de região — a bandeira com a seta, e o painel que abre.
// Referência: components/inspirações/202645.png e 202658.png.
//
// A referência tem o mundo inteiro e um campo de busca. Com dois itens, os dois
// sobram: buscar entre duas linhas é mais trabalho do que ler as duas. O que
// vale ali é a **animação de abrir**, e é ela que foi trazida.
//
// O botão diz "Brasil", não "24 horas" — a região é o que a pessoa sabe sobre
// si; o formato é consequência. E diz **região**, nunca idioma: o app está todo
// em português cravado no JSX, e prometer tradução aqui seria mentir.

export function SeletorRegiao() {
  const formato = useTimeFormat()
  const regiao = regiaoDoFormato(formato)
  const atual = infoDaRegiao(regiao)
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const foraDaCaixa = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    // `mousedown` e não `click`: no click o painel já teria sumido debaixo do
    // cursor se o alvo fosse um item dele.
    document.addEventListener("mousedown", foraDaCaixa)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("mousedown", foraDaCaixa)
      document.removeEventListener("keydown", escape)
    }
  }, [aberto])

  return (
    <div ref={caixa} className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-xl border px-3 text-left transition-colors",
          aberto ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
        )}
      >
        <Bandeira regiao={regiao} />
        <span className="flex-1 text-sm font-medium">{atual.nome}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{atual.exemplo}</span>
        <motion.span animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.span>
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            // Nasce encolhido e um pouco acima, ancorado no topo: o painel
            // parece sair de dentro do botão em vez de aparecer por cima dele.
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ transformOrigin: "top center" }}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-20 overflow-hidden rounded-xl border border-border/60 bg-popover p-1 shadow-lg"
          >
            {REGIOES.map((r) => {
              const ativa = r.value === regiao
              return (
                <button
                  key={r.value}
                  type="button"
                  role="option"
                  aria-selected={ativa}
                  onClick={() => {
                    setTimeFormat(formatoDaRegiao(r.value))
                    setAberto(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    ativa ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <Bandeira regiao={r.value} />
                  <span className="flex-1 text-sm font-medium">{r.nome}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{r.exemplo}</span>
                  {ativa && <Check className="h-4 w-4" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
