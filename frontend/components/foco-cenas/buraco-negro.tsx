"use client"

import { useRef } from "react"
import { aleatorioComSemente } from "@/lib/foco-cenas"
import { programa, useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Buraco negro (320 moedas). Ideia do "Accretion Disc" do Originkit, escrita
// aqui: um disco de partículas girando em órbita de Kepler (as de dentro mais
// rápidas), com braços em espiral e dois jatos. A roda do mouse INCLINA o disco
// (de quase de lado até quase de cima); o cursor gira a câmera um pouco. O giro
// desacelera conforme o foco avança — como se o tempo pesasse perto dele.

const R_FORA = 100
const NUCLEO = 6
const DISTANCIA = 235
// Campo de visão de 34°: a focal é 1 / tan(17°).
const FOCAL = 1 / Math.tan((17 * Math.PI) / 180)

const VERTICE = `
precision highp float;
attribute vec4 aSemente;
attribute float aTipo;
uniform float uTempo;
uniform float uInclinacao;
uniform float uAzimute;
uniform float uAspecto;
uniform float uMeiaAltura;
uniform float uTamanho;
varying float vBrilho;
varying float vMistura;
const float FOCAL = ${FOCAL.toFixed(5)};
const float R_FORA = ${R_FORA.toFixed(1)};
const float NUCLEO = ${NUCLEO.toFixed(1)};
const float DIST = ${DISTANCIA.toFixed(1)};

void some(){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vBrilho = 0.0; vMistura = 0.0; }

void main(){
  float rDentro = NUCLEO * 1.35;
  vec3 p;
  float brilho;
  float mistura;
  if (aTipo == 0.0) {
    float r = sqrt(mix(rDentro * rDentro, R_FORA * R_FORA, aSemente.x));
    float f = clamp((r - rDentro) / (R_FORA - rDentro), 0.0, 1.0);
    // Kepler: a velocidade angular cai com r^1.5.
    float th = aSemente.y + 0.55 * pow(rDentro / r, 1.5) * uTempo;
    float braco = pow(0.5 + 0.5 * cos(3.0 * (th - 3.0 * log(r / rDentro))), 2.4);
    float y = aSemente.z * 1.0 * (0.3 + 0.7 * f);
    p = vec3(r * cos(th), y, r * sin(th));
    float radial = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.45, 1.0, f));
    radial *= 1.0 + 1.4 * exp(-pow((f - 0.3) / 0.2, 2.0));
    brilho = radial * (0.35 + 0.75 * braco) * (0.7 + 0.3 * aSemente.w) * 1.7;
    mistura = clamp((1.0 - f) * 0.6 + braco * 0.5, 0.0, 1.0);
  } else {
    if (aSemente.w > 0.32) { some(); return; }
    float u = fract(aSemente.x + 0.09 * uTempo);
    float subida = pow(u, 1.35) * 260.0;
    float cone = tan(0.5) * subida * (0.3 + 0.7 * u) + NUCLEO * 0.35;
    float rr = aSemente.z * cone;
    float az = aSemente.y + subida * 0.0055;
    p = vec3(rr * cos(az), aTipo * subida, rr * sin(az));
    brilho = mix(1.0, 0.2, u) * (0.3 + 0.7 * (1.0 - aSemente.z)) * 1.4;
    mistura = 0.3 + 0.4 * (1.0 - u);
  }

  // A câmera orbita: gira em volta do eixo vertical (cursor), depois inclina (roda).
  float ca = cos(uAzimute);
  float sa = sin(uAzimute);
  p = vec3(ca * p.x + sa * p.z, p.y, -sa * p.x + ca * p.z);
  float c = cos(uInclinacao);
  float s = sin(uInclinacao);
  vec3 rel = p - vec3(0.0, DIST * s, DIST * c);
  vec3 q = vec3(rel.x, c * rel.y - s * rel.z, s * rel.y + c * rel.z);
  float prof = -q.z;
  if (prof < 1.0) { some(); return; }

  // O que está ATRÁS do núcleo não aparece: é ele que desenha a silhueta escura.
  float len = length(q);
  vec3 dir = q / max(len, 1e-4);
  float tca = -DIST * dir.z;
  float perp2 = DIST * DIST - tca * tca;
  if (perp2 < NUCLEO * NUCLEO) {
    float entra = tca - sqrt(NUCLEO * NUCLEO - perp2);
    if (entra > 0.0 && len > entra) { some(); return; }
  }

  gl_Position = vec4(q.x * FOCAL / (prof * uAspecto), q.y * FOCAL / prof, 0.0, 1.0);
  float px = uTamanho * FOCAL * uMeiaAltura / prof;
  vBrilho = brilho * (px < 1.0 ? px * px : 1.0);
  vMistura = mistura;
  gl_PointSize = clamp(px * 2.0, 1.5, 48.0);
}
`

const FRAGMENTO = `
precision mediump float;
uniform vec3 uBase;
uniform vec3 uAcento;
varying float vBrilho;
varying float vMistura;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  if (r2 > 1.0) discard;
  float g = exp(-r2 * 9.0) + 0.3 * exp(-r2 * 1.8) * (1.0 - r2);
  float e = g * vBrilho;
  gl_FragColor = vec4(mix(uBase, uAcento, vMistura) * e, e);
}
`

function gauss(rnd: () => number) {
  const u1 = Math.max(1e-9, rnd())
  const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rnd())
  return Math.max(-3, Math.min(3, g))
}

