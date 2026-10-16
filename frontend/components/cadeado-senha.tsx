"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check } from "lucide-react"
import { useDicionario } from "@/hooks/use-idioma"
import { cn } from "@/lib/utils"
import { MIN_SENHA, REQUISITOS_SENHA, requisitosDaSenha } from "@/lib/regra-senha"

// Embaixo do campo de senha, no cadastro e na nova senha: um cadeado de 3 pinos,
// um por requisito, ao lado da lista do que falta. Cada requisito cumprido sobe
// o seu pino até a linha de corte; com os três alinhados, a alça desce e tranca.
//
// Não aparece no LOGIN de propósito: quem já tem conta pode ter uma senha de
// antes da regra, e uma lista acusando o que "falta" ali só confundiria.
//
// O desenho é enfeite (aria-hidden). A informação é a lista, e o leitor de tela
// ouve o resumo a cada mudança. Com `prefers-reduced-motion`, tudo muda de
// estado sem mola nem pulo.

const MOLA = { type: "spring" as const, stiffness: 520, damping: 26, mass: 0.6 }

// Centro de cada pino no corpo do cadeado, na ordem de REQUISITOS_SENHA.
const PINOS_X = [13.5, 20, 26.5]

// Quanto o pino de um requisito pendente fica abaixo da linha de corte, e quanto
// a alça sobe quando o cadeado está aberto.
const DESCIDA_DO_PINO = 5
const ALCA_ABERTA = -5

export function CadeadoDaSenha({ senha }: { senha: string }) {
  const t = useDicionario().entrada.requisitosSenha
  const semMovimento = useReducedMotion()
  const requisitos = requisitosDaSenha(senha)
  const cumpridos = REQUISITOS_SENHA.filter((r) => requisitos[r]).length
  const trancado = cumpridos === REQUISITOS_SENHA.length
  const transicao = semMovimento ? { duration: 0 } : MOLA
  const itens = t.itens(MIN_SENHA)

  return (
    <div className="flex items-center gap-3.5 pt-1.5">
      <motion.svg
        viewBox="0 0 40 48"
        aria-hidden="true"
        className={cn(
          "h-11 w-9 shrink-0 overflow-visible transition-[color,filter] duration-300",
          trancado
            ? "text-emerald-600 drop-shadow-[0_0_6px_rgba(16,185,129,0.45)] dark:text-emerald-400"
            : "text-muted-foreground"
        )}
        initial={false}
        // O "clique" de trancar: um pulinho só na hora em que o último pino alinha.
        animate={trancado && !semMovimento ? { scale: [1, 1.14, 1] } : { scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      >
        <motion.path
          d="M13 22 V15 a7 7 0 0 1 14 0 V22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={false}
          animate={{ y: trancado ? 0 : ALCA_ABERTA }}
          transition={transicao}
        />
        {/* As pernas da alça terminam na borda de cima do corpo, então o corpo não
            precisa ser opaco para escondê-las — e um tom translúcido da própria cor
            funciona em qualquer fundo, inclusive o escuro das telas de entrada no
            tema claro. */}
        <rect
          x="6"
          y="22"
          width="28"
          height="22"
          rx="5"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line x1="9.5" x2="30.5" y1="30" y2="30" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2" opacity="0.5" />
        {REQUISITOS_SENHA.map((requisito, i) => (
          // O deslocamento vai no grupo: em SVG, o `y` do Framer é transform, e no
          // próprio retângulo ele apagaria o atributo que posiciona o pino.
          <motion.g
            key={requisito}
            initial={false}
            animate={{ y: requisitos[requisito] ? 0 : DESCIDA_DO_PINO }}
            transition={transicao}
          >
            <rect
              x={PINOS_X[i] - 1.5}
              y="30"
              width="3"
              height="8"
              rx="1.5"
              className={cn(
                "transition-colors duration-300",
                requisitos[requisito] ? "fill-emerald-500 dark:fill-emerald-400" : "fill-muted-foreground/60"
              )}
            />
          </motion.g>
        ))}
      </motion.svg>

      <ul className="space-y-1">
        {REQUISITOS_SENHA.map((requisito) => {
          const ok = requisitos[requisito]
          return (
            <li
              key={requisito}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors duration-300",
                ok ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                  ok
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "border-muted-foreground/40"
                )}
              >
                <motion.span
                  className="flex"
                  initial={false}
                  animate={{ scale: ok ? 1 : 0, opacity: ok ? 1 : 0 }}
                  transition={transicao}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                </motion.span>
              </span>
              {itens[requisito]}
              <span className="sr-only">{ok ? t.cumprido : t.pendente}</span>
            </li>
          )
        })}
      </ul>

      <p className="sr-only" aria-live="polite">
        {t.resumo(cumpridos, REQUISITOS_SENHA.length)}
      </p>
    </div>
  )
}
