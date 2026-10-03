"use client"

import { useCallback, useEffect, useRef } from "react"
import { ATAQUE_DO_SINO, NOTAS_DO_SINO } from "@/lib/sino-foco"

// O sino é sintetizado, não um arquivo: nada para baixar, e toca na hora.
//
// `preparar` tem de ser chamado DENTRO de um clique (o play). O navegador só
// libera áudio depois de um gesto da pessoa, e o fim do timer chega 25 minutos
// depois de clique nenhum — um AudioContext criado ali nasceria mudo no Safari.
// Criado e destravado no play, ele fica pronto para quando o tempo acabar.
export function useSinoFoco() {
  const ctxRef = useRef<AudioContext | null>(null)

  const preparar = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        ctxRef.current = new Ctor()
      }
      if (ctxRef.current.state === "suspended") void ctxRef.current.resume()
    } catch {
      /* sem áudio: o timer funciona igual, só não toca */
    }
  }, [])

  const tocar = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    try {
      if (ctx.state === "suspended") void ctx.resume()
      const t0 = ctx.currentTime + 0.05
      for (const n of NOTAS_DO_SINO) {
        const osc = ctx.createOscillator()
        const ganho = ctx.createGain()
        osc.type = "sine"
        osc.frequency.value = n.frequencia
        const inicio = t0 + n.inicio
        ganho.gain.setValueAtTime(0.0001, inicio)
        ganho.gain.exponentialRampToValueAtTime(n.pico, inicio + ATAQUE_DO_SINO)
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + n.duracao)
        osc.connect(ganho).connect(ctx.destination)
        osc.start(inicio)
        osc.stop(inicio + n.duracao + 0.05)
      }
    } catch {
      /* idem: sem som, sem quebra */
    }
  }, [])

  useEffect(() => () => void ctxRef.current?.close().catch(() => {}), [])

  return { preparar, tocar }
}
