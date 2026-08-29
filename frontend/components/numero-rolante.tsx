"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { comChaveDaDireita, formataInteiro, glifosDe } from "@/lib/numero-rolante"
import { duracaoDoMovimento } from "@/lib/movimento"

// Número que rola dígito a dígito quando muda de valor (estilo NumberFlow), em
// framer-motion puro — sem canvas e sem pacote novo. Cada dígito é uma coluna
// 0–9 empilhada que desliza para a casa certa; separadores e sinal ficam
// parados.
//
// Com prefers-reduced-motion o número continua ROLANDO, só que mais rápido, e
// isso é escolha: o giro dos dígitos é o que diz que o valor MUDOU. Trocando por
// texto parado, o número simplesmente vira outro entre um quadro e o seguinte —
// e quem pediu menos movimento perde a informação, não o enfeite. Ver a régua em
// lib/movimento.ts.

interface NumeroRolanteProps {
  /** Número (formatado aqui) ou um texto já pronto, tipo "04:35". */
  valor: number | string
  minCasas?: number
  agrupar?: boolean
  className?: string
}

const DIGITOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export function NumeroRolante({ valor, minCasas, agrupar, className }: NumeroRolanteProps) {
  const texto = typeof valor === "number" ? formataInteiro(valor, { minCasas, agrupar }) : valor
  const reduzido = useReducedMotion()

  return (
    <span className={cn("inline-flex tabular-nums leading-none", className)}>
      {comChaveDaDireita(glifosDe(texto)).map(({ glifo, chave }) =>
        glifo.tipo === "digito" ? (
          <Coluna key={chave} valor={glifo.valor} reduzido={reduzido} />
        ) : (
          <span key={chave}>{glifo.char}</span>
        )
      )}
    </span>
  )
}

function Coluna({ valor, reduzido }: { valor: number; reduzido: boolean | null }) {
  return (
    <span className="relative inline-block overflow-hidden" style={{ height: "1em", lineHeight: 1 }}>
      <span className="invisible" aria-hidden>0</span>
      <motion.span
        className="absolute left-0 top-0 flex flex-col"
        animate={{ y: `${valor * -10}%` }}
        transition={
          reduzido
            // Sem mola: o repique de uma mola é movimento extra, e é justamente
            // o extra que a preferência pede para tirar. Uma curva seca e curta
            // mostra a virada e para.
            ? { duration: duracaoDoMovimento(0.32, "informativo", true), ease: [0.2, 0, 0, 1] }
            : { type: "spring", stiffness: 280, damping: 32 }
        }
      >
        {DIGITOS.map((d) => (
          <span key={d} className="flex items-center justify-center" style={{ height: "1em", lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
}
