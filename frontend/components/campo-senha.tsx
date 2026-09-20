"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDicionario } from "@/hooks/use-idioma"
import { olharPara, progressoDoTexto, ritmoDaPiscada, OLHAR_PARADO, RAIO_ORBITA } from "@/lib/olho-senha"

// Campo de senha com o olho que mostra e esconde — e que espia enquanto você
// escreve. Veio de um retorno de quem testou: "fiquei em dúvida se coloquei o
// caractere certo" na hora de criar a conta.
//
// Os olhos são um BOTÃO, não um enfeite: quem navega por teclado chega neles com
// Tab, e o leitor de tela lê "Mostrar senha" / "Ocultar senha". Um ícone bonito
// que só responde a clique deixaria de fora exatamente quem mais precisa
// conferir o que digitou.
//
// A gracinha tem limite: com `prefers-reduced-motion` as pupilas ficam paradas
// no centro e o olho não pisca. O botão continua funcionando igual.

interface CampoSenhaProps extends Omit<React.ComponentProps<"input">, "type"> {
  /** O valor é controlado por quem usa o campo — o olhar acompanha o tamanho. */
  value: string
}

const TAMANHO_OLHO = 11

export function CampoSenha({ value, className, ...props }: CampoSenhaProps) {
  const t = useDicionario().entrada
  const semMovimento = useReducedMotion()
  const [visivel, setVisivel] = useState(false)
  const [piscando, setPiscando] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Enquanto a senha está escondida, os olhos acompanham a escrita. Revelada,
  // eles se fecham — a piada é que eles param de espiar quando você já mostrou.
  const espiando = !visivel
  const olhar = semMovimento || !espiando ? OLHAR_PARADO : olharPara(progressoDoTexto(value.length))

  useEffect(() => {
    if (semMovimento || !espiando) return
    let vivo = true
    const agendar = () => {
      timer.current = setTimeout(() => {
        if (!vivo) return
        setPiscando(true)
        setTimeout(() => {
          if (!vivo) return
          setPiscando(false)
          agendar()
        }, 130)
      }, ritmoDaPiscada(Math.random))
    }
    agendar()
    return () => {
      vivo = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [semMovimento, espiando])

  const fechado = !espiando || piscando

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        type={visivel ? "text" : "password"}
        // Espaço à direita para os olhos não ficarem por cima do que foi escrito.
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        // `onMouseDown` preventDefault: sem isto o clique tira o foco do campo,
        // e quem estava escrevendo perde o cursor para conferir uma letra.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisivel((v) => !v)}
        aria-pressed={visivel}
        aria-label={visivel ? t.ocultarSenha : t.mostrarSenha}
        title={visivel ? t.ocultarSenha : t.mostrarSenha}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <svg
          width={TAMANHO_OLHO * 2 + 4}
          height={TAMANHO_OLHO + 4}
          viewBox="-13 -7 26 14"
          aria-hidden="true"
          className="overflow-visible"
        >
          {[-6, 6].map((cx) => (
            <g key={cx} transform={`translate(${cx} 0)`}>
              {fechado ? (
                // Fechado: um arco para baixo, que lê como olho apertado e não
                // como traço solto.
                <path
                  d="M -4.4 0 Q 0 4 4.4 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <ellipse cx="0" cy="0" rx="5" ry="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <motion.circle
                    r={RAIO_ORBITA * 0.62}
                    fill="currentColor"
                    animate={{ cx: olhar.x, cy: olhar.y }}
                    initial={false}
                    transition={
                      semMovimento
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 520, damping: 26, mass: 0.5 }
                    }
                  />
                </>
              )}
            </g>
          ))}
        </svg>
      </button>
    </div>
  )
}
