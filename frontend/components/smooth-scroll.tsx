"use client"

import { ReactLenis, useLenis } from "lenis/react"
import "lenis/dist/lenis.css"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

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

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduzido = usaMovimentoReduzido()

  if (reduzido) return <>{children}</>

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.12,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        // Celular já tem inércia nativa boa; suavizar por cima atrasa o toque.
        syncTouch: false,
        prevent: (node) => !!(node as Element).closest?.(NATIVO),
      }}
    >
      <PausaComDialogo />
      <TopoAoNavegar />
      {children}
    </ReactLenis>
  )
}
