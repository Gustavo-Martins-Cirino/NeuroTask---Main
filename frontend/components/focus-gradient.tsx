"use client"

import { useEffect, useState } from "react"
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react"
import { velocidadeDoGradiente, type GradientPreset } from "@/lib/focus-gradient"

// Fundo animado do Modo Foco. Só é carregado quando a pessoa escolhe um dos
// ambientes animados (import dinâmico no focus.tsx) — quem usa os estáticos não
// paga o bundle, que traz a própria cópia do R3F.
//
// As regras da camada visual valem todas aqui: respeita prefers-reduced-motion
// (congela), pausa com a aba oculta (não gasta GPU/bateria em segundo plano) e
// tem fundo sólido por baixo como fallback — se o WebGL falhar, sobra a cor, e
// o Modo Foco continua de pé.

function usePrefereMenosMovimento(): boolean {
  const [reduzido, setReduzido] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const ler = () => setReduzido(mq.matches)
    ler()
    mq.addEventListener("change", ler)
    return () => mq.removeEventListener("change", ler)
  }, [])
  return reduzido
}

function useAbaVisivel(): boolean {
  const [visivel, setVisivel] = useState(true)
  useEffect(() => {
    const ler = () => setVisivel(!document.hidden)
    ler()
    document.addEventListener("visibilitychange", ler)
    return () => document.removeEventListener("visibilitychange", ler)
  }, [])
  return visivel
}

export function FocusGradient({
  preset,
  progresso,
}: {
  preset: GradientPreset
  /** 0 → 1 do quanto a sessão já andou; a animação desacelera com ele. */
  progresso: number
}) {
  const reduzido = usePrefereMenosMovimento()
  const visivel = useAbaVisivel()
  // Aba escondida = velocidade 0. O canvas continua montado (remontar a cada
  // troca de aba custa mais caro que deixá-lo parado).
  const uSpeed = visivel ? velocidadeDoGradiente(preset.speed, progresso, reduzido) : 0

  return (
    <div className="absolute inset-0 -z-10" style={{ background: preset.fallback }}>
      <ShaderGradientCanvas
        style={{ position: "absolute", inset: 0 }}
        pixelDensity={1}
        pointerEvents="none"
      >
        <ShaderGradient
          control="props"
          type={preset.type}
          animate="on"
          uSpeed={uSpeed}
          uDensity={preset.density}
          uStrength={preset.strength}
          color1={preset.color1}
          color2={preset.color2}
          color3={preset.color3}
          cAzimuthAngle={180}
          cPolarAngle={80}
          cDistance={2.8}
          brightness={preset.mode === "dark" ? 1.1 : 1.4}
          grain="on"
        />
      </ShaderGradientCanvas>
    </div>
  )
}
