"use client"

import { useRef } from "react"
import {
  agentesAtivos,
  aleatorioComSemente,
  deveAliviar,
  jeitoDaRede,
  mediaDoQuadro,
  neuroniosAcesos,
  neuroniosDaRede,
  pesoDoMiolo,
} from "@/lib/foco-cenas"
import { programa, useMotorDaCena } from "./motor"
import type { PropsDaCena } from "./tipos"

// Sinapses na placa de vídeo — a versão principal. O mesmo Physarum da versão
// de reserva (sinapses-cpu.tsx), só que com a grade na resolução da TELA e
// centenas de milhares de agentes: é o que deixa a rede fina e nítida em vez de
// borrada. Cada quadro tem quatro passes:
//   1. anda      — cada agente é um pixel de uma textura (x, y, ângulo): cheira o
//                  rastro à frente e dos lados, vira e anda;
//   2. deposita  — cada agente vira um ponto somado numa textura de depósito;
//   3. espalha   — rastro + depósito passam pela média 3×3 e decaem; os
//                  neurônios e o cursor entram aqui, como comida;
//   4. pinta     — a rede na tela, com halo, os disparos e os núcleos.
// Precisa de WebGL2 e de textura de ponto flutuante como alvo
// (EXT_color_buffer_float); sem isso, quem escolhe é sinapses.tsx.

const COMIDA_DOS_NEURONIOS = 4
const DEPOSITO = 1
const DIFUSAO = 0.5
const DECAIMENTO = 0.9
const TOM = 36
const MAX_DISPAROS = 8
// Uma lista de comida no shader: os 12 neurônios, o cursor e uma folga.
const MAX_COMIDA = 14
const MAX_SOMAS = 13

const TELA_CHEIA = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// O miolo do timer, igual a pesoDoMiolo (lib/foco-cenas): a rede cresce em volta dele.
const MIOLO = `
float miolo(vec2 n){
  vec2 q = n / vec2(0.52, 0.5);
  q *= q;
  return 1.0 - smoothstep(0.55, 1.35, q.x * q.x + q.y * q.y);
}`

