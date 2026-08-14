"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { XP_UPDATED_EVENT, type XpUpdateDetail } from "@/lib/gamification"
import { curvaDaMoeda, consumirOrigemDaMoeda, ALVO_DA_MOEDA } from "@/lib/coin-flight"

gsap.registerPlugin(MotionPathPlugin)

const MOEDA_PX = 22

function criarMoeda(): HTMLSpanElement {
  const moeda = document.createElement("span")
  moeda.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${MOEDA_PX}px`,
    `height:${MOEDA_PX}px`,
    "margin-left:" + -MOEDA_PX / 2 + "px",
    "margin-top:" + -MOEDA_PX / 2 + "px",
    "border-radius:9999px",
    "background:radial-gradient(circle at 32% 28%, #fde68a 0%, #fbbf24 45%, #b45309 100%)",
    "box-shadow:0 0 12px rgba(251,191,36,.55), inset 0 -2px 3px rgba(120,53,15,.45)",
    "will-change:transform",
  ].join(";")
  return moeda
}

/**
 * Voo da moeda ao ganhar XP. Montado uma vez no AppShell: o card da tarefa marca
 * de onde a moeda sai e este componente só a solta se o XP realmente entrou.
 */
export function CoinFlight() {
  const camadaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const camada = camadaRef.current
    if (!camada) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const aoGanharXp = (e: Event) => {
      const detalhe = (e as CustomEvent<XpUpdateDetail>).detail
      if (!detalhe || detalhe.amount <= 0) return

      const origem = consumirOrigemDaMoeda()
      if (!origem) return

      const alvo = document.querySelector<HTMLElement>(`[${ALVO_DA_MOEDA}]`)
      if (!alvo) return

      const r = alvo.getBoundingClientRect()
      const { caminho, duracaoS } = curvaDaMoeda(origem, {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      })

      const moeda = criarMoeda()
      camada.appendChild(moeda)
      gsap.set(moeda, { x: origem.x, y: origem.y, scale: 0.3, opacity: 0 })

      gsap
        .timeline({ onComplete: () => moeda.remove() })
        .to(moeda, { scale: 1, opacity: 1, duration: 0.18, ease: "back.out(3)" }, 0)
        .to(
          moeda,
          {
            duration: duracaoS,
            ease: "power1.inOut",
            motionPath: { path: caminho, curviness: 1.4, relative: true },
          },
          0
        )
        .to(moeda, { scale: 0.35, opacity: 0, duration: 0.2, ease: "power2.in" }, duracaoS - 0.1)
        .fromTo(
          alvo,
          { scale: 1 },
          { scale: 1.25, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" },
          duracaoS - 0.06
        )
    }

    window.addEventListener(XP_UPDATED_EVENT, aoGanharXp)
    return () => {
      window.removeEventListener(XP_UPDATED_EVENT, aoGanharXp)
      gsap.killTweensOf(camada.children)
      camada.replaceChildren()
    }
  }, [])

  return <div ref={camadaRef} aria-hidden className="pointer-events-none fixed inset-0 z-[60]" />
}