function nuvem(total: number) {
  const semente = new Float32Array(total * 4)
  const tipo = new Float32Array(total)
  const rnd = aleatorioComSemente(0x9e3779b9)
  for (let i = 0; i < total; i++) {
    const o = i * 4
    if (rnd() >= 0.3) {
      semente[o] = rnd()
      semente[o + 1] = rnd() * Math.PI * 2
      semente[o + 2] = gauss(rnd)
      semente[o + 3] = rnd()
      tipo[i] = 0
    } else {
      semente[o] = rnd()
      semente[o + 1] = rnd() * Math.PI * 2
      semente[o + 2] = Math.sqrt(rnd())
      semente[o + 3] = rnd()
      tipo[i] = rnd() < 0.5 ? 1 : -1
    }
  }
  return { semente, tipo }
}

export function BuracoNegro({ progresso }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso

  useMotorDaCena(canvasRef, {
    tipo: "webgl",
    dprMaximo: 1.5,
    // Inclinação em radianos: ~5° (de lado) a ~72° (de cima). Começa em ~28°.
    roda: { inicial: 0.49, porClique: 0.07, min: 0.09, max: 1.25 },
    iniciar: (contexto) => {
      const gl = contexto as WebGLRenderingContext
      const prog = programa(gl, VERTICE, FRAGMENTO)
      if (!prog) return null
      gl.useProgram(prog)
      const toque = window.matchMedia("(pointer: coarse)").matches
      const total = toque ? 10000 : 26000
      const { semente, tipo } = nuvem(total)
      const bufSemente = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, bufSemente)
      gl.bufferData(gl.ARRAY_BUFFER, semente, gl.STATIC_DRAW)
      const aSemente = gl.getAttribLocation(prog, "aSemente")
      gl.enableVertexAttribArray(aSemente)
      gl.vertexAttribPointer(aSemente, 4, gl.FLOAT, false, 0, 0)
      const bufTipo = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, bufTipo)
      gl.bufferData(gl.ARRAY_BUFFER, tipo, gl.STATIC_DRAW)
      const aTipo = gl.getAttribLocation(prog, "aTipo")
      gl.enableVertexAttribArray(aTipo)
      gl.vertexAttribPointer(aTipo, 1, gl.FLOAT, false, 0, 0)

      const u = (nome: string) => gl.getUniformLocation(prog, nome)
      const uTempo = u("uTempo")
      const uInclinacao = u("uInclinacao")
      const uAzimute = u("uAzimute")
      const uAspecto = u("uAspecto")
      const uMeiaAltura = u("uMeiaAltura")
      const uTamanho = u("uTamanho")
      gl.uniform3f(u("uBase"), 1.0, 0.37, 0.0)
      gl.uniform3f(u("uAcento"), 1.0, 0.85, 0.63)
      gl.uniform1f(uTamanho, 0.62)
      gl.disable(gl.DEPTH_TEST)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.clearColor(0, 0, 0, 1)

      let giro = 0
      return {
        desenhar: (q) => {
          giro = q.reduzido ? q.tempo : giro + q.dt * 0.8 * (1 - 0.6 * Math.min(1, progressoRef.current))
          const w = Math.round(q.largura * q.dpr)
          const h = Math.round(q.altura * q.dpr)
          gl.viewport(0, 0, w, h)
          gl.clear(gl.COLOR_BUFFER_BIT)
          gl.uniform1f(uTempo, giro)
          gl.uniform1f(uInclinacao, q.roda)
          gl.uniform1f(uAzimute, (q.ponteiro.x - 0.5) * 0.6 * q.ponteiro.presente)
          gl.uniform1f(uAspecto, w / Math.max(h, 1))
          gl.uniform1f(uMeiaAltura, h * 0.5)
          gl.drawArrays(gl.POINTS, 0, total)
        },
        liberar: () => {
          gl.deleteBuffer(bufSemente)
          gl.deleteBuffer(bufTipo)
          gl.deleteProgram(prog)
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
