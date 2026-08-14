"use client"

import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { staggerDasLetras } from "@/lib/saudacao"

gsap.registerPlugin(SplitText)

interface SplitGreetingProps {
  texto: string
  /** O nome chega depois do fetch. Animar antes faria a saudação entrar duas vezes. */
  pronto: boolean
  className?: string
}

export function SplitGreeting({ texto, pronto, className }: SplitGreetingProps) {
  const ref = useRef<HTMLHeadingElement>(null)
  const jaAnimou = useRef(false)

  // useLayoutEffect (e não useEffect) porque o split precisa acontecer ANTES da
  // primeira pintura: no useEffect o texto aparece inteiro por um frame e só
  // depois cai atrás da máscara — o piscado é visível.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !pronto || jaAnimou.current) return
    jaAnimou.current = true

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.visibility = "visible"
      return
    }

    const ctx = gsap.context(() => {
      const split = SplitText.create(el, { type: "chars,lines", mask: "lines" })
      el.style.visibility = "visible"
      gsap.from(split.chars, {
        yPercent: 120,
        duration: 0.55,
        ease: "power3.out",
        stagger: staggerDasLetras(split.chars.length),
      })
    }, el)

    return () => ctx.revert()
  }, [pronto])

  // Nasce invisível para o texto não aparecer antes do split — mas ocupando o
  // espaço, senão o resto do dashboard pula quando a saudação entra.
  return (
    <h2 ref={ref} className={className} style={{ visibility: "hidden" }}>
      {texto}
    </h2>
  )
}
