"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { proximoQuadro, relogioNovo, tickerSumiu } from "@/lib/frame-clock"
import { giraARoda, suaviza } from "@/lib/foco-cenas"

// O motor das cenas pagas do Modo Foco: tamanho do canvas, o relógio ÚNICO
// (gsap.ticker, o mesmo do Lenis e do Escritório — com o vigia que devolve a
// cena ao rAF se o ticker sumir), o cursor e a roda do mouse suavizados, e o
// movimento reduzido. Cada cena só diz como desenhar um quadro.
//
// O cursor e a roda são lidos na JANELA, não no canvas: o canvas fica atrás do
// timer e dos botões, e quase nunca é ele o alvo do evento. A roda ignora o que
// acontece dentro de `[data-sem-cena]` (os painéis do Foco rolam por conta
// própria — a lista de músicas, por exemplo).

export interface QuadroDaCena {
  /** Segundos de cena, acumulados com delta limitado (aba oculta não dá salto). */
  tempo: number
  dt: number
  /** Em pixels de CSS. */
  largura: number
  altura: number
  dpr: number
  /** 0–1 no canvas, suavizado; `presente` sobe com o cursor por perto e cai sem ele. */
  ponteiro: { x: number; y: number; presente: number }
  /** O valor da roda, já com inércia (o "Lenis" da cena). */
  roda: number
  reduzido: boolean
}

export interface CenaMontada {
  desenhar: (q: QuadroDaCena) => void
  liberar?: () => void
}

export interface OpcoesDoMotor {
  tipo: "webgl" | "2d"
  /** Teto da densidade de pixels (shader de tela cheia fica bonito em 1). */
  dprMaximo?: number
  roda?: { inicial: number; porClique: number; min: number; max: number }
  iniciar: (contexto: WebGLRenderingContext | CanvasRenderingContext2D, canvas: HTMLCanvasElement) => CenaMontada | null
}

/** Tempo fixo do quadro único de quem prefere menos movimento. */
const TEMPO_PARADO = 14

