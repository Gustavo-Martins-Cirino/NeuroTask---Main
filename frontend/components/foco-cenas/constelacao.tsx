"use client"

import { useRef } from "react"
import {
  aleatorioComSemente,
  desenhoDaConstelacao,
  estrelasAcesas,
  estrelasDaSessao,
  suaviza,
  type Estrela,
} from "@/lib/foco-cenas"
import { useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Constelação (480 moedas) — a mais cara porque é a única que mostra o FOCO
// acontecendo: cada 5 minutos focados acendem uma estrela, o traço até a
// próxima vai se desenhando enquanto você foca, e no fim da sessão a figura
// está completa. Uma estrela cadente comemora cada estrela nova.
//
// O céu tem três camadas com profundidades diferentes: o cursor faz paralaxe
// (as de perto andam mais) e a roda do mouse dá zoom com inércia, à maneira do
// Lenis. Referências: three.js (campos de estrelas em camadas) e Lenis.

interface Fundo {
  x: number
  y: number
  raio: number
  fase: number
  ritmo: number
  camada: number
}

const CAMADAS = [0.25, 0.55, 1] // profundidade: quanto a camada se mexe com o cursor e o zoom
// O céu é gerado MAIOR que a tela: no zoom mínimo (0,85) as estrelas se juntam
// para o centro, e sem essa sobra a borda da tela ficava vazia — uma moldura preta.
const SOBRA = 0.12

interface Cadente {
  x: number
  y: number
  vx: number
  vy: number
  inicio: number
}

export function Constelacao({ progresso, duracao }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dadosRef = useRef({ progresso, duracao })
  dadosRef.current = { progresso, duracao }

  useMotorDaCena(canvasRef, {
    tipo: "2d",
    dprMaximo: 1.5,
    roda: { inicial: 1, porClique: 0.08, min: 0.85, max: 1.8 },
    iniciar: (contexto) => {
      const ctx = contexto as CanvasRenderingContext2D
      let chave = ""
      let fundo: Fundo[] = []
      let nebulosa: HTMLCanvasElement | null = null
      let desenho: Estrela[] = []
      let totalDesenhado = 0
      let acesasAntes = -1
      let pulso = -10
      let fracao = 0
      const cadentes: Cadente[] = []
      let proximaCadente = 8
      const rnd = aleatorioComSemente(4242)

      const monta = (W: number, H: number) => {
        const r = aleatorioComSemente(2718)
        fundo = []
        const lado = 1 + 2 * SOBRA
        const area = W * H * lado * lado
        CAMADAS.forEach((_, camada) => {
          const total = Math.round(area / [7000, 13000, 26000][camada])
          for (let i = 0; i < total; i++) {
            fundo.push({
              x: -SOBRA + r() * lado,
              y: -SOBRA + r() * lado,
              raio: (0.4 + r() * 0.9) * (0.6 + camada * 0.35),
              fase: r() * 6.28,
              ritmo: 0.4 + r() * 1.4,
              camada,
            })
          }
        })
        // A nebulosa é desenhada uma vez, pequena, e esticada: borrão não precisa de resolução.
        nebulosa = document.createElement("canvas")
        nebulosa.width = 320
        nebulosa.height = Math.max(1, Math.round((320 * H) / W))
        const n = nebulosa.getContext("2d")!
        const manchas: [number, number, number, string][] = [
          [0.25, 0.3, 0.55, "rgba(60,80,200,0.22)"],
          [0.75, 0.65, 0.5, "rgba(120,60,200,0.16)"],
          [0.55, 0.2, 0.35, "rgba(40,140,200,0.12)"],
        ]
        for (const [mx, my, mr, cor] of manchas) {
          const g = n.createRadialGradient(mx * 320, my * nebulosa.height, 0, mx * 320, my * nebulosa.height, mr * 320)
          g.addColorStop(0, cor)
          g.addColorStop(1, "rgba(0,0,0,0)")
          n.fillStyle = g
          n.fillRect(0, 0, 320, nebulosa.height)
        }
      }

      const brilhoDe = (x: number, y: number, raio: number, alfa: number, cor: string) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, raio)
        g.addColorStop(0, `rgba(${cor},${alfa})`)
        g.addColorStop(1, `rgba(${cor},0)`)
        ctx.fillStyle = g
        ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2)
      }

      return {
        desenhar: (q) => {
          const { largura: W, altura: H, dpr, tempo } = q
          const k = `${Math.round(W)}x${Math.round(H)}`
          if (k !== chave) {
            chave = k
            monta(W, H)
          }
          const { progresso: prog, duracao: dur } = dadosRef.current
          const total = estrelasDaSessao(dur)
          if (total !== totalDesenhado) {
            totalDesenhado = total
            desenho = desenhoDaConstelacao(total)
            acesasAntes = -1
          }
          const acesas = estrelasAcesas(prog, total)
          if (acesasAntes >= 0 && acesas > acesasAntes && !q.reduzido) {
            pulso = tempo
            // Uma estrela cadente comemora a estrela nova.
            cadentes.push({ x: W * (0.2 + rnd() * 0.6), y: H * 0.05, vx: (rnd() < 0.5 ? -1 : 1) * W * 0.5, vy: H * 0.35, inicio: tempo })
          }
          acesasAntes = acesas
          const alvoFracao = acesas < total ? Math.max(0, prog * total - acesas) : 0
          fracao = q.reduzido ? alvoFracao : suaviza(fracao, alvoFracao, q.dt, 2)

          const zoom = q.roda
          const ox = (q.ponteiro.x - 0.5) * q.ponteiro.presente * 28
          const oy = (q.ponteiro.y - 0.5) * q.ponteiro.presente * 20

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.fillStyle = "#03040a"
          ctx.fillRect(0, 0, W, H)
          if (nebulosa) {
            // Nunca menor que a tela (com folga para a paralaxe): a borda da nebulosa era a margem preta.
            const z = Math.max(1, 1 + (zoom - 1) * 0.3) * 1.06
            ctx.drawImage(nebulosa, W / 2 - (W * z) / 2 - ox * 0.2, H / 2 - (H * z) / 2 - oy * 0.2, W * z, H * z)
          }

          // O céu de fundo, camada a camada.
          for (const s of fundo) {
            const prof = CAMADAS[s.camada]
            const z = 1 + (zoom - 1) * prof
            const x = W / 2 + (s.x * W - W / 2) * z - ox * prof
            const y = H / 2 + (s.y * H - H / 2) * z - oy * prof
            if (x < -2 || x > W + 2 || y < -2 || y > H + 2) continue
            const pisca = q.reduzido ? 0.8 : 0.55 + 0.45 * Math.sin(tempo * s.ritmo + s.fase)
            ctx.globalAlpha = (0.25 + 0.5 * prof) * pisca
            ctx.fillStyle = "#e8eeff"
            ctx.beginPath()
            ctx.arc(x, y, s.raio * Math.sqrt(z), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1

          // A constelação da sessão. Ela não encolhe com o zoom: encolher a puxaria
          // para trás do timer, e o céu indo para longe atrás dela já dá a profundidade.
          const z = Math.max(1, zoom)
          const pos = desenho.map((e) => ({
            x: W / 2 + e.x * (W / 2) * z - ox * 1.3,
            y: H / 2 + e.y * (H / 2) * z - oy * 1.3,
            brilho: e.brilho,
          }))
          const completa = acesas >= total
          ctx.lineCap = "round"
          // O caminho que ainda falta, bem fraco: dá para ver a figura a completar.
          if (!completa) {
            ctx.strokeStyle = "rgba(200,215,255,0.09)"
            ctx.lineWidth = 1
            ctx.beginPath()
            for (let i = Math.max(0, acesas - 1); i < total - 1; i++) {
              ctx.moveTo(pos[i].x, pos[i].y)
              ctx.lineTo(pos[i + 1].x, pos[i + 1].y)
            }
            ctx.stroke()
          }
          for (let i = 0; i < acesas - 1; i++) {
            ctx.strokeStyle = `rgba(200,215,255,${completa ? 0.7 : 0.5})`
            ctx.lineWidth = completa ? 1.6 : 1.2
            ctx.beginPath()
            ctx.moveTo(pos[i].x, pos[i].y)
            ctx.lineTo(pos[i + 1].x, pos[i + 1].y)
            ctx.stroke()
          }
          // O traço até a próxima estrela vai se desenhando enquanto você foca.
          if (acesas > 0 && acesas < total && fracao > 0.001) {
            const a = pos[acesas - 1]
            const b = pos[acesas]
            ctx.strokeStyle = "rgba(200,215,255,0.32)"
            ctx.lineWidth = 1
            ctx.setLineDash([3, 5])
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(a.x + (b.x - a.x) * fracao, a.y + (b.y - a.y) * fracao)
            ctx.stroke()
            ctx.setLineDash([])
          }
          pos.forEach((p, i) => {
            if (i < acesas) {
              const respiro = completa && !q.reduzido ? 1 + 0.15 * Math.sin(tempo * 1.5 + i) : 1
              brilhoDe(p.x, p.y, 16 * p.brilho * respiro, 0.55, "190,210,255")
              ctx.fillStyle = "#ffffff"
              ctx.beginPath()
              ctx.arc(p.x, p.y, 2.1 * p.brilho, 0, Math.PI * 2)
              ctx.fill()
            } else {
              // A próxima estrela pisca devagar: é o alvo do bloco atual.
              const proxima = i === acesas
              ctx.globalAlpha = proxima && !q.reduzido ? 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(tempo * 2)) : 0.38
              ctx.fillStyle = "#c8d4ff"
              ctx.beginPath()
              ctx.arc(p.x, p.y, proxima ? 2.2 : 1.7, 0, Math.PI * 2)
              ctx.fill()
              ctx.globalAlpha = 1
            }
          })
          // O pulso da estrela que acabou de acender.
          const desdePulso = tempo - pulso
          if (desdePulso < 1.4 && acesas > 0) {
            const p = pos[acesas - 1]
            const f = desdePulso / 1.4
            ctx.strokeStyle = `rgba(220,230,255,${0.8 * (1 - f)})`
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(p.x, p.y, 4 + 46 * f, 0, Math.PI * 2)
            ctx.stroke()
          }

          // Estrelas cadentes: as da comemoração e, de vez em quando, uma solta.
          if (!q.reduzido) {
            if (tempo > proximaCadente) {
              proximaCadente = tempo + 14 + rnd() * 12
              cadentes.push({ x: W * rnd(), y: H * 0.1 * rnd(), vx: (rnd() < 0.5 ? -1 : 1) * W * 0.45, vy: H * 0.3, inicio: tempo })
            }
            for (let i = cadentes.length - 1; i >= 0; i--) {
              const c = cadentes[i]
              const t = tempo - c.inicio
              if (t > 1.1) {
                cadentes.splice(i, 1)
                continue
              }
              const x = c.x + c.vx * t
              const y = c.y + c.vy * t
              const g = ctx.createLinearGradient(x, y, x - c.vx * 0.18, y - c.vy * 0.18)
              g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - t / 1.1)})`)
              g.addColorStop(1, "rgba(255,255,255,0)")
              ctx.strokeStyle = g
              ctx.lineWidth = 1.4
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x - c.vx * 0.18, y - c.vy * 0.18)
              ctx.stroke()
            }
          }
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
