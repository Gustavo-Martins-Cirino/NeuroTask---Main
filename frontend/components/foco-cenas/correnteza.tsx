"use client"

import { useRef } from "react"
import { RUIDO_SIMPLEX, programa, useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Correnteza (60 moedas). Ideia do "Fluid Field" do Originkit, escrita aqui:
// correntes de luz que correm sobre um ruído deformado, e um redemoinho onde o
// cursor passa. A correnteza desacelera conforme o foco avança.

const VERTICE = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAGMENTO = `
precision mediump float;
uniform vec2 uRes;
uniform float uTempo;
uniform vec2 uPtr;
uniform float uPresente;
${RUIDO_SIMPLEX}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * asp, uv.y);
  vec2 ptr = vec2(uPtr.x * asp, uPtr.y);

  // O redemoinho do cursor: gira o espaço em volta dele, mais forte no centro.
  vec2 d = p - ptr;
  float giro = exp(-dot(d, d) / 0.05) * uPresente;
  p += vec2(-d.y, d.x) * giro * 0.9;

  float t = uTempo * 0.06;
  vec2 q = p * 1.15;
  q += 0.38 * vec2(snoise(q + vec2(t, -t)), snoise(q * 1.3 - vec2(t * 0.7, t)));

  // As correntes moram onde o ruído passa perto de zero: linhas finas e vivas.
  float n1 = snoise(vec2(q.x * 0.9 + q.y * 1.4 - t * 2.2, t * 0.35));
  float n2 = snoise(vec2(q.x * 1.7 - q.y * 0.7 + t * 1.6, 7.0 + t * 0.25));
  float corrente = 1.0 - smoothstep(0.0, 0.24, abs(n1));
  float fio = 1.0 - smoothstep(0.0, 0.10, abs(n2));

  vec3 azul = vec3(0.16, 0.27, 0.86);
  vec3 violeta = vec3(0.42, 0.21, 0.90);
  vec3 ciano = vec3(0.30, 0.78, 0.98);
  vec3 brilho = mix(azul, violeta, snoise(uv * 1.4 + t) * 0.5 + 0.5);

  vec3 cor = vec3(0.012, 0.016, 0.035);
  cor += brilho * corrente * 0.62;
  cor += ciano * fio * 0.30;
  cor += brilho * giro * 0.12;
  cor *= 1.0 - 0.45 * length(uv - 0.5);
  gl_FragColor = vec4(cor, 1.0);
}
`

export function Correnteza({ progresso }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso

  useMotorDaCena(canvasRef, {
    tipo: "webgl",
    dprMaximo: 1,
    iniciar: (contexto) => {
      const gl = contexto as WebGLRenderingContext
      const prog = programa(gl, VERTICE, FRAGMENTO)
      if (!prog) return null
      gl.useProgram(prog)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      // Um triângulo que cobre a tela inteira.
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const aPos = gl.getAttribLocation(prog, "aPos")
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
      const uRes = gl.getUniformLocation(prog, "uRes")
      const uTempo = gl.getUniformLocation(prog, "uTempo")
      const uPtr = gl.getUniformLocation(prog, "uPtr")
      const uPresente = gl.getUniformLocation(prog, "uPresente")
      // A correnteza anda num tempo próprio, que desacelera com o progresso.
      let tempoDaAgua = 0
      return {
        desenhar: (q) => {
          tempoDaAgua = q.reduzido ? q.tempo : tempoDaAgua + q.dt * (1 - 0.55 * Math.min(1, progressoRef.current))
          const w = Math.round(q.largura * q.dpr)
          const h = Math.round(q.altura * q.dpr)
          gl.viewport(0, 0, w, h)
          gl.uniform2f(uRes, w, h)
          gl.uniform1f(uTempo, tempoDaAgua)
          gl.uniform2f(uPtr, q.ponteiro.x, 1 - q.ponteiro.y)
          gl.uniform1f(uPresente, q.ponteiro.presente)
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