export function useMotorDaCena(canvasRef: React.RefObject<HTMLCanvasElement | null>, opcoes: OpcoesDoMotor) {
  const opcoesRef = useRef(opcoes)
  opcoesRef.current = opcoes

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const o = opcoesRef.current
    const contexto =
      o.tipo === "webgl"
        ? canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, premultipliedAlpha: false })
        : canvas.getContext("2d")
    // Sem contexto (WebGL desligado, por exemplo), fica a cor de fundo da cena.
    if (!contexto) return
    const cena = o.iniciar(contexto, canvas)
    if (!cena) return

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const toque = window.matchMedia("(pointer: coarse)").matches
    const dprMax = Math.min(o.dprMaximo ?? 2, toque ? 1.5 : 2)

    let largura = 1
    let altura = 1
    let dpr = 1
    const mede = () => {
      dpr = Math.min(window.devicePixelRatio || 1, dprMax)
      largura = Math.max(1, canvas.clientWidth)
      altura = Math.max(1, canvas.clientHeight)
      const w = Math.max(1, Math.round(largura * dpr))
      const h = Math.max(1, Math.round(altura * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    mede()

    const ponteiro = { alvoX: 0.5, alvoY: 0.5, x: 0.5, y: 0.5, presente: 0, alvoPresente: 0 }
    const roda = o.roda ? { alvo: o.roda.inicial, valor: o.roda.inicial } : { alvo: 0, valor: 0 }

    const quadro = (tempo: number, dt: number): QuadroDaCena => ({
      tempo,
      dt,
      largura,
      altura,
      dpr,
      ponteiro: { x: ponteiro.x, y: ponteiro.y, presente: ponteiro.presente },
      roda: roda.valor,
      reduzido,
    })

    // Movimento reduzido: um quadro só, redesenhado quando o tamanho muda.
    if (reduzido) {
      cena.desenhar(quadro(TEMPO_PARADO, 0))
      const ro = new ResizeObserver(() => {
        mede()
        cena.desenhar(quadro(TEMPO_PARADO, 0))
      })
      ro.observe(canvas)
      return () => {
        ro.disconnect()
        cena.liberar?.()
      }
    }

    const ro = new ResizeObserver(mede)
    ro.observe(canvas)

    const aoMover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      ponteiro.alvoX = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      ponteiro.alvoY = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      ponteiro.alvoPresente = 1
    }
    const aoSair = () => {
      ponteiro.alvoPresente = 0
    }
    const aoRolar = (e: WheelEvent) => {
      const cfg = opcoesRef.current.roda
      if (!cfg) return
      if ((e.target as Element | null)?.closest?.("[data-sem-cena]")) return
      roda.alvo = giraARoda(roda.alvo, e.deltaY, cfg.porClique, cfg.min, cfg.max)
    }
    window.addEventListener("pointermove", aoMover, { passive: true })
    document.documentElement.addEventListener("pointerleave", aoSair)
    window.addEventListener("blur", aoSair)
    window.addEventListener("wheel", aoRolar, { passive: true })

    let relogio = relogioNovo(0)
    let ultimoQuadro = performance.now()
    const passo = (agoraS: number) => {
      if (document.hidden) return
      const antes = relogio.tempo
      relogio = proximoQuadro(relogio, agoraS)
      ultimoQuadro = performance.now()
      const dt = relogio.tempo - antes
      ponteiro.x = suaviza(ponteiro.x, ponteiro.alvoX, dt, 6)
      ponteiro.y = suaviza(ponteiro.y, ponteiro.alvoY, dt, 6)
      ponteiro.presente = suaviza(ponteiro.presente, ponteiro.alvoPresente, dt, 3)
      roda.valor = suaviza(roda.valor, roda.alvo, dt, 5)
      cena.desenhar(quadro(relogio.tempo, dt))
    }

    // O relógio único. Se ele parar de mandar quadros com a aba à vista, a cena
    // não congela: volta para um requestAnimationFrame próprio.
    gsap.ticker.add(passo)
    let rafProprio = 0
    const loopProprio = (ms: number) => {
      passo(ms / 1000)
      rafProprio = requestAnimationFrame(loopProprio)
    }
    const vigia = setInterval(() => {
      if (rafProprio || document.hidden) return
      if (tickerSumiu(true, performance.now() - ultimoQuadro)) {
        gsap.ticker.remove(passo)
        rafProprio = requestAnimationFrame(loopProprio)
      }
    }, 500)

    return () => {
      gsap.ticker.remove(passo)
      if (rafProprio) cancelAnimationFrame(rafProprio)
      clearInterval(vigia)
      ro.disconnect()
      window.removeEventListener("pointermove", aoMover)
      document.documentElement.removeEventListener("pointerleave", aoSair)
      window.removeEventListener("blur", aoSair)
      window.removeEventListener("wheel", aoRolar)
      cena.liberar?.()
      // Devolve a GPU na hora: trocar de ambiente várias vezes não acumula contextos.
      if (o.tipo === "webgl") (contexto as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [canvasRef])
}

// ---- Ajudas para as cenas em WebGL ----

export function programa(gl: WebGLRenderingContext, vertice: string, fragmento: string): WebGLProgram | null {
  const compila = (tipo: number, fonte: string) => {
    const s = gl.createShader(tipo)
    if (!s) return null
    gl.shaderSource(s, fonte)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[cena do foco] shader:", gl.getShaderInfoLog(s))
      gl.deleteShader(s)
      return null
    }
    return s
  }
  const v = compila(gl.VERTEX_SHADER, vertice)
  const f = compila(gl.FRAGMENT_SHADER, fragmento)
  if (!v || !f) return null
  const p = gl.createProgram()
  if (!p) return null
  gl.attachShader(p, v)
  gl.attachShader(p, f)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn("[cena do foco] programa:", gl.getProgramInfoLog(p))
    return null
  }
  return p
}

/**
 * Ruído simplex 2D em GLSL — a implementação pública de Ashima Arts / Stefan
 * Gustavson (licença MIT), a que quase todo shader de "fluido" usa por baixo.
 */
export const RUIDO_SIMPLEX = `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`
