"use client"

import { useRef } from "react"
import {
  RUMOS_DA_REDE,
  agentesAtivos,
  aleatorioComSemente,
  gradeDaRede,
  jeitoDaRede,
  neuroniosAcesos,
  neuroniosDaRede,
  pesoDoMiolo,
  rumosDoAngulo,
} from "@/lib/foco-cenas"
import { useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Sinapses — a versão de RESERVA, na CPU, para quem não tem WebGL2 com textura
// de ponto flutuante (a principal é sinapses-gpu.tsx; quem escolhe é sinapses.tsx).
// Grade mais grossa que a tela e menos agentes: a mesma rede, mais suave.
//
// Sinapses (600 moedas). Uma rede que se liga sozinha: milhares de agentes no
// modelo do mofo limoso (Physarum, de Jeff Jones) — cada um cheira o rastro à
// frente e dos lados, vira para onde o cheiro é mais forte, anda e deixa rastro.
// Ninguém desenha a rede; ela aparece. Os NEURÔNIOS são comida: o Physarum de
// verdade liga fontes de comida pelo caminho mais curto (é o experimento em que
// ele refez a malha ferroviária de Tóquio), e aqui ele liga os neurônios.
//
// Três neurônios desde o começo; os outros acendem conforme o foco avança, e a
// rede vai buscá-los. Sinais disparam dos neurônios e correm pelos caminhos. O
// cursor é um estímulo — a rede cresce até ele e dispara dali —, a roda muda o
// jeito de crescer (fios longos → rede → células fechadas), e o miolo do timer
// fica livre: a rede cresce em volta dele.

const M = RUMOS_DA_REDE - 1
const DEPOSITO = 5
const DIFUSAO = 0.55
const DECAIMENTO = 0.87
const PENALIDADE_DO_MIOLO = 60
const COMIDA = 24
// A rede anda a 30 passos por segundo: devagar como convém ao foco, e metade do custo.
const PASSO_S = 1 / 30
// Cores do rastro, do vazio ao mais forte: verde-azulado bioluminescente que esquenta no topo.
const PARADAS: [number, [number, number, number]][] = [
  [0, [2, 8, 6]],
  [0.16, [8, 52, 46]],
  [0.4, [14, 120, 106]],
  [0.66, [96, 214, 186]],
  [0.86, [255, 220, 150]],
  [1, [255, 248, 232]],
]
const ESCALA_DO_RASTRO = 300
const TONS = 1024

const COS = new Float32Array(RUMOS_DA_REDE)
const SEN = new Float32Array(RUMOS_DA_REDE)
for (let i = 0; i < RUMOS_DA_REDE; i++) {
  COS[i] = Math.cos((i / RUMOS_DA_REDE) * Math.PI * 2)
  SEN[i] = Math.sin((i / RUMOS_DA_REDE) * Math.PI * 2)
}

interface Disparo {
  x: number
  y: number
  inicio: number
}

function paleta(): Uint32Array {
  const lut = new Uint32Array(TONS)
  // O pixel é gravado como ABGR (a ordem de bytes do navegador é little-endian).
  const peq = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1
  for (let i = 0; i < TONS; i++) {
    const v = (i / (TONS - 1)) * ESCALA_DO_RASTRO
    const t = 1 - Math.exp(-v / 110)
    let k = 1
    while (k < PARADAS.length - 1 && PARADAS[k][0] < t) k++
    const [t0, c0] = PARADAS[k - 1]
    const [t1, c1] = PARADAS[k]
    const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * f)
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * f)
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * f)
    lut[i] = peq ? ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0
  }
  return lut
}

