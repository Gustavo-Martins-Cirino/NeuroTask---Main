"use client"

import { useRef } from "react"
import { FORMULAS, aleatorioComSemente, pedacosDaFormula } from "@/lib/foco-cenas"
import { useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Fórmulas (120 moedas). Ideia do "Formula Stream" do Originkit, escrita aqui:
// equações famosas correndo em faixas levemente curvas, em quatro
// profundidades. O cursor abre caminho e acende as que estão perto; a roda do
// mouse acelera ou freia a correnteza.

const CAMADAS = [
  { escala: 0.6, alfa: 0.28, ritmo: 0.55 },
  { escala: 0.8, alfa: 0.45, ritmo: 0.75 },
  { escala: 1.0, alfa: 0.7, ritmo: 1.0 },
  { escala: 1.3, alfa: 0.95, ritmo: 1.3 },
]
const COR = "rgb(232,228,220)"
const COR_ACESA = "rgb(255,96,32)"
const VELOCIDADE = 34 // px/s na camada do meio
const ALCANCE = 210

interface Sprite {
  canvas: HTMLCanvasElement
  largura: number
  altura: number
  linhaBase: number
}

function fonte(px: number) {
  return `italic 400 ${px}px Georgia, "Times New Roman", serif`
}

function desenhaFormula(formula: string, px: number, cor: string, dpr: number): Sprite {
  const pedacos = pedacosDaFormula(formula)
  const medida = document.createElement("canvas").getContext("2d")!
  const folga = Math.ceil(px * 0.3)
  let x = 0
  const postos = pedacos.map((p) => {
    const tam = p.nivel === 0 ? px : px * 0.62
    medida.font = fonte(tam)
    const w = medida.measureText(p.texto).width
    const posto = { ...p, x, tam, dy: p.nivel === 1 ? -px * 0.42 : p.nivel === -1 ? px * 0.22 : 0 }
    x += w + (p.nivel !== 0 ? px * 0.06 : 0)
    return posto
  })
  const largura = x + folga * 2
  const altura = Math.ceil(px * 1.9)
  const linhaBase = Math.round(px * 1.2)
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.ceil(largura * dpr))
  canvas.height = Math.max(1, Math.ceil(altura * dpr))
  const c = canvas.getContext("2d")!
  c.scale(dpr, dpr)
  c.fillStyle = cor
  c.textBaseline = "alphabetic"
  for (const p of postos) {
    c.font = fonte(p.tam)
    c.fillText(p.texto, folga + p.x, linhaBase + p.dy)
  }
  return { canvas, largura, altura, linhaBase }
}

interface Faixa {
  y: number
  camada: number
  itens: { formula: number; x: number }[]
  ciclo: number
  deslocamento: number
}

export function Formulas(_props: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useMotorDaCena(canvasRef, {
    tipo: "2d",
    roda: { inicial: 1, porClique: 0.18, min: 0.25, max: 3.5 },
    iniciar: (contexto) => {
      const ctx = contexto as CanvasRenderingContext2D
      let chave = ""
      let sprites: Sprite[][] = []
      let acesas: Sprite[][] = []
      let faixas: Faixa[] = []

      const monta = (largura: number, altura: number, dpr: number) => {
        const px = Math.min(28, Math.max(16, largura / 52))
        sprites = CAMADAS.map((c) => FORMULAS.map((f) => desenhaFormula(f, px * c.escala, COR, dpr)))
        acesas = CAMADAS.map((c) => FORMULAS.map((f) => desenhaFormula(f, px * c.escala, COR_ACESA, dpr)))
        const rnd = aleatorioComSemente(1729)
        const curva = altura * 0.07
        const total = Math.max(6, Math.round(altura / 46))
        const passo = (altura + curva * 2 + 80) / total
        faixas = []
        for (let i = 0; i < total; i++) {
          const camada = Math.floor(rnd() * CAMADAS.length)
          const ordem = FORMULAS.map((_, k) => k)
          for (let k = ordem.length - 1; k > 0; k--) {
            const j = Math.floor(rnd() * (k + 1))
            ;[ordem[k], ordem[j]] = [ordem[j], ordem[k]]
          }
          const vao = 70 * CAMADAS[camada].escala
          const itens: Faixa["itens"] = []
          let x = 0
          let k = 0
          const maior = Math.max(...sprites[camada].map((s) => s.largura))
          while (x < largura + maior + vao || k < 3) {
            const formula = ordem[k % ordem.length]
            itens.push({ formula, x })
            x += sprites[camada][formula].largura + vao
            k++
          }
          faixas.push({ y: -curva - 40 + passo * (i + 0.5) + (rnd() - 0.5) * passo * 0.35, camada, itens, ciclo: x, deslocamento: rnd() * x })
        }
      }

      return {
        desenhar: (q) => {
          const k = `${Math.round(q.largura)}x${Math.round(q.altura)}@${q.dpr}`
          if (k !== chave) {
            chave = k
            monta(q.largura, q.altura, q.dpr)
          }
          const { largura: W, altura: H, dpr } = q
          const curva = H * 0.07
          const px = q.ponteiro.x * W
          const py = q.ponteiro.y * H
          const forca = 0.45 * q.ponteiro.presente
          const yDaFaixa = (base: number, x: number) => {
            const u = (x - W / 2) / (W / 2)
            let y = base - curva * (1 - u * u)
            if (forca > 0.01) {
              const dx = x - px
              const dy = y - py
              const d = (dx * dx + dy * dy) / (ALCANCE * ALCANCE)
              if (d < 1) y += dy * forca * (1 - d) * (1 - d)
            }
            return y
          }

          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
          for (const faixa of faixas) {
            const camada = CAMADAS[faixa.camada]
            faixa.deslocamento = (faixa.deslocamento + q.dt * VELOCIDADE * camada.ritmo * q.roda) % faixa.ciclo
            for (const item of faixa.itens) {
              const s = sprites[faixa.camada][item.formula]
              for (const copia of [0, -faixa.ciclo]) {
                const x0 = item.x + faixa.deslocamento + copia
                if (x0 > W || x0 + s.largura < 0) continue
                const yE = yDaFaixa(faixa.y, x0)
                const yD = yDaFaixa(faixa.y, x0 + s.largura)
                const angulo = Math.atan2(yD - yE, s.largura)
                const cos = Math.cos(angulo)
                const sen = Math.sin(angulo)
                ctx.setTransform(dpr * cos, dpr * sen, -dpr * sen, dpr * cos, x0 * dpr, yE * dpr)
                ctx.globalAlpha = camada.alfa
                ctx.drawImage(s.canvas, 0, -s.linhaBase, s.largura, s.altura)
                if (q.ponteiro.presente > 0.02) {
                  const cx = x0 + s.largura / 2
                  const cy = (yE + yD) / 2
                  const d = ((cx - px) ** 2 + (cy - py) ** 2) / (ALCANCE * ALCANCE)
                  if (d < 1) {
                    ctx.globalAlpha = camada.alfa * q.ponteiro.presente * (1 - d) * (1 - d)
                    ctx.drawImage(acesas[faixa.camada][item.formula].canvas, 0, -s.linhaBase, s.largura, s.altura)
                  }
                }
              }
            }
          }
          ctx.globalAlpha = 1
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
