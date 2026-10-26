"use client"

import { useRef } from "react"
import { respiracao } from "@/lib/foco-cenas"
import { useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Fôlego (200 moedas). Do nome "Ribbon Glow" do Originkit nasceu uma cena
// própria, e mais útil: fitas de luz que RESPIRAM num ritmo guiado — abrem ao
// inspirar (4 s) e se juntam ao soltar o ar (6 s), com a palavra discreta
// embaixo. É respiração lenta, a que acalma, sem precisar de um app para isso.
// O cursor puxa as fitas de leve.

const FITAS = [
  { cor: "255,122,200", base: -0.26, k1: 0.0042, k2: 0.0091, w1: 0.35, w2: 0.22, fase: 0.3, largura: 22 },
  { cor: "90,200,255", base: -0.12, k1: 0.0036, k2: 0.0078, w1: 0.28, w2: 0.31, fase: 1.7, largura: 26 },
  { cor: "155,107,255", base: 0.0, k1: 0.0048, k2: 0.0063, w1: 0.31, w2: 0.19, fase: 2.9, largura: 30 },
  { cor: "255,179,90", base: 0.12, k1: 0.0031, k2: 0.0102, w1: 0.24, w2: 0.27, fase: 4.1, largura: 20 },
  { cor: "75,130,255", base: 0.25, k1: 0.0044, k2: 0.0071, w1: 0.33, w2: 0.24, fase: 5.3, largura: 24 },
]
const PASSO_PX = 10
const ALCANCE = 190

export function Folego({ textos }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const legendaRef = useRef<HTMLSpanElement>(null)
  const textosRef = useRef(textos)
  textosRef.current = textos

  useMotorDaCena(canvasRef, {
    tipo: "2d",
    dprMaximo: 1.5,
    iniciar: (contexto) => {
      const ctx = contexto as CanvasRenderingContext2D
      let faseAnterior = ""
      return {
        desenhar: (q) => {
          const { largura: W, altura: H, dpr, tempo } = q
          const r = respiracao(tempo)
          const legenda = legendaRef.current
          if (legenda) {
            if (q.reduzido) {
              legenda.style.opacity = "0"
            } else {
              if (r.fase !== faseAnterior) {
                faseAnterior = r.fase
                legenda.textContent = r.fase === "inspira" ? textosRef.current.inspire : textosRef.current.solte
              }
              legenda.style.opacity = String(0.35 + 0.4 * r.cheio)
            }
          }

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, W, H)
          ctx.globalCompositeOperation = "lighter"
          const abertura = 0.35 + 0.65 * r.cheio
          const amplitude = H * (0.035 + 0.06 * r.cheio)
          const px = q.ponteiro.x * W
          const py = q.ponteiro.y * H
          const puxao = 0.35 * q.ponteiro.presente

          for (const f of FITAS) {
            const meio = H * (0.5 + f.base * abertura)
            const cima: number[] = []
            const baixo: number[] = []
            const centro: number[] = []
            for (let x = -PASSO_PX; x <= W + PASSO_PX; x += PASSO_PX) {
              let y =
                meio +
                amplitude * (0.6 * Math.sin(x * f.k1 + tempo * f.w1 + f.fase) + 0.4 * Math.sin(x * f.k2 - tempo * f.w2))
              if (puxao > 0.01) {
                const d = ((x - px) ** 2 + (y - py) ** 2) / (ALCANCE * ALCANCE)
                if (d < 1) y += (py - y) * puxao * (1 - d) * (1 - d)
              }
              const meiaLargura =
                f.largura * (0.55 + 0.45 * Math.sin(x * 0.004 + tempo * 0.3 + f.fase) ** 2) * (0.7 + 0.6 * r.cheio)
              centro.push(x, y)
              cima.push(x, y - meiaLargura)
              baixo.push(x, y + meiaLargura)
            }
            // A fita: a faixa entre as duas bordas, bem translúcida (a soma das fitas faz o brilho).
            ctx.beginPath()
            ctx.moveTo(cima[0], cima[1])
            for (let i = 2; i < cima.length; i += 2) ctx.lineTo(cima[i], cima[i + 1])
            for (let i = baixo.length - 2; i >= 0; i -= 2) ctx.lineTo(baixo[i], baixo[i + 1])
            ctx.closePath()
            ctx.fillStyle = `rgba(${f.cor},${0.09 + 0.07 * r.cheio})`
            ctx.fill()
            // O fio de luz no meio, com um halo largo e fraco embaixo.
            ctx.beginPath()
            ctx.moveTo(centro[0], centro[1])
            for (let i = 2; i < centro.length; i += 2) ctx.lineTo(centro[i], centro[i + 1])
            ctx.lineWidth = 10
            ctx.strokeStyle = `rgba(${f.cor},${0.05 + 0.04 * r.cheio})`
            ctx.stroke()
            ctx.lineWidth = 1.3
            ctx.strokeStyle = `rgba(${f.cor},${0.45 + 0.35 * r.cheio})`
            ctx.stroke()
          }
          ctx.globalCompositeOperation = "source-over"
        },
      }
    },
  })

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      <span
        ref={legendaRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-28 text-center text-xs uppercase tracking-[0.4em] text-white/80 transition-opacity duration-700"
      />
    </>
  )
}
