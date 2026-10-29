"use client"

import { useRef } from "react"
import { anguloDoVertical, filmeDaCorola, torcaoDaPetala } from "@/lib/foco-cenas"
import { programa, useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Corola (360 moedas). Ideia do "Corolla Gleam" do Originkit, escrita aqui: um
// anel de pétalas grossas de vidro furta-cor girando devagar. Cada pétala gira
// em torno do próprio eixo conforme o ângulo em que está — de lado (só a borda)
// no alto e embaixo, de frente nas laterais (lib/foco-cenas, torcaoDaPetala).
//
// Cada pétala é um retângulo desenhado no lugar dela; em cada pixel, a SEÇÃO da
// placa (largura, espessura e chanfro, girada pela torção) é resolvida por
// distância exata, e daí sai a normal de verdade: a face, o chanfro e a borda
// pegam luz cada um do seu jeito, e as linhas finas de brilho dos chanfros
// aparecem sozinhas. A cor é um filme fino (como bolha de sabão) que muda com o
// quanto a superfície olha para você e com a altura na pétala.
//
// A roda do mouse abre e fecha a corola; o cursor leva a luz e acende as pétalas
// perto dele. Conforme o foco avança, o vidro esquenta de cor e o giro acalma.

const PETALAS = 27
// Em unidades do raio externo do anel (= 1).
const RAIO_INTERNO = 0.2
const COMPRIMENTO = 0.8
const MEIA_LARGURA = 0.17
const MEIA_ESPESSURA = 0.018
const CHANFRO = 0.006
const FOLGA = 0.03

const TELA_CHEIA = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// O fundo: quase preto, com um brilho baixo ATRÁS do anel (o miolo fica escuro,
// porque é ali que ficam os números do timer), e o brilho esquenta com o foco.
const FUNDO = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uCentro;
uniform float uEscala;
uniform float uFilme;
out vec4 saida;
void main(){
  float d = length(gl_FragCoord.xy - uCentro) / uEscala;
  vec3 base = vec3(0.024, 0.016, 0.047);
  vec3 halo = mix(vec3(0.16, 0.10, 0.36), vec3(0.32, 0.10, 0.20), uFilme / 0.45);
  float g = exp(-(d - 0.62) * (d - 0.62) * 7.0) * 0.5;
  saida = vec4(base + halo * g * 0.5, 1.0);
}`

const VERTICE = `#version 300 es
precision highp float;
uniform vec4 uA[${PETALAS}];
uniform vec4 uB[${PETALAS}];
uniform vec2 uRes;
uniform vec2 uCentro;
uniform float uEscala;
uniform vec4 uGeo;
uniform float uFolga;
out vec2 vL;
flat out vec4 vA;
flat out vec4 vB;
void main(){
  int id = gl_VertexID / 6;
  int c = gl_VertexID - id * 6;
  // dois triângulos por pétala: cantos 0,1,2 e 2,1,3
  int canto = c < 3 ? c : (c == 3 ? 2 : (c == 4 ? 1 : 3));
  vec4 A = uA[id];
  vec2 u = A.xy;
  vec2 n = vec2(-u.y, u.x);
  float meia = uGeo.z * abs(A.z) + uGeo.w * abs(A.w);
  float s = (canto >> 1) == 0 ? uGeo.x - uFolga : uGeo.x + uGeo.y + uFolga;
  float k = ((canto & 1) == 0 ? -1.0 : 1.0) * (meia + uFolga);
  vL = vec2(s, k);
  vA = A;
  vB = uB[id];
  vec2 px = uCentro + (s * u + k * n) * uEscala;
  gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAGMENTO = `#version 300 es
precision highp float;
in vec2 vL;
flat in vec4 vA;
flat in vec4 vB;
uniform vec4 uGeo;
uniform float uChanfro;
uniform float uPxU;
uniform vec3 uLuz;
uniform float uTempo;
uniform float uFilme;
uniform float uFolga;
out vec4 saida;

// O filme fino: cinco cores percorridas em ciclo — índigo, lavanda, verde-água,
// âmbar e magenta.
vec3 filme(float t){
  vec3 c0 = vec3(0.20, 0.02, 0.78);
  vec3 c1 = vec3(0.38, 0.40, 0.85);
  vec3 c2 = vec3(0.02, 0.56, 0.56);
  vec3 c3 = vec3(0.88, 0.47, 0.25);
  vec3 c4 = vec3(0.72, 0.13, 0.42);
  float x = fract(t) * 5.0;
  float f = smoothstep(0.0, 1.0, fract(x));
  int i = int(floor(x));
  vec3 a = i == 0 ? c0 : (i == 1 ? c1 : (i == 2 ? c2 : (i == 3 ? c3 : c4)));
  vec3 b = i == 0 ? c1 : (i == 1 ? c2 : (i == 2 ? c3 : (i == 3 ? c4 : c0)));
  return mix(a, b, f);
}

float caixa(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// A seção da pétala: o ponto (através, profundidade) contra a placa de meia
// largura hw e meia espessura ht, girada pela torção (st = sen, ct = cos).
float secao(vec2 p, float st, float ct, float hw, float ht, float r){
  vec2 largura = vec2(st, ct);
  vec2 espessura = vec2(ct, -st);
  return caixa(vec2(dot(p, largura), dot(p, espessura)), vec2(hw, ht), r);
}

void main(){
  float s = vL.x;
  float k = vL.y;
  float st = vA.z;
  float ct = vA.w;
  float r0 = uGeo.x;
  float L = uGeo.y;
  float hw = uGeo.z;
  float ht = uGeo.w;

  // Ao longo do eixo: as duas pontas são arredondadas (raio = meia largura).
  float meio = r0 + 0.5 * L;
  float dc = abs(s - meio) - (0.5 * L - hw);
  float hwS = dc > 0.0 ? sqrt(max(hw * hw - dc * dc, 0.0)) : hw;
  float r = min(uChanfro, 0.95 * min(max(hwS, 1e-4), ht));
  float meiaProj = hwS * abs(st) + ht * abs(ct);
  float fora = abs(k) - meiaProj;
  if (dc > hw) fora = max(fora, dc - hw);
  float cob = clamp(0.5 - fora / uPxU, 0.0, 1.0);
  if (cob <= 0.0) {
    // Sombra de contato: escurece as pétalas de trás, rente a esta.
    float sh = 0.5 * pow(1.0 - clamp(max(fora, 0.0) / uFolga, 0.0, 1.0), 2.0);
    if (sh < 0.004) discard;
    saida = vec4(0.0, 0.0, 0.0, sh);
    return;
  }

  // O raio de visão desce em profundidade até tocar a placa (a mais à frente).
  float kc = clamp(k, -(meiaProj - 0.3 * r), meiaProj - 0.3 * r);
  float zMax = hwS + ht + 0.01;
  float z = zMax;
  for (int i = 0; i < 24; i++) {
    float d = secao(vec2(kc, z), st, ct, hwS, ht, r);
    if (d < 0.0004) break;
    z -= d;
    if (z < -zMax) break;
  }
  vec2 p = vec2(kc, z);
  float e = 0.25 * uPxU;
  vec2 g = vec2(
    secao(p + vec2(e, 0.0), st, ct, hwS, ht, r) - secao(p - vec2(e, 0.0), st, ct, hwS, ht, r),
    secao(p + vec2(0.0, e), st, ct, hwS, ht, r) - secao(p - vec2(0.0, e), st, ct, hwS, ht, r)
  );
  vec2 ns = normalize(g + vec2(0.0, 1e-9));
  vec2 atraves = vec2(-vA.y, vA.x);
  vec3 N = normalize(vec3(atraves * ns.x, ns.y));

  // Na ponta, a borda dá a volta: a normal dela se inclina para o eixo.
  float noLargo = dot(ns, vec2(st, ct));
  float parede = smoothstep(0.55, 0.95, abs(noLargo));
  if (dc > 0.0 && parede > 0.0) {
    vec3 largura3 = vec3(atraves * st, ct);
    vec3 Np = normalize(sign(noLargo) * hwS * largura3 + sign(s - meio) * dc * vec3(vA.xy, 0.0));
    N = normalize(mix(N, Np, parede));
  }

  float olha = clamp(N.z, 0.0, 1.0);
  float aoLongo = clamp((s - r0) / L, 0.0, 1.0);
  float t = 0.55 * olha + 0.45 * aoLongo + uFilme + vB.y + 0.06 * sin(uTempo * 0.35 + aoLongo * 4.0 + vB.y * 6.0);
  t += 0.33 * parede;
  vec3 cor = filme(t);
  cor *= 0.45 + 0.75 * pow(olha, 0.8);
  // A raiz fica escura: é ela que passa por trás dos números do timer.
  cor *= mix(0.1, 1.0, smoothstep(0.02, 0.55, aoLongo));

  vec3 Lz = normalize(uLuz);
  cor *= 0.6 + 0.55 * clamp(dot(N, Lz) * 0.5 + 0.5, 0.0, 1.0);
  vec3 H = normalize(Lz + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(N, H), 0.0);
  // O chanfro: onde a normal está virando da face para a borda, uma linha fina de brilho.
  float f = abs(noLargo);
  float chanfro = smoothstep(0.12, 0.5, f) * (1.0 - smoothstep(0.5, 0.9, f));
  vec3 quente = vec3(1.0, 0.93, 0.82);
  cor += quente * (pow(nh, 70.0) * 1.1 + chanfro * (0.22 + 0.9 * pow(nh, 8.0)) * 0.75);
  // O reflexo largo e suave que separa vidro de plástico.
  cor += vec3(0.85, 0.88, 1.0) * pow(nh, 14.0) * 0.22 * smoothstep(0.2, 0.6, aoLongo);
  cor += vec3(0.75, 0.8, 1.0) * pow(1.0 - olha, 4.0) * 0.16;
  // Perto do cursor, a pétala acende.
  cor *= 1.0 + 0.22 * vB.x;
  cor += quente * vB.x * chanfro * 0.5;
  cor = clamp(cor, 0.0, 1.0);
  saida = vec4(cor * cob, cob);
}`

export function Corola({ progresso }: PropsDaCena) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso

  useMotorDaCena(canvasRef, {
    tipo: "webgl2",
    dprMaximo: 1.5,
    roda: { inicial: 0.85, porClique: 0.06, min: 0.2, max: 1 },
    iniciar: (contexto) => {
      const gl = contexto as WebGL2RenderingContext
      const pPetala = programa(gl, VERTICE, FRAGMENTO)
      const pFundo = programa(gl, TELA_CHEIA, FUNDO)
      if (!pPetala || !pFundo) return null
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const lugar = (p: WebGLProgram) => {
        const guardados = new Map<string, WebGLUniformLocation | null>()
        return (nome: string) => {
          if (!guardados.has(nome)) guardados.set(nome, gl.getUniformLocation(p, nome))
          return guardados.get(nome) ?? null
        }
      }
      const uP = lugar(pPetala)
      const uF = lugar(pFundo)
      const A = new Float32Array(PETALAS * 4)
      const B = new Float32Array(PETALAS * 4)
      const petalas = Array.from({ length: PETALAS }, (_, i) => ({ i, ux: 0, uy: 1 }))
      let giro = 0

      return {
        desenhar: (q) => {
          const w = gl.drawingBufferWidth
          const h = gl.drawingBufferHeight
          const escala = Math.min(w, h) * 0.47
          const cx = w / 2
          const cy = h / 2
          const prog = progressoRef.current
          const filme = filmeDaCorola(prog)
          if (!q.reduzido) giro += q.dt * 0.1 * (1 - 0.5 * Math.min(1, Math.max(0, prog)))
          const abertura = q.roda * (q.reduzido ? 1 : 0.93 + 0.07 * Math.sin(q.tempo * 0.5))

          // O cursor, em unidades do anel (y para cima, como o GL).
          const pres = q.ponteiro.presente
          const pxU = ((q.ponteiro.x * w - cx) / escala)
          const pyU = (((1 - q.ponteiro.y) * h - cy) / escala)

          for (const pt of petalas) {
            const ang = (pt.i / PETALAS) * Math.PI * 2 + giro
            pt.ux = Math.cos(ang)
            pt.uy = Math.sin(ang)
          }
          // De baixo para cima: a pétala mais perto do alto fica na frente.
          const ordem = [...petalas].sort((a, b) => a.uy - b.uy)
          ordem.forEach((pt, j) => {
            const tau = torcaoDaPetala(anguloDoVertical(pt.ux, pt.uy), 1.6, abertura) * (pt.ux < 0 ? -1 : 1)
            A[j * 4] = pt.ux
            A[j * 4 + 1] = pt.uy
            A[j * 4 + 2] = Math.sin(tau)
            A[j * 4 + 3] = Math.cos(tau)
            const meioDaPetala = RAIO_INTERNO + COMPRIMENTO * 0.5
            const d2 = (pt.ux * meioDaPetala - pxU) ** 2 + (pt.uy * meioDaPetala - pyU) ** 2
            B[j * 4] = Math.exp(-d2 / 0.12) * pres
            B[j * 4 + 1] = (pt.i / PETALAS) * 0.15
          })

          // A luz: segue o cursor; sem ele, dá a volta devagar.
          const solto = [Math.cos(q.tempo * 0.15) * 0.6, Math.sin(q.tempo * 0.15) * 0.6]
          const luz = [solto[0] + (pxU * 0.9 - solto[0]) * pres, solto[1] + (pyU * 0.9 - solto[1]) * pres, 1.1]

          gl.viewport(0, 0, w, h)
          gl.disable(gl.BLEND)
          gl.useProgram(pFundo)
          gl.uniform2f(uF("uRes"), w, h)
          gl.uniform2f(uF("uCentro"), cx, cy)
          gl.uniform1f(uF("uEscala"), escala)
          gl.uniform1f(uF("uFilme"), filme)
          gl.drawArrays(gl.TRIANGLES, 0, 3)

          gl.enable(gl.BLEND)
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
          gl.useProgram(pPetala)
          gl.uniform4fv(uP("uA"), A)
          gl.uniform4fv(uP("uB"), B)
          gl.uniform2f(uP("uRes"), w, h)
          gl.uniform2f(uP("uCentro"), cx, cy)
          gl.uniform1f(uP("uEscala"), escala)
          gl.uniform4f(uP("uGeo"), RAIO_INTERNO, COMPRIMENTO, MEIA_LARGURA, MEIA_ESPESSURA)
          gl.uniform1f(uP("uFolga"), FOLGA)
          gl.uniform1f(uP("uChanfro"), CHANFRO)
          gl.uniform1f(uP("uPxU"), 1 / escala)
          gl.uniform3f(uP("uLuz"), luz[0], luz[1], luz[2])
          gl.uniform1f(uP("uTempo"), q.tempo)
          gl.uniform1f(uP("uFilme"), filme)
          gl.drawArrays(gl.TRIANGLES, 0, PETALAS * 6)
        },
        liberar: () => {
          gl.deleteVertexArray(vao)
          gl.deleteProgram(pPetala)
          gl.deleteProgram(pFundo)
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