const ANDA = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uAgentes;
uniform sampler2D uRastro;
uniform vec2 uGrade;
uniform int uLado;
uniform int uAtivos;
uniform float uSA;
uniform float uRA;
uniform float uSD;
uniform float uSemente;
out vec4 saida;
${MIOLO}
float acaso(vec2 p){
  vec3 q = fract(vec3(p.xyx) * 0.1031 + uSemente);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float sente(vec2 c){
  vec2 u = c / uGrade;
  return texture(uRastro, u).r - miolo((fract(u) - 0.5) * 2.0) * 1000.0;
}
void main(){
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(uAgentes, ij, 0);
  if (ij.y * uLado + ij.x >= uAtivos) { saida = a; return; }
  vec2 p = a.xy;
  float ang = a.z;
  float f = sente(p + vec2(cos(ang), sin(ang)) * uSD);
  float e = sente(p + vec2(cos(ang + uSA), sin(ang + uSA)) * uSD);
  float d = sente(p + vec2(cos(ang - uSA), sin(ang - uSA)) * uSD);
  if (f >= e && f >= d) {
  } else if (f < e && f < d) {
    ang += acaso(gl_FragCoord.xy) < 0.5 ? -uRA : uRA;
  } else if (e > d) {
    ang += uRA;
  } else {
    ang -= uRA;
  }
  p = mod(p + vec2(cos(ang), sin(ang)), uGrade);
  saida = vec4(p, mod(ang, 6.2831853), a.w);
}`

const DEPOSITA_V = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uAgentes;
uniform int uLado;
uniform vec2 uGrade;
void main(){
  vec2 p = texelFetch(uAgentes, ivec2(gl_VertexID % uLado, gl_VertexID / uLado), 0).xy;
  gl_Position = vec4((floor(p) + 0.5) / uGrade * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`

const DEPOSITA_F = `#version 300 es
precision highp float;
uniform float uQuanto;
out vec4 saida;
void main(){ saida = vec4(uQuanto, 0.0, 0.0, 1.0); }`

const ESPALHA = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uRastro;
uniform sampler2D uDeposito;
uniform vec2 uGrade;
uniform float uFica;
uniform float uEspalha;
uniform vec4 uComida[${MAX_COMIDA}];
out vec4 saida;
float v(ivec2 c, ivec2 g){
  c = (c + g) % g;
  return texelFetch(uRastro, c, 0).r + texelFetch(uDeposito, c, 0).r;
}
void main(){
  ivec2 g = ivec2(uGrade);
  ivec2 c = ivec2(gl_FragCoord.xy);
  float soma = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) soma += v(c + ivec2(x, y), g);
  }
  float novo = v(c, g) * uFica + soma * uEspalha;
  for (int i = 0; i < ${MAX_COMIDA}; i++) {
    vec4 k = uComida[i];
    if (k.w <= 0.0) continue;
    float d = length(gl_FragCoord.xy - k.xy) / k.z;
    if (d < 1.0) novo += k.w * (1.0 - d);
  }
  saida = vec4(min(novo, 30000.0), 0.0, 0.0, 1.0);
}`

const PINTA = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uRastro;
uniform vec2 uRes;
uniform vec2 uGrade;
uniform float uTom;
uniform float uDpr;
uniform vec4 uDisparos[${MAX_DISPAROS}];
uniform vec4 uSomas[${MAX_SOMAS}];
uniform float uNevoa;
out vec4 saida;

// Do vazio ao mais forte: verde-azulado bioluminescente que esquenta no topo.
vec3 rampa(float t){
  vec3 c0 = vec3(2.0, 8.0, 6.0) / 255.0;
  vec3 c1 = vec3(8.0, 52.0, 46.0) / 255.0;
  vec3 c2 = vec3(14.0, 120.0, 106.0) / 255.0;
  vec3 c3 = vec3(96.0, 214.0, 186.0) / 255.0;
  vec3 c4 = vec3(255.0, 220.0, 150.0) / 255.0;
  vec3 c5 = vec3(255.0, 248.0, 232.0) / 255.0;
  if (t < 0.16) return mix(c0, c1, t / 0.16);
  if (t < 0.4) return mix(c1, c2, (t - 0.16) / 0.24);
  if (t < 0.66) return mix(c2, c3, (t - 0.4) / 0.26);
  if (t < 0.86) return mix(c3, c4, (t - 0.66) / 0.2);
  return mix(c4, c5, clamp((t - 0.86) / 0.14, 0.0, 1.0));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float v = texture(uRastro, uv).r;
  // O halo: anéis de amostras em volta, cada vez mais fracos — o brilho que
  // vaza dos caminhos, e a névoa larga que dá profundidade.
  float halo = 0.0;
  float nevoa = 0.0;
  vec2 passo = 4.0 / uGrade;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982 + 0.39;
    vec2 dir = vec2(cos(a), sin(a)) * passo;
    halo += texture(uRastro, uv + dir).r + texture(uRastro, uv + dir * 2.6).r * 0.6;
    if (uNevoa > 0.5) nevoa += texture(uRastro, uv + dir.yx * 7.0).r;
  }
  halo /= 12.8;
  nevoa /= 8.0;
  // Os disparos: anéis que crescem e acendem só onde há caminho.
  float asp = uRes.x / uRes.y;
  float sinal = 0.0;
  for (int i = 0; i < ${MAX_DISPAROS}; i++) {
    vec4 d = uDisparos[i];
    if (d.w <= 0.0) continue;
    float e = (length((uv - d.xy) * vec2(asp, 1.0)) - d.z) / 0.014;
    sinal += exp(-e * e) * d.w;
  }
  v *= 1.0 + 2.6 * sinal;
  vec3 cor = rampa(1.0 - exp(-v / uTom)) + rampa(1.0 - exp(-halo / uTom)) * 0.55;
  cor += vec3(0.02, 0.16, 0.14) * (1.0 - exp(-nevoa / (uTom * 1.5)));
  // Os núcleos: quentes nos neurônios, frio no cursor.
  for (int i = 0; i < ${MAX_SOMAS}; i++) {
    vec4 s = uSomas[i];
    if (s.z <= 0.0) continue;
    float d = length(gl_FragCoord.xy - s.xy) / uDpr;
    vec3 tom = mix(vec3(1.0, 0.82, 0.55), vec3(0.55, 1.0, 0.9), s.w);
    cor += (vec3(1.0, 0.97, 0.9) * exp(-d * d / 20.0) * 1.4 + tom * exp(-d / 17.0) * 0.75) * s.z;
  }
  saida = vec4(cor, 1.0);
}`

interface Disparo {
  /** 0–1 na tela (y para cima, como o GL). */
  x: number
  y: number
  inicio: number
  /** De qual neurônio saiu (−1 = cursor ou acaso). */
  de: number
}

