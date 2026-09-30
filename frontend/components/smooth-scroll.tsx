"use client"

import { ReactLenis, useLenis } from "lenis/react"
import "lenis/dist/lenis.css"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import gsap from "gsap"

// Onde o Lenis NÃO deve mandar: dentro de diálogo, popover, menu ou de qualquer
// área que já rola sozinha. Sem isso a roda do mouse sobre um modal rolaria a
// página atrás dele.
const NATIVO = [
  "[data-lenis-prevent]",
  "[role=dialog]",
  "[role=menu]",
  "[role=listbox]",
  "[data-radix-scroll-area-viewport]",
  "[data-radix-popper-content-wrapper]",
].join(",")

function usaMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduzido(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduzido(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return reduzido
}

// Diálogo aberto trava o scroll do body (react-remove-scroll marca
// data-scroll-locked). O Lenis precisa parar junto, senão continua tentando
// rolar o que está travado.
function PausaComDialogo() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    const sincroniza = () => {
      if (document.body.hasAttribute("data-scroll-locked")) lenis.stop()
      else lenis.start()
    }

    sincroniza()
    const obs = new MutationObserver(sincroniza)
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] })
    return () => obs.disconnect()
  }, [lenis])

  return null
}

// Um requestAnimationFrame só. O Lenis abria o dele (autoRaf) e o GSAP tem o
// seu; dois loops medindo o tempo por conta própria saem de fase, e é aí que o
// scroll "treme" enquanto uma animação roda. Com o ticker do GSAP puxando o
// Lenis, os dois leem o mesmo instante.
function TickerUnico() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    // O ticker entrega o tempo em segundos; o Lenis quer milissegundos.
    const tick = (tempo: number) => lenis.raf(tempo * 1000)

    gsap.ticker.add(tick)
    // Sem isso o GSAP "engole" um travamento longo (aba em segundo plano, GC)
    // e o scroll fica atrasado em relação ao dedo. Recomendação do próprio Lenis.
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33)
    }
  }, [lenis])

  return null
}

// Troca de rota volta ao topo na hora — sem isso a página nova entra já rolada,
// ou desce animando enquanto o PageTransition ainda está aparecendo.
function TopoAoNavegar() {
  const lenis = useLenis()
  const pathname = usePathname()

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true })
  }, [lenis, pathname])

  return null
}

// Os filhos NÃO ficam dentro do <ReactLenis>. Antes ficavam, e o embrulho
// trocava de tipo quando "reduzir movimento" era lido — o que só acontece
// depois de montar. Trocar o tipo do pai remonta tudo abaixo dele: para quem
// usa movimento reduzido, o app inteiro montava duas vezes na entrada (medido:
// 65 pedidos de rede ao Supabase na entrada do dashboard, contra 37). Com os filhos sempre na mesma
// posição da árvore, só o motor do Lenis entra e sai. O `useLenis()` das telas
// continua achando a instância: com `root`, o Lenis a publica num store global.
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduzido = usaMovimentoReduzido()

  return (
    <>
      {!reduzido && (
        <ReactLenis
          root
          options={{
            // Quem chama o raf é o TickerUnico abaixo.
            autoRaf: false,
            lerp: 0.12,
            wheelMultiplier: 1,
            touchMultiplier: 1.6,
            // Celular já tem inércia nativa boa; suavizar por cima atrasa o toque.
            syncTouch: false,
            prevent: (node) => !!(node as Element).closest?.(NATIVO),
          }}
        >
          <TickerUnico />
          <PausaComDialogo />
          <TopoAoNavegar />
        </ReactLenis>
      )}
      {children}
    </>
  )
}
