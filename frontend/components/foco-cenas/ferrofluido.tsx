"use client"

import { useRef } from "react"
import { aleatorioComSemente, coesaoDasGotas } from "@/lib/foco-cenas"
import { programa, useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Ferrofluido (400 moedas). Gotas de metal líquido preto que obedecem ao cursor
// como a um ímã: a superfície é um campo de "metaballs" (as gotas se fundem
// quando se encostam), e perto do ímã nascem os ESPINHOS — a instabilidade de
// Rosensweig, a coroa de ouriço que o ferrofluido de verdade faz. Os espinhos
// seguem o ângulo em volta do ímã, não o de cada gota, e por isso se alinham
// numa coroa só mesmo com várias gotas juntas.
//
// A roda fortalece ou enfraquece o ímã (mais forte = espinhos maiores e puxão
// mais firme). Sem cursor, o ímã passeia sozinho. E as gotas se procuram mais
// conforme o foco avança: no fim da sessão viram uma gota só.

const MAX_GOTAS = 10

const VERTICE = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAGMENTO = `
precision highp float;
uniform vec2 uRes;
uniform float uTempo;
uniform vec2 uIma;
uniform float uForca;
uniform float uN;
uniform vec3 uGotas[${MAX_GOTAS}];

float campo(vec2 p, out float base){
  float f = 0.0;
  for (int i = 0; i < ${MAX_GOTAS}; i++) {
    if (float(i) >= uN) break;
    vec3 g = uGotas[i];
    vec2 d = p - g.xy;
    float d2 = dot(d, d) + 1e-6;
    vec2 u = uIma - g.xy;
    float L = max(length(u), 1e-3);
    // Longe do ímã, a gota se estica na direção dele (vira lágrima).
    float estica = uForca * smoothstep(0.2, 1.0, dot(d, u) / (sqrt(d2) * L)) * clamp(L * 1.5, 0.0, 0.5);
    float r = g.z * (1.0 + estica);
    f += r * r / d2;
  }
  // Os espinhos: uma coroa em volta do ímã, no campo SOMADO — por isso se
  // alinham mesmo com várias gotas juntas. Cada um é um cone (o pico é largo na
  // base e fino na ponta), e só existem perto do ímã.
  vec2 dm = p - uIma;
  float angM = atan(dm.y, dm.x);
  float pico = pow(0.5 + 0.5 * cos(angM * 17.0 + uTempo * 0.06), 3.0);
  pico *= 0.85 + 0.15 * sin(uTempo * 1.4 + angM * 5.0);
  float zona = uForca * (1.0 - smoothstep(0.25, 0.62, length(dm)));
  base = f;
  // Só na borda: dentro do líquido o campo fica liso, senão o reflexo vira rabisco.
  return f * (1.0 + 1.25 * pico * zona * (1.0 - smoothstep(1.2, 3.0, f)));
}

float campo(vec2 p){
  float base;
  return campo(p, base);
}

// O estúdio refletido no metal: uma caixa de luz no alto à esquerda, uma faixa
// vertical à direita, um aro frio vindo de baixo e a sala, bem fraca.
vec3 ambiente(vec3 r){
  vec3 c = vec3(0.0);
  if (r.z > 0.05) {
    vec2 q = r.xy / r.z;
    float caixa = (1.0 - smoothstep(0.24, 0.3, abs(q.x + 0.5))) * (1.0 - smoothstep(0.13, 0.19, abs(q.y - 0.62)));
    float faixa = (1.0 - smoothstep(0.035, 0.06, abs(q.x - 0.72))) * (1.0 - smoothstep(0.45, 0.6, abs(q.y - 0.05)));
    c += vec3(1.0) * caixa * 1.25 + vec3(0.88, 0.94, 1.0) * faixa * 0.85;
  }
  c += vec3(0.3, 0.5, 1.0) * pow(max(0.0, dot(r, normalize(vec3(0.25, -0.85, 0.2)))), 4.0) * 0.55;
  c += vec3(0.32, 0.33, 0.38) * smoothstep(-0.3, 1.0, r.z) * 0.22;
  return c;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float base;
  float f = campo(p, base);

  // A mesa do estúdio: cinza com uma luz no alto, para o metal preto aparecer.
  float luz = clamp(1.0 - 0.85 * length((uv - vec2(0.5, 0.7)) * vec2(0.8, 1.2)), 0.0, 1.0);
  vec3 cor = mix(vec3(0.07, 0.07, 0.085), vec3(0.24, 0.24, 0.27), luz);
  // As linhas do campo magnético, bem fracas, em volta do ímã.
  vec2 dm = p - uIma;
  float raios = pow(0.5 + 0.5 * cos(atan(dm.y, dm.x) * 44.0), 14.0);
  cor += vec3(0.55, 0.62, 0.9) * raios * exp(-length(dm) * 3.5) * 0.07 * uForca;
  // Sombra de contato: a mesa escurece rente ao líquido (o corpo, não os espinhos).
  cor *= 1.0 - 0.5 * smoothstep(0.45, 1.0, base);

  if (f > 0.9) {
    // Altura de esfera: z = r·√(1 − 1/f) — a borda cai na vertical e o topo é redondo.
    float e = 1.5 / uRes.y;
    float z = 0.07 * sqrt(max(0.0, 1.0 - 1.0 / f));
    float zx = 0.07 * sqrt(max(0.0, 1.0 - 1.0 / campo(p + vec2(e, 0.0))));
    float zy = 0.07 * sqrt(max(0.0, 1.0 - 1.0 / campo(p + vec2(0.0, e))));
    vec3 n = normalize(vec3(-(zx - z), -(zy - z), e));
    vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
    float fres = 0.04 + 0.96 * pow(1.0 - n.z, 5.0);
    // A película fina de óleo: furta-cor nas bordas, onde o metal se curva.
    vec3 filme = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + (1.0 - n.z) * 1.3 + uTempo * 0.03));
    vec3 liquido = vec3(0.008, 0.008, 0.011) + ambiente(R) * (0.35 + 0.65 * fres) + filme * fres * 0.28;
    cor = mix(cor, liquido, smoothstep(0.96, 1.04, f));
  }
  gl_FragColor = vec4(cor, 1.0);
}
`

interface Gota {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  fase: number
}

export function Ferrofluido({ progresso }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso

  useMotorDaCena(canvasRef, {
    tipo: "webgl",
    dprMaximo: 1,
    roda: { inicial: 0.5, porClique: 0.08, min: 0.1, max: 1 },
    iniciar: (contexto) => {
      const gl = contexto as WebGLRenderingContext
      const prog = programa(gl, VERTICE, FRAGMENTO)
      if (!prog) return null
      gl.useProgram(prog)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const aPos = gl.getAttribLocation(prog, "aPos")
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
      const uRes = gl.getUniformLocation(prog, "uRes")
      const uTempo = gl.getUniformLocation(prog, "uTempo")
      const uIma = gl.getUniformLocation(prog, "uIma")
      const uForca = gl.getUniformLocation(prog, "uForca")
      const uN = gl.getUniformLocation(prog, "uN")
      const uGotas = gl.getUniformLocation(prog, "uGotas")

      const toque = window.matchMedia("(pointer: coarse)").matches
      const rnd = aleatorioComSemente(321)
      const gotas: Gota[] = Array.from({ length: toque ? 7 : 9 }, () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 0.05 + rnd() * 0.035,
        fase: rnd() * 6.28,
      }))
      const dados = new Float32Array(MAX_GOTAS * 3)
      let posicionadas = false
      let aquecido = false

      // Física das gotas, em unidades da altura da tela (x vai de 0 a largura/altura).
      const simula = (h: number, t: number, asp: number, imaX: number, imaY: number, forca: number, coesao: number) => {
        for (const g of gotas) {
          let ax = 0
          let ay = 0
          const dx = imaX - g.x
          const dy = imaY - g.y
          const L = Math.hypot(dx, dy) + 1e-4
          const puxa = ((forca * 1.6) / (L + 0.25)) * Math.min(1, L * 6)
          ax += (dx / L) * puxa
          ay += (dy / L) * puxa
          for (const o of gotas) {
            if (o === g) continue
            const ex = o.x - g.x
            const ey = o.y - g.y
            const Lo = Math.hypot(ex, ey) + 1e-4
            const minimo = (g.r + o.r) * 0.8
            const k = Lo < minimo ? -(minimo - Lo) * 30 : (coesao * 0.6) / (1 + Lo * 4)
            ax += (ex / Lo) * k
            ay += (ey / Lo) * k
          }
          ax += 0.04 * Math.sin(t * 0.8 + g.fase)
          ay += 0.04 * Math.cos(t * 0.67 + g.fase * 1.3)
          if (g.x < 0.06) ax += (0.06 - g.x) * 20
          else if (g.x > asp - 0.06) ax -= (g.x - asp + 0.06) * 20
          if (g.y < 0.06) ay += (0.06 - g.y) * 20
          else if (g.y > 0.94) ay -= (g.y - 0.94) * 20
          g.vx = (g.vx + ax * h) * Math.exp(-h * 2.4)
          g.vy = (g.vy + ay * h) * Math.exp(-h * 2.4)
        }
        for (const g of gotas) {
          g.x += g.vx * h
          g.y += g.vy * h
        }
      }

      return {
        desenhar: (q) => {
          const asp = q.largura / Math.max(1, q.altura)
          if (!posicionadas) {
            posicionadas = true
            for (const g of gotas) {
              g.x = asp * (0.12 + 0.76 * rnd())
              g.y = 0.12 + 0.76 * rnd()
            }
          }
          // O ímã: o cursor quando está por perto; sem ele, passeia devagar.
          const t = q.tempo
          const vagaX = asp * (0.5 + 0.3 * Math.sin(t * 0.13))
          const vagaY = 0.5 + 0.25 * Math.sin(t * 0.19 + 1)
          const pres = q.ponteiro.presente
          const imaX = vagaX + (q.ponteiro.x * asp - vagaX) * pres
          const imaY = vagaY + (1 - q.ponteiro.y - vagaY) * pres
          const forca = q.roda * (0.55 + 0.45 * pres)
          const coesao = coesaoDasGotas(progressoRef.current)
          if (!aquecido) {
            aquecido = true
            for (let s = 0; s < (q.reduzido ? 240 : 30); s++) simula(1 / 60, t, asp, imaX, imaY, forca, coesao)
          }
          if (!q.reduzido && q.dt > 0) {
            const h = Math.min(q.dt, 1 / 30) / 2
            simula(h, t, asp, imaX, imaY, forca, coesao)
            simula(h, t, asp, imaX, imaY, forca, coesao)
          }

          gotas.forEach((g, i) => {
            dados[i * 3] = g.x
            dados[i * 3 + 1] = g.y
            dados[i * 3 + 2] = g.r
          })
          const w = Math.round(q.largura * q.dpr)
          const hh = Math.round(q.altura * q.dpr)
          gl.viewport(0, 0, w, hh)
          gl.uniform2f(uRes, w, hh)
          gl.uniform1f(uTempo, t)
          gl.uniform2f(uIma, imaX, imaY)
          gl.uniform1f(uForca, forca)
          gl.uniform1f(uN, gotas.length)
          gl.uniform3fv(uGotas, dados)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        },
        liberar: () => {
          gl.deleteBuffer(buf)
          gl.deleteProgram(prog)
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
