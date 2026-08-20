"use client"

import { useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from "react"
import { fadeDaBorda, mascaraCss } from "@/lib/mascara-rolagem"

// Observa uma área que rola e devolve o `style` de máscara para desvanecer as
// bordas (ver lib/mascara-rolagem). Aditivo: só acrescenta um style ao elemento
// que já existe, sem trocar o layout. Reavalia no scroll e quando o tamanho do
// conteúdo muda (mensagem nova, imagem carregando).

// useLayoutEffect no cliente, useEffect no servidor — evita o aviso de SSR sem
// abrir mão de medir antes do primeiro paint no navegador.
const useIsomorphic = typeof window !== "undefined" ? useLayoutEffect : useEffect

export function useMascaraRolagem(
  ref: RefObject<HTMLElement | null>,
  fade = 40
): CSSProperties {
  const [mascara, setMascara] = useState("none")

  useIsomorphic(() => {
    const el = ref.current
    if (!el) return

    const atualiza = () => {
      const { topo, base } = fadeDaBorda(el, fade)
      setMascara(mascaraCss(topo, base))
    }

    atualiza()
    el.addEventListener("scroll", atualiza, { passive: true })
    const ro = new ResizeObserver(atualiza)
    ro.observe(el)

    return () => {
      el.removeEventListener("scroll", atualiza)
      ro.disconnect()
    }
  }, [ref, fade])

  return { maskImage: mascara, WebkitMaskImage: mascara }
}