export function SinapsesGpu({ progresso, aoFalhar }: PropsDaCena & { aoFalhar: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressoRef = useRef(progresso)
  progressoRef.current = progresso
  const falhaRef = useRef(aoFalhar)
  falhaRef.current = aoFalhar

  useMotorDaCena(canvasRef, {
    tipo: "webgl2",
    dprMaximo: 1.5,
    roda: { inicial: 0.3, porClique: 0.06, min: 0, max: 1 },
    iniciar: (contexto, canvas) => {
      const gl = contexto as WebGL2RenderingContext
      const desiste = () => {
        falhaRef.current()
        return null
      }
      if (!gl.getExtension("EXT_color_buffer_float")) return desiste()
      const pAnda = programa(gl, TELA_CHEIA, ANDA)
      const pDeposita = programa(gl, DEPOSITA_V, DEPOSITA_F)
      const pEspalha = programa(gl, TELA_CHEIA, ESPALHA)
      const pPinta = programa(gl, TELA_CHEIA, PINTA)
      if (!pAnda || !pDeposita || !pEspalha || !pPinta) return desiste()
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const lugar = (p: WebGLProgram) => {
        const guardados = new Map<string, WebGLUniformLocation | null>()
        return (nome: string) => {
          if (!guardados.has(nome)) guardados.set(nome, gl.getUniformLocation(p, nome))
          return guardados.get(nome) ?? null
        }
      }
      const uA = lugar(pAnda)
      const uD = lugar(pDeposita)
      const uE = lugar(pEspalha)
      const uP = lugar(pPinta)

      const toque = window.matchMedia("(pointer: coarse)").matches
      const LADO = toque ? 360 : 800
      const total = LADO * LADO
      // Qualidade adaptativa: se a placa não sustentar uns 40 quadros/s, a rede
      // se refaz UMA vez em modo leve — grade menor, metade dos agentes e sem a
      // névoa larga. Placa forte nunca vê a diferença; a fraca não engasga.
      let leve = false
      let mediaDt = 1 / 60
      const maxCelulas = () => (toque ? 450_000 : 2_200_000) * (leve ? 0.45 : 1)
      const neuronios = neuroniosDaRede()
      const acendeu = neuronios.map(() => -10)
      const rnd = aleatorioComSemente(1952)
      const comida = new Float32Array(MAX_COMIDA * 4)
      const somas = new Float32Array(MAX_SOMAS * 4)
      const aneis = new Float32Array(MAX_DISPAROS * 4)
      const disparos: Disparo[] = []

      let chave = ""
      let escala = 1
      let gw = 1
      let gh = 1
      let a = 0
      let texturas: WebGLTexture[] = []
      let quadros: WebGLFramebuffer[] = []
      let agentes: WebGLTexture[] = []
      let fboAgentes: WebGLFramebuffer[] = []
      let rastro: WebGLTexture[] = []
      let fboRastro: WebGLFramebuffer[] = []
      let deposito: WebGLTexture | null = null
      let fboDeposito: WebGLFramebuffer | null = null
      let acumulado = 0
      let aquecido = false
      let proximoDisparo = 1.5
      let ultimoDoCursor = -10
      let acesosAntes = 0

      const textura = (w: number, h: number, interno: number, formato: number, tipo: number, filtro: number, borda: number, dados: ArrayBufferView | null) => {
        const t = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, interno, w, h, 0, formato, tipo, dados)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, borda)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, borda)
        texturas.push(t)
        return t
      }
      const quadroDe = (t: WebGLTexture) => {
        const f = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, f)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
        quadros.push(f)
        return f
      }
      const solta = () => {
        for (const t of texturas) gl.deleteTexture(t)
        for (const f of quadros) gl.deleteFramebuffer(f)
        texturas = []
        quadros = []
      }

      const monta = (w: number, h: number): boolean => {
        solta()
        escala = Math.min(1, Math.sqrt(maxCelulas() / Math.max(1, w * h)))
        gw = Math.max(1, Math.round(w * escala))
        gh = Math.max(1, Math.round(h * escala))
        const dados = new Float32Array(total * 4)
        for (let i = 0; i < total; i++) {
          let x = 0
          let y = 0
          for (let tentativa = 0; tentativa < 8; tentativa++) {
            x = rnd() * gw
            y = rnd() * gh
            if (pesoDoMiolo((x / gw - 0.5) * 2, (y / gh - 0.5) * 2) < 0.3) break
          }
          dados[i * 4] = x
          dados[i * 4 + 1] = y
          dados[i * 4 + 2] = rnd() * Math.PI * 2
        }
        agentes = [
          textura(LADO, LADO, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, dados),
          textura(LADO, LADO, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, null),
        ]
        rastro = [0, 1].map(() => textura(gw, gh, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.LINEAR, gl.REPEAT, null))
        deposito = textura(gw, gh, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, null)
        fboAgentes = agentes.map(quadroDe)
        fboRastro = rastro.map(quadroDe)
        fboDeposito = quadroDe(deposito)
        for (const f of quadros) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, f)
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false
        }
        a = 0
        disparos.length = 0
        return true
      }

      const usa = (unidade: number, t: WebGLTexture) => {
        gl.activeTexture(gl.TEXTURE0 + unidade)
        gl.bindTexture(gl.TEXTURE_2D, t)
      }

      const passo = (roda: number, tempo: number, cx: number, cy: number, presente: number) => {
        const j = jeitoDaRede(roda)
        const ativos = Math.round(agentesAtivos(total, progressoRef.current) * (leve ? 0.5 : 1))
        const b = 1 - a

        // 1. anda
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboAgentes[b])
        gl.viewport(0, 0, LADO, LADO)
        gl.useProgram(pAnda)
        usa(0, agentes[a])
        usa(1, rastro[a])
        gl.uniform1i(uA("uAgentes"), 0)
        gl.uniform1i(uA("uRastro"), 1)
        gl.uniform2f(uA("uGrade"), gw, gh)
        gl.uniform1i(uA("uLado"), LADO)
        gl.uniform1i(uA("uAtivos"), ativos)
        gl.uniform1f(uA("uSA"), j.anguloSensor)
        gl.uniform1f(uA("uRA"), j.anguloGiro)
        gl.uniform1f(uA("uSD"), j.distanciaSensor * 2.6 * escala)
        gl.uniform1f(uA("uSemente"), rnd() * 97)
        gl.drawArrays(gl.TRIANGLES, 0, 3)

        // 2. deposita
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboDeposito)
        gl.viewport(0, 0, gw, gh)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)
        gl.useProgram(pDeposita)
        usa(0, agentes[b])
        gl.uniform1i(uD("uAgentes"), 0)
        gl.uniform1i(uD("uLado"), LADO)
        gl.uniform2f(uD("uGrade"), gw, gh)
        gl.uniform1f(uD("uQuanto"), DEPOSITO)
        gl.drawArrays(gl.POINTS, 0, ativos)
        gl.disable(gl.BLEND)

        // 3. espalha (e a comida: neurônios acesos e o cursor)
        comida.fill(0)
        const acesos = neuroniosAcesos(progressoRef.current, neuronios.length)
        for (let n = 0; n < acesos; n++) {
          if (acendeu[n] < -5) acendeu[n] = tempo
          const nascendo = Math.min(1, (tempo - acendeu[n]) / 3)
          comida.set([((neuronios[n].x + 1) / 2) * gw, ((neuronios[n].y + 1) / 2) * gh, 10 * escala + 2, COMIDA_DOS_NEURONIOS * nascendo], n * 4)
        }
        if (presente > 0.05) comida.set([cx, cy, 16 * escala + 2, 6 * presente], neuronios.length * 4)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboRastro[b])
        gl.useProgram(pEspalha)
        usa(0, rastro[a])
        usa(1, deposito!)
        gl.uniform1i(uE("uRastro"), 0)
        gl.uniform1i(uE("uDeposito"), 1)
        gl.uniform2f(uE("uGrade"), gw, gh)
        gl.uniform1f(uE("uFica"), (1 - DIFUSAO) * DECAIMENTO)
        gl.uniform1f(uE("uEspalha"), (DIFUSAO * DECAIMENTO) / 9)
        gl.uniform4fv(uE("uComida"), comida)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        a = b
      }

      const pinta = (tempo: number, px: number, py: number, presente: number, reduzido: boolean) => {
        const cw = gl.drawingBufferWidth
        const ch = gl.drawingBufferHeight
        const acesos = neuroniosAcesos(progressoRef.current, neuronios.length)
        aneis.fill(0)
        disparos.slice(-MAX_DISPAROS).forEach((d, i) => {
          const idade = tempo - d.inicio
          aneis.set([d.x, d.y, idade * 0.3, Math.max(0, 1 - idade / 2.6)], i * 4)
        })
        somas.fill(0)
        for (let n = 0; n < acesos; n++) {
          const nascendo = reduzido ? 1 : Math.min(1, Math.max(0, (tempo - acendeu[n]) / 1.5))
          let pulso = 0
          for (const d of disparos) if (d.de === n) pulso = Math.max(pulso, 1 - (tempo - d.inicio) / 0.8)
          const respira = reduzido ? 1 : 1 + 0.12 * Math.sin(tempo * 1.7 + n)
          somas.set([((neuronios[n].x + 1) / 2) * cw, ((neuronios[n].y + 1) / 2) * ch, nascendo * respira * (1 + 0.8 * pulso), 0], n * 4)
        }
        if (!reduzido && presente > 0.05) somas.set([px * cw, (1 - py) * ch, presente * 0.8, 1], neuronios.length * 4)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, cw, ch)
        gl.useProgram(pPinta)
        usa(0, rastro[a])
        gl.uniform1i(uP("uRastro"), 0)
        gl.uniform2f(uP("uRes"), cw, ch)
        gl.uniform2f(uP("uGrade"), gw, gh)
        gl.uniform1f(uP("uTom"), TOM)
        gl.uniform1f(uP("uDpr"), cw / Math.max(1, gw / escala))
        gl.uniform4fv(uP("uDisparos"), aneis)
        gl.uniform4fv(uP("uSomas"), somas)
        gl.uniform1f(uP("uNevoa"), leve ? 0 : 1)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }

      return {
        desenhar: (q) => {
          const k = `${Math.round(q.largura)}x${Math.round(q.altura)}`
          if (k !== chave) {
            chave = k
            if (!monta(q.largura, q.altura)) {
              falhaRef.current()
              return
            }
          }
          const { tempo } = q
          const cx = q.ponteiro.x * gw
          const cy = (1 - q.ponteiro.y) * gh
          if (!aquecido) {
            aquecido = true
            // Movimento reduzido: a rede já formada, parada. Sem ele, ela se forma diante de você.
            if (q.reduzido) for (let s = 0; s < 240; s++) passo(q.roda, tempo + 10, 0, 0, 0)
          }
          if (!q.reduzido && q.dt > 0) {
            mediaDt = mediaDoQuadro(mediaDt, q.dt)
            if (!leve && deveAliviar(mediaDt, tempo)) {
              leve = true
              chave = ""
              canvas.dataset.qualidade = "leve"
            }
            // A rede anda a 60 passos por segundo, seja qual for a taxa da tela.
            acumulado += q.dt
            const passos = Math.min(2, Math.floor(acumulado * 60))
            acumulado = Math.min(acumulado - passos / 60, 1 / 30)
            for (let s = 0; s < passos; s++) passo(q.roda, tempo, cx, cy, q.ponteiro.presente)

            const acesos = neuroniosAcesos(progressoRef.current, neuronios.length)
            const centro = (n: number) => ({ x: (neuronios[n].x + 1) / 2, y: (neuronios[n].y + 1) / 2 })
            // Um neurônio que acaba de acender dispara na hora.
            if (acesos > acesosAntes && acesosAntes > 0) disparos.push({ ...centro(acesos - 1), inicio: tempo, de: acesos - 1 })
            acesosAntes = acesos
            if (tempo > proximoDisparo) {
              proximoDisparo = tempo + 1.6 + rnd() * 2.2
              const n = Math.floor(rnd() * acesos)
              disparos.push({ ...centro(n), inicio: tempo, de: n })
            }
            if (q.ponteiro.presente > 0.5 && tempo - ultimoDoCursor > 1.6) {
              ultimoDoCursor = tempo
              disparos.push({ x: q.ponteiro.x, y: 1 - q.ponteiro.y, inicio: tempo, de: -1 })
            }
            while (disparos.length && tempo - disparos[0].inicio > 2.6) disparos.shift()
          }
          pinta(q.reduzido ? -10 : tempo, q.ponteiro.x, q.ponteiro.y, q.ponteiro.presente, q.reduzido)
        },
        liberar: () => {
          solta()
          gl.deleteVertexArray(vao)
          for (const p of [pAnda, pDeposita, pEspalha, pPinta]) gl.deleteProgram(p)
        },
      }
    },
  })

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
}