export function SinapsesCpu({ progresso }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso

  useMotorDaCena(canvasRef, {
    tipo: "2d",
    dprMaximo: 1.5,
    roda: { inicial: 0.3, porClique: 0.06, min: 0, max: 1 },
    iniciar: (contexto) => {
      const ctx = contexto as CanvasRenderingContext2D
      const toque = window.matchMedia("(pointer: coarse)").matches
      const maxCelulas = toque ? 60000 : 130000
      const lut = paleta()
      const rnd = aleatorioComSemente(1952)
      const neuronios = neuroniosDaRede()
      // Quando cada neurônio acendeu (para ele nascer devagar, e não estourar).
      const acendeu = neuronios.map(() => -10)
      let chave = ""
      let W = 1
      let H = 1
      let celula = 4
      let gw = 1
      let gh = 1
      let rastro = new Float32Array(1)
      let temp = new Float32Array(1)
      let penal = new Float32Array(1)
      let total = 0
      let agX = new Float32Array(0)
      let agY = new Float32Array(0)
      let agA = new Uint8Array(0)
      let img: ImageData | null = null
      let pix = new Uint32Array(0)
      const tela = document.createElement("canvas")
      const telaCtx = tela.getContext("2d")
      const brilho = document.createElement("canvas")
      const brilhoCtx = brilho.getContext("2d")
      const disparos: Disparo[] = []
      let proximoDisparo = 1.5
      let ultimoDoCursor = -10
      let acesosAntes = 0
      let acumulado = 0
      let aquecido = false

      const emCelulas = (n: { x: number; y: number }) => ({ x: ((n.x + 1) / 2) * (W / celula), y: ((n.y + 1) / 2) * (H / celula) })

      const monta = (w: number, h: number) => {
        W = w
        H = h
        const g = gradeDaRede(W, H, maxCelulas)
        celula = g.celula
        gw = g.colunas
        gh = g.linhas
        rastro = new Float32Array(gw * gh)
        temp = new Float32Array(gw * gh)
        penal = new Float32Array(gw * gh)
        for (let y = 0; y < gh; y++) {
          for (let x = 0; x < gw; x++) {
            const nx = (((x + 0.5) * celula) / W - 0.5) * 2
            const ny = (((y + 0.5) * celula) / H - 0.5) * 2
            penal[y * gw + x] = pesoDoMiolo(nx, ny) * PENALIDADE_DO_MIOLO
          }
        }
        total = Math.min(48000, Math.round(gw * gh * 0.4))
        agX = new Float32Array(total)
        agY = new Float32Array(total)
        agA = new Uint8Array(total)
        for (let i = 0; i < total; i++) {
          let x = 0
          let y = 0
          for (let tentativa = 0; tentativa < 8; tentativa++) {
            x = rnd() * gw
            y = rnd() * gh
            if (penal[Math.floor(y) * gw + Math.floor(x)] < PENALIDADE_DO_MIOLO * 0.3) break
          }
          agX[i] = x
          agY[i] = y
          agA[i] = Math.floor(rnd() * RUMOS_DA_REDE)
        }
        tela.width = gw
        tela.height = gh
        brilho.width = Math.max(1, Math.ceil(gw / 4))
        brilho.height = Math.max(1, Math.ceil(gh / 4))
        img = telaCtx ? telaCtx.createImageData(gw, gh) : null
        pix = img ? new Uint32Array(img.data.buffer) : new Uint32Array(0)
        disparos.length = 0
      }

      const sente = (x: number, y: number) => {
        let xi = x | 0
        let yi = y | 0
        if (xi < 0) xi += gw
        else if (xi >= gw) xi -= gw
        if (yi < 0) yi += gh
        else if (yi >= gh) yi -= gh
        const i = yi * gw + xi
        return rastro[i] - penal[i]
      }

      const cheiro = (cx: number, cy: number, raio: number, quanto: number) => {
        const x0 = Math.max(0, Math.floor(cx - raio))
        const x1 = Math.min(gw - 1, Math.ceil(cx + raio))
        const y0 = Math.max(0, Math.floor(cy - raio))
        const y1 = Math.min(gh - 1, Math.ceil(cy + raio))
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const d = Math.hypot(x - cx, y - cy) / raio
            if (d < 1) rastro[y * gw + x] += quanto * (1 - d)
          }
        }
      }

      const passo = (roda: number, tempo: number, cursorX: number, cursorY: number, presente: number) => {
        const j = jeitoDaRede(roda)
        const sa = rumosDoAngulo(j.anguloSensor)
        const ra = rumosDoAngulo(j.anguloGiro)
        const SD = j.distanciaSensor
        const ativos = agentesAtivos(total, progressoRef.current)
        for (let i = 0; i < ativos; i++) {
          const x = agX[i]
          const y = agY[i]
          let a = agA[i]
          const al = (a - sa) & M
          const ar = (a + sa) & M
          const frente = sente(x + COS[a] * SD, y + SEN[a] * SD)
          const esq = sente(x + COS[al] * SD, y + SEN[al] * SD)
          const dir = sente(x + COS[ar] * SD, y + SEN[ar] * SD)
          if (frente > esq && frente > dir) {
            // segue reto
          } else if (frente < esq && frente < dir) a = (a + (rnd() < 0.5 ? -ra : ra)) & M
          else if (esq > dir) a = (a - ra) & M
          else if (dir > esq) a = (a + ra) & M
          let nx = x + COS[a]
          let ny = y + SEN[a]
          if (nx < 0) nx += gw
          else if (nx >= gw) nx -= gw
          if (ny < 0) ny += gh
          else if (ny >= gh) ny -= gh
          // O Float32 pode arredondar gw − ε para gw: a célula é presa dentro da grade.
          const xi = Math.min(gw - 1, nx | 0)
          const yi = Math.min(gh - 1, ny | 0)
          agX[i] = nx
          agY[i] = ny
          agA[i] = a
          rastro[yi * gw + xi] += DEPOSITO
        }
        // Os neurônios acesos são comida: a rede vai buscá-los e os liga.
        const acesos = neuroniosAcesos(progressoRef.current, neuronios.length)
        for (let n = 0; n < acesos; n++) {
          if (acendeu[n] < -5) acendeu[n] = tempo
          const nascendo = Math.min(1, (tempo - acendeu[n]) / 3)
          const c = emCelulas(neuronios[n])
          cheiro(c.x, c.y, 3.5, COMIDA * nascendo)
        }
        // O estímulo do cursor: um cheiro forte que a rede vem buscar.
        if (presente > 0.05) cheiro(cursorX / celula, cursorY / celula, Math.max(3, 22 / celula), 14 * presente)
        // Espalha e esmaece: parte vira a média 3×3 (a grade dá a volta nas bordas), e tudo decai.
        for (let y = 0; y < gh; y++) {
          const linha = y * gw
          for (let x = 0; x < gw; x++) {
            const l = x > 0 ? x - 1 : gw - 1
            const r = x < gw - 1 ? x + 1 : 0
            temp[linha + x] = rastro[linha + l] + rastro[linha + x] + rastro[linha + r]
          }
        }
        const fica = (1 - DIFUSAO) * DECAIMENTO
        const espalha = (DIFUSAO * DECAIMENTO) / 9
        for (let y = 0; y < gh; y++) {
          const cima = (y > 0 ? y - 1 : gh - 1) * gw
          const baixo = (y < gh - 1 ? y + 1 : 0) * gw
          const linha = y * gw
          for (let x = 0; x < gw; x++) {
            rastro[linha + x] = rastro[linha + x] * fica + (temp[cima + x] + temp[linha + x] + temp[baixo + x]) * espalha
          }
        }
      }

      const pinta = (tempo: number) => {
        if (!img || !telaCtx) return
        const n = gw * gh
        const porTom = (TONS - 1) / ESCALA_DO_RASTRO
        // Os disparos: anéis que crescem e acendem só onde há caminho.
        const aneis = disparos
          .map((d) => ({ x: d.x, y: d.y, r: (tempo - d.inicio) * 0.22 * Math.max(gw, gh), fade: 1 - (tempo - d.inicio) / 2.6 }))
          .filter((a) => a.fade > 0)
        const largura = 4
        for (let i = 0; i < n; i++) {
          let v = rastro[i]
          if (aneis.length && v > 6) {
            const x = i % gw
            const y = (i - x) / gw
            for (const a of aneis) {
              const dx = x - a.x
              const dy = y - a.y
              const d2 = dx * dx + dy * dy
              const dentro = a.r - largura * 3
              const fora = a.r + largura * 3
              if (d2 < fora * fora && (dentro < 0 || d2 > dentro * dentro)) {
                const e = (Math.sqrt(d2) - a.r) / largura
                v *= 1 + 2.6 * Math.exp(-e * e) * a.fade
              }
            }
          }
          const t = (v * porTom) | 0
          pix[i] = lut[t < TONS ? t : TONS - 1]
        }
        telaCtx.putImageData(img, 0, 0)
      }

      return {
        desenhar: (q) => {
          const kk = `${Math.round(q.largura)}x${Math.round(q.altura)}`
          if (kk !== chave) {
            chave = kk
            monta(q.largura, q.altura)
          }
          const { tempo, dpr } = q
          const cursorX = q.ponteiro.x * W
          const cursorY = q.ponteiro.y * H
          if (!aquecido) {
            aquecido = true
            // Movimento reduzido: a rede já formada, parada. Sem ele, ela se forma diante de você.
            if (q.reduzido) for (let s = 0; s < 220; s++) passo(q.roda, tempo + 10, 0, 0, 0)
          }
          const acesos = neuroniosAcesos(progressoRef.current, neuronios.length)
          if (!q.reduzido && q.dt > 0) {
            // Entre um passo e outro não há nada novo: o canvas guarda o quadro anterior.
            acumulado += q.dt
            if (acumulado < PASSO_S * 0.95) return
            acumulado = Math.min(acumulado - PASSO_S, PASSO_S)
            passo(q.roda, tempo, cursorX, cursorY, q.ponteiro.presente)
            // Um neurônio que acaba de acender dispara na hora.
            if (acesos > acesosAntes && acesosAntes > 0) {
              const c = emCelulas(neuronios[acesos - 1])
              disparos.push({ ...c, inicio: tempo })
            }
            if (tempo > proximoDisparo) {
              proximoDisparo = tempo + 1.6 + rnd() * 2.2
              const c = emCelulas(neuronios[Math.floor(rnd() * acesos)])
              disparos.push({ ...c, inicio: tempo })
            }
            if (q.ponteiro.presente > 0.5 && tempo - ultimoDoCursor > 1.6) {
              ultimoDoCursor = tempo
              disparos.push({ x: cursorX / celula, y: cursorY / celula, inicio: tempo })
            }
            while (disparos.length && tempo - disparos[0].inicio > 2.6) disparos.shift()
          }
          acesosAntes = acesos
          pinta(q.reduzido ? -10 : tempo)

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.globalCompositeOperation = "source-over"
          ctx.globalAlpha = 1
          ctx.imageSmoothingEnabled = true
          ctx.drawImage(tela, 0, 0, gw * celula, gh * celula)
          ctx.globalCompositeOperation = "lighter"
          // Brilho barato: a mesma imagem encolhida e esticada de volta, somada por cima.
          if (brilhoCtx) {
            brilhoCtx.clearRect(0, 0, brilho.width, brilho.height)
            brilhoCtx.drawImage(tela, 0, 0, brilho.width, brilho.height)
            ctx.globalAlpha = 0.25
            ctx.drawImage(brilho, 0, 0, gw * celula, gh * celula)
            ctx.globalAlpha = 1
          }
          // Os corpos dos neurônios: um núcleo quente que pulsa quando dispara.
          const soma = (x: number, y: number, raio: number, forca: number, pulso: number, quente: boolean) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, raio)
            g.addColorStop(0, quente ? `rgba(255,246,220,${0.95 * forca})` : `rgba(230,255,250,${0.9 * forca})`)
            g.addColorStop(0.12, quente ? `rgba(255,224,160,${0.85 * forca})` : `rgba(150,240,220,${0.75 * forca})`)
            g.addColorStop(0.4, quente ? `rgba(255,186,105,${(0.3 + 0.4 * pulso) * forca})` : `rgba(60,200,180,${0.2 * forca})`)
            g.addColorStop(1, "rgba(255,160,80,0)")
            ctx.fillStyle = g
            ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2)
          }
          for (let n = 0; n < acesos; n++) {
            const nascendo = q.reduzido ? 1 : Math.min(1, Math.max(0, (tempo - acendeu[n]) / 1.5))
            if (nascendo <= 0) continue
            const c = emCelulas(neuronios[n])
            const disparo = disparos.find((d) => d.x === c.x && d.y === c.y)
            const pulso = disparo ? Math.max(0, 1 - (tempo - disparo.inicio) / 0.8) : 0
            const respira = q.reduzido ? 1 : 1 + 0.12 * Math.sin(tempo * 1.7 + n)
            soma(((neuronios[n].x + 1) / 2) * W, ((neuronios[n].y + 1) / 2) * H, (24 + 20 * pulso) * respira * nascendo, nascendo, pulso, true)
          }
          // O cursor é um neurônio de passagem: frio, enquanto ele estiver por perto.
          if (!q.reduzido && q.ponteiro.presente > 0.05) soma(cursorX, cursorY, 20, q.ponteiro.presente, 0, false)
          ctx.globalCompositeOperation = "source-over"
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
