"use client"

import { useRef } from "react"
import { aleatorioComSemente, entardecer, misturaRgb, type Rgb } from "@/lib/foco-cenas"
import { useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Revoada (260 moedas). O "murmuration" dos estorninhos: milhares de pássaros
// com as três regras de Craig Reynolds (separar, alinhar, juntar), cada um
// olhando só os vizinhos mais próximos — é o que os estorninhos de verdade
// fazem, e é daí que sai a nuvem que dobra sobre si mesma. Quem está virando
// mostra a asa e escurece, e é isso que desenha as ondas que correm pelo bando.
//
// O cursor é o falcão: o bando abre um buraco em volta dele. A roda junta ou
// espalha. E o céu acompanha a sessão: começa no fim de tarde, o sol se põe, e
// na hora azul as janelas acendem lá embaixo.

const VIZINHOS = 10
const PASSO_MORRO = 6
const SILHUETA: Rgb = [13, 10, 22]
// A busca começa na célula do próprio pássaro, e a ordem das outras gira de um
// pássaro para o outro — com o teto de vizinhos, uma ordem fixa puxaria o bando
// inteiro para o mesmo canto.
const VIZINHANCA = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

const cor = (c: Rgb, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`

interface Casa {
  x: number
  base: number
  largura: number
  altura: number
  janelas: { dx: number; dy: number; limiar: number }[]
}

export function Revoada({ progresso }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso

  useMotorDaCena(canvasRef, {
    tipo: "2d",
    dprMaximo: 1.5,
    roda: { inicial: 0.5, porClique: 0.08, min: 0, max: 1 },
    iniciar: (contexto) => {
      const ctx = contexto as CanvasRenderingContext2D
      const toque = window.matchMedia("(pointer: coarse)").matches
      const N = toque ? 1200 : 3200
      const px = new Float32Array(N)
      const py = new Float32Array(N)
      const vx = new Float32Array(N)
      const vy = new Float32Array(N)
      const accX = new Float32Array(N)
      const accY = new Float32Array(N)
      const inclina = new Float32Array(N)
      const tamanho = new Float32Array(N)
      const celulaDe = new Int32Array(N)
      const ordem = new Int32Array(N)
      let conta = new Int32Array(1)
      let inicio = new Int32Array(1)
      let enche = new Int32Array(1)
      let cel = 36
      let colunas = 1
      let linhas = 1
      let W = 0
      let H = 0
      let escala = 1
      let chave = ""
      let morroFundo = new Float32Array(0)
      let morroFrente = new Float32Array(0)
      let casas: Casa[] = []
      let estrelas: { x: number; y: number; r: number; fase: number }[] = []
      let aquecido = false
      const rnd = aleatorioComSemente(1863)
      const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-6, rnd()))) * Math.cos(2 * Math.PI * rnd())

      const monta = (w: number, h: number) => {
        if (W > 0) {
          for (let i = 0; i < N; i++) {
            px[i] *= w / W
            py[i] *= h / H
          }
        }
        const primeiraVez = W === 0
        W = w
        H = h
        escala = Math.max(0.6, Math.min(W, H) / 800)
        cel = Math.ceil(36 * escala)
        colunas = Math.ceil(W / cel) + 1
        linhas = Math.ceil(H / cel) + 1
        conta = new Int32Array(colunas * linhas)
        inicio = new Int32Array(colunas * linhas)
        enche = new Int32Array(colunas * linhas)

        if (primeiraVez) {
          // O bando nasce como uma nuvem esticada, voando junto para a direita.
          for (let i = 0; i < N; i++) {
            px[i] = W * 0.3 + gauss() * W * 0.1
            py[i] = H * 0.33 + gauss() * H * 0.06
            const a = -0.15 + gauss() * 0.25
            vx[i] = Math.cos(a) * 110 * escala
            vy[i] = Math.sin(a) * 110 * escala
            tamanho[i] = 0.75 + rnd() * 0.55
          }
        }

        // A paisagem: um morro ao fundo (enevoado) e um à frente, com árvores e casas.
        const r = aleatorioComSemente(77)
        const n = Math.ceil((W + 80) / PASSO_MORRO) + 1
        morroFundo = new Float32Array(n)
        morroFrente = new Float32Array(n)
        const f1 = r() * 6
        const f2 = r() * 6
        const f3 = r() * 6
        const baseFrente = (x: number) => H * (0.875 + 0.022 * Math.sin((x / W) * 3.3 + f3) + 0.008 * Math.sin((x / W) * 9.7 + f1))
        casas = []
        for (const u of [0.07, 0.19, 0.6, 0.74, 0.9]) {
          const largura = (16 + r() * 14) * escala
          const altura = (12 + r() * 10) * escala
          const x = u * W
          const janelas = []
          const quantas = 1 + Math.floor(r() * 3)
          for (let j = 0; j < quantas; j++) {
            janelas.push({ dx: (0.2 + (0.6 * (j + 0.5)) / quantas) * largura, dy: altura * 0.45, limiar: r() * 0.75 })
          }
          casas.push({ x, base: baseFrente(x + largura / 2) + 2, largura, altura, janelas })
        }
        // A mata: copas redondas sobrepostas (sem vão entre elas, senão parecem
        // lápides), mais baixas em trechos de cerca viva, com pinheiros
        // despontando, e clareiras onde ficam as casas.
        const copas: { x: number; raio: number; altura: number; pinheiro: boolean }[] = []
        for (let x = -60; x < W + 60; x += (5 + r() * 8) * escala) {
          const mata = 0.55 + 0.45 * Math.sin((x / W) * 7.3 + f2) * Math.sin((x / W) * 2.1 + f1)
          const pinheiro = r() < 0.12
          const raio = (pinheiro ? 6 + r() * 4 : 8 + r() * 11) * escala
          copas.push({ x, raio, altura: (pinheiro ? 34 + r() * 22 : raio * (0.8 + r() * 0.9)) * escala * (pinheiro ? 1 : mata), pinheiro })
        }
        const clareira = (x: number) => {
          let k = 1
          for (const c of casas) {
            const d = Math.max(c.x - 10 * escala - x, x - c.x - c.largura - 10 * escala, 0)
            k = Math.min(k, Math.min(1, d / (24 * escala)))
          }
          return k
        }
        for (let i = 0; i < n; i++) {
          const x = -40 + i * PASSO_MORRO
          const u = x / W
          morroFundo[i] = H * (0.8 + 0.02 * Math.sin(u * 5.1 + f1) + 0.012 * Math.sin(u * 13 + f2))
          let topo = 0
          for (const c of copas) {
            const d = (x - c.x) / c.raio
            if (Math.abs(d) >= 1) continue
            const h = c.pinheiro ? c.altura * (1 - Math.abs(d)) : c.altura * Math.sqrt(1 - d * d)
            if (h > topo) topo = h
          }
          morroFrente[i] = baseFrente(x) - topo * clareira(x)
        }
        estrelas = []
        const totalEstrelas = Math.round((W * H) / 9000)
        for (let i = 0; i < totalEstrelas; i++) estrelas.push({ x: r() * W, y: r() * H * 0.6, r: 0.4 + r() * 0.9, fase: r() * 6.28 })
      }

      const simula = (dt: number, t: number, coesao: number, hx: number, hy: number, falcao: number) => {
        conta.fill(0)
        for (let i = 0; i < N; i++) {
          let cx = Math.floor(px[i] / cel)
          let cy = Math.floor(py[i] / cel)
          if (cx < 0) cx = 0
          else if (cx >= colunas) cx = colunas - 1
          if (cy < 0) cy = 0
          else if (cy >= linhas) cy = linhas - 1
          const c = cy * colunas + cx
          celulaDe[i] = c
          conta[c]++
        }
        let soma = 0
        for (let c = 0; c < conta.length; c++) {
          inicio[c] = soma
          enche[c] = soma
          soma += conta[c]
        }
        for (let i = 0; i < N; i++) ordem[enche[celulaDe[i]]++] = i

        // A roda: juntar (1) é um bando denso que não se parte; espalhar (0) é uma
        // nuvem frouxa, que o falcão consegue dividir.
        const raio = (18 + 12 * coesao) * escala
        const raio2 = raio * raio
        const sep = (10 - 4 * coesao) * escala
        const sep2 = sep * sep
        const pesoJunta = 1 + 1.5 * coesao
        const pesoCentro = 0.12 + 0.75 * coesao
        let centroX = 0
        let centroY = 0
        for (let i = 0; i < N; i++) {
          centroX += px[i]
          centroY += py[i]
        }
        centroX /= N
        centroY /= N
        // O bando todo passeia: quem segue o alvo é o CENTRO, sem espremer ninguém.
        const alvoX = W * (0.5 + 0.27 * Math.sin(t * 0.07) + 0.07 * Math.sin(t * 0.23 + 2))
        const alvoY = H * (0.36 + 0.11 * Math.sin(t * 0.11 + 1.3) + 0.04 * Math.sin(t * 0.29))
        const derivaX = (alvoX - centroX) * 0.1
        const derivaY = (alvoY - centroY) * 0.1
        const margem = 0.07 * Math.min(W, H)
        const teto = H * 0.7
        const rf = 170 * escala
        const rf2 = rf * rf

        for (let i = 0; i < N; i++) {
          const x = px[i]
          const y = py[i]
          let ax = 0
          let ay = 0
          let mx = 0
          let my = 0
          let jx = 0
          let jy = 0
          let sx = 0
          let sy = 0
          let n = 0
          const c = celulaDe[i]
          const ccx = c % colunas
          const ccy = (c - ccx) / colunas
          busca: for (let v = 0; v < 9; v++) {
            const off = VIZINHANCA[v === 0 ? 0 : 1 + ((v - 1 + i) % 8)]
            const xx = ccx + off[0]
            const yy = ccy + off[1]
            if (xx < 0 || yy < 0 || xx >= colunas || yy >= linhas) continue
            const cc = yy * colunas + xx
            const fim = inicio[cc] + conta[cc]
            for (let k = inicio[cc]; k < fim; k++) {
              const j = ordem[k]
              if (j === i) continue
              const dx = px[j] - x
              const dy = py[j] - y
              const d2 = dx * dx + dy * dy
              if (d2 > raio2) continue
              mx += vx[j]
              my += vy[j]
              jx += dx
              jy += dy
              if (d2 < sep2 && d2 > 1e-4) {
                const d = Math.sqrt(d2)
                const f = (sep - d) / (sep * d)
                sx -= dx * f
                sy -= dy * f
              }
              if (++n >= VIZINHOS) break busca
            }
          }
          if (n > 0) {
            ax += (mx / n - vx[i]) * 2.4 + (jx / n) * pesoJunta + sx * 520 * escala
            ay += (my / n - vy[i]) * 2.4 + (jy / n) * pesoJunta + sy * 520 * escala
          }
          ax += derivaX + (centroX - x) * pesoCentro
          ay += derivaY + (centroY - y) * pesoCentro
          if (x < margem) ax += (margem - x) * 6
          else if (x > W - margem) ax -= (x - W + margem) * 6
          if (y < margem) ay += (margem - y) * 6
          else if (y > teto) ay -= (y - teto) * 6
          if (falcao > 0.02) {
            const dx = x - hx
            const dy = y - hy
            const d2 = dx * dx + dy * dy
            if (d2 < rf2 && d2 > 1) {
              const d = Math.sqrt(d2)
              const k = 1 - d / rf
              const f = (k * k * 3400 * escala * falcao) / d
              ax += dx * f
              ay += dy * f
            }
          }
          accX[i] = ax + (rnd() - 0.5) * 60 * escala
          accY[i] = ay + (rnd() - 0.5) * 60 * escala
        }

        const vMin = 80 * escala
        const vMax = 165 * escala
        for (let i = 0; i < N; i++) {
          const ovx = vx[i]
          const ovy = vy[i]
          let nvx = ovx + accX[i] * dt
          let nvy = ovy + accY[i] * dt
          let s = Math.hypot(nvx, nvy) || 1
          const lim = s > vMax ? vMax : s < vMin ? vMin : s
          nvx *= lim / s
          nvy *= lim / s
          s = lim
          // Quanto a direção girou neste passo, em rad/s: quem vira, inclina e escurece.
          const giro = Math.abs(ovx * nvy - ovy * nvx) / ((Math.hypot(ovx, ovy) || 1) * s * dt)
          inclina[i] += (Math.min(1, giro / 2.2) - inclina[i]) * Math.min(1, dt * 5)
          vx[i] = nvx
          vy[i] = nvy
          px[i] += nvx * dt
          py[i] += nvy * dt
        }
      }

      const morro = (perfil: Float32Array, desloca: number, preenchimento: string) => {
        ctx.beginPath()
        ctx.moveTo(-40 + desloca, H + 2)
        for (let i = 0; i < perfil.length; i++) ctx.lineTo(-40 + i * PASSO_MORRO + desloca, perfil[i])
        ctx.lineTo(-40 + (perfil.length - 1) * PASSO_MORRO + desloca, H + 2)
        ctx.closePath()
        ctx.fillStyle = preenchimento
        ctx.fill()
      }

      return {
        desenhar: (q) => {
          const k = `${Math.round(q.largura)}x${Math.round(q.altura)}`
          if (k !== chave) {
            chave = k
            monta(q.largura, q.altura)
          }
          const { tempo, dpr } = q
          const coesao = q.roda
          const hx = q.ponteiro.x * W
          const hy = q.ponteiro.y * H
          if (!aquecido) {
            // Alguns segundos simulados antes do primeiro quadro: o bando já
            // abre a tela organizado (e o quadro parado do movimento reduzido também).
            aquecido = true
            for (let s = 0; s < (q.reduzido ? 150 : 45); s++) simula(1 / 30, tempo - 5 + s / 30, coesao, 0, 0, 0)
          }
          if (!q.reduzido && q.dt > 0) simula(Math.min(q.dt, 1 / 30), tempo, coesao, hx, hy, q.ponteiro.presente)

          const e = entardecer(progressoRef.current)
          const horizonte = H * 0.8
          const ox = (q.ponteiro.x - 0.5) * q.ponteiro.presente * 16

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          const ceu = ctx.createLinearGradient(0, 0, 0, horizonte)
          ceu.addColorStop(0, cor(e.ceu[0]))
          ceu.addColorStop(0.45, cor(e.ceu[1]))
          ceu.addColorStop(0.82, cor(e.ceu[2]))
          ceu.addColorStop(1, cor(e.ceu[3]))
          ctx.fillStyle = ceu
          ctx.fillRect(0, 0, W, H)

          if (e.noite > 0.01) {
            ctx.fillStyle = "#fff"
            for (const s of estrelas) {
              const pisca = q.reduzido ? 0.8 : 0.6 + 0.4 * Math.sin(tempo * 1.3 + s.fase)
              ctx.globalAlpha = e.noite * pisca * (1 - s.y / (H * 0.6)) * 0.85
              ctx.beginPath()
              ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
              ctx.fill()
            }
            ctx.globalAlpha = 1
          }

          // O sol: desce do fim de tarde até sumir atrás do morro.
          const solX = W * 0.72 - ox * 0.2
          const solY = horizonte - e.sol * H
          const solR = H * 0.042
          const quente = misturaRgb([255, 196, 130], [255, 110, 70], progressoRef.current)
          const halo = ctx.createRadialGradient(solX, solY, solR * 0.5, solX, solY, H * 0.5)
          halo.addColorStop(0, cor(quente, 0.42 * (1 - e.noite)))
          halo.addColorStop(1, cor(quente, 0))
          ctx.fillStyle = halo
          ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = cor(misturaRgb([255, 236, 190], [255, 150, 90], progressoRef.current), 1 - e.noite * 0.6)
          ctx.beginPath()
          ctx.arc(solX, solY, solR, 0, Math.PI * 2)
          ctx.fill()

          // O bando. Dois traços: quem voa reto e quem está virando (maior e mais escuro).
          const tam = 1.7 * escala
          for (let faixa = 0; faixa < 2; faixa++) {
            ctx.beginPath()
            for (let i = 0; i < N; i++) {
              const v = inclina[i]
              if ((v > 0.35 ? 1 : 0) !== faixa) continue
              const s = Math.hypot(vx[i], vy[i]) || 1
              const len = tam * tamanho[i] * (1 + v * 0.9)
              // Visto de baixo, o pássaro é um traço de asa a asa, de través ao voo.
              const ux = (-vy[i] / s) * len
              const uy = (vx[i] / s) * len
              ctx.moveTo(px[i] - ux, py[i] - uy)
              ctx.lineTo(px[i] + ux, py[i] + uy)
            }
            ctx.lineWidth = (faixa ? 1.5 : 1.1) * escala
            ctx.strokeStyle = cor(SILHUETA, faixa ? 0.95 : 0.62)
            ctx.stroke()
          }

          morro(morroFundo, -ox * 0.3, cor(misturaRgb(e.ceu[2], SILHUETA, 0.62)))
          morro(morroFrente, -ox * 0.6, cor(SILHUETA))
          for (const c of casas) {
            const x = c.x - ox * 0.6
            ctx.fillStyle = cor(SILHUETA)
            ctx.beginPath()
            ctx.moveTo(x, c.base)
            ctx.lineTo(x, c.base - c.altura)
            ctx.lineTo(x + c.largura / 2, c.base - c.altura - c.largura * 0.42)
            ctx.lineTo(x + c.largura, c.base - c.altura)
            ctx.lineTo(x + c.largura, c.base)
            ctx.closePath()
            ctx.fill()
            // As janelas acendem uma a uma quando escurece.
            for (const j of c.janelas) {
              const a = Math.min(1, Math.max(0, (e.noite - j.limiar) / 0.2))
              if (a <= 0) continue
              const jw = 3.4 * escala
              ctx.fillStyle = `rgba(255,190,110,${a * 0.18})`
              ctx.fillRect(x + j.dx - jw * 1.8, c.base - c.altura + j.dy - jw * 1.8, jw * 3.6, jw * 3.6)
              ctx.fillStyle = `rgba(255,205,130,${a})`
              ctx.fillRect(x + j.dx - jw / 2, c.base - c.altura + j.dy - jw / 2, jw, jw)
            }
          }
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
