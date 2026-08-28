"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, NormalBlending,
  Matrix4, Points, Ray, Raycaster, Vector3, type Group,
} from "three"
import { useTheme } from "next-themes"
import { TickerDoGsap } from "@/components/r3f-ticker"
import {
  pontosDaEsfera, intensidadeDaRepulsao, fatorDeRetorno, respiracao, velocidadeDoGiro,
  brilhoPorProfundidade, inclinacaoDoEixo,
} from "@/lib/neuro-sphere"

// A presença da Neuro IA no chat: uma casca de partículas que gira devagar,
// respira e abre onde o cursor passa. Acelera enquanto a resposta não chega —
// é o único sinal de "estou trabalhando" que sobra antes do primeiro texto.
//
// Referência visual: o "Particle Sphere" do Originkit, reescrito nos padrões
// daqui — o original abre o próprio requestAnimationFrame e fala com o
// WebGLRenderer na mão. Este roda dentro do R3F e no mesmo ticker do resto do
// app. As contas que são decisão nossa moram em lib/neuro-sphere.ts.

const QUANTIDADE = 1400
const RAIO = 1
/** Alcance do cursor, em unidades de cena — a esfera tem raio 1. */
const ALCANCE_DO_CURSOR = 0.42
const FORCA_DO_CURSOR = 2.6

function temWebGL() {
  try {
    const c = document.createElement("canvas")
    return !!(c.getContext("webgl2") || c.getContext("webgl"))
  } catch {
    return false
  }
}

function usaMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const ler = () => setReduzido(mq.matches)
    ler()
    mq.addEventListener("change", ler)
    return () => mq.removeEventListener("change", ler)
  }, [])
  return reduzido
}

/** Não desenhar para ninguém: o chat rola, e a esfera vive no topo. */
function useNaTela<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [naTela, setNaTela] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const obs = new IntersectionObserver(([e]) => setNaTela(e.isIntersecting), { rootMargin: "120px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
  return naTela
}

/**
 * O token `--primary` é oklch, e o three não lê oklch (`Color.setStyle` cobre
 * hex, rgb e hsl). Fixar um hex equivalente sairia de sincronia com o tema na
 * primeira vez que a paleta mudasse — então quem converte é o navegador:
 * pintar um pixel num canvas 2D aceita qualquer cor que o CSS aceite e devolve
 * bytes. A cor de queda entra ANTES como sentinela: `fillStyle` ignora valor
 * inválido em silêncio, e nesse caso é ela que sobra.
 */
/** O material fica branco: a cor de cada partícula já vem resolvida no atributo,
 *  e o shader multiplica os dois. */
const BRANCO = new Color(1, 1, 1)

function corDoToken(nome: string, queda: string): string {
  try {
    const bruto = getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
    if (!bruto) return queda
    const c = document.createElement("canvas")
    c.width = 1
    c.height = 1
    const ctx = c.getContext("2d")
    if (!ctx) return queda
    ctx.fillStyle = queda
    ctx.fillStyle = bruto
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return `rgb(${r},${g},${b})`
  } catch {
    return queda
  }
}

/** Partícula quadrada denuncia que é um ponto; o degradê radial arredonda. */
function texturaRedonda(): CanvasTexture {
  const lado = 64
  const c = document.createElement("canvas")
  c.width = lado
  c.height = lado
  const ctx = c.getContext("2d")
  if (ctx) {
    const meio = lado / 2
    const g = ctx.createRadialGradient(meio, meio, 0, meio, meio, meio)
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.4, "rgba(255,255,255,0.6)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, lado, lado)
  }
  return new CanvasTexture(c)
}

function Nuvem({
  reduzido, cor, fundo, claro, ponteiroRef,
}: {
  reduzido: boolean
  cor: string
  /** A cor do fundo da página: no tema claro a partícula se dissolve NELA. */
  fundo: string
  claro: boolean
  ponteiroRef: React.RefObject<boolean>
}) {
  // A cor final de cada partícula é resolvida aqui e vai inteira no atributo —
  // o material fica branco. Antes o atributo era só o brilho (cinza) e o
  // material carregava a cor, o que só funciona somando luz.
  const tinta = useMemo(() => new Color(cor), [cor])
  const chao = useMemo(() => new Color(fundo), [fundo])
  const grupoRef = useRef<Group>(null)
  const pontosRef = useRef<Points>(null)

  // Onde cada partícula MORA. O deslocamento do cursor é somado por cima, e é
  // por isso que a base fica intacta: sem ela não há para onde voltar.
  const base = useMemo(() => pontosDaEsfera(QUANTIDADE, RAIO), [])
  const deslocamento = useMemo(() => new Float32Array(QUANTIDADE * 3), [])

  const geometria = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute("position", new Float32BufferAttribute(base.slice(), 3))
    // Cinza por partícula: o material multiplica a cor do tema por ele, então
    // aqui só entra o BRILHO da profundidade (ver lib/neuro-sphere.ts).
    g.setAttribute("color", new Float32BufferAttribute(new Float32Array(QUANTIDADE * 3).fill(1), 3))
    return g
  }, [base])
  const textura = useMemo(() => texturaRedonda(), [])

  useEffect(() => () => {
    geometria.dispose()
    textura.dispose()
  }, [geometria, textura])

  // Reaproveitados a cada quadro: alocar 1400 vetores 60 vezes por segundo
  // daria trabalho ao coletor de lixo, e é ele que causa engasgo visível.
  const aux = useMemo(() => ({
    raycaster: new Raycaster(),
    raioLocal: new Ray(),
    inversa: new Matrix4(),
    p: new Vector3(),
    perto: new Vector3(),
    dir: new Vector3(),
  }), [])

  useFrame((state, delta) => {
    const grupo = grupoRef.current
    const pontos = pontosRef.current
    if (!grupo || !pontos) return

    grupo.rotation.y += velocidadeDoGiro(reduzido) * delta
    grupo.scale.setScalar(reduzido ? 1 : respiracao(state.clock.elapsedTime))
    // O eixo do giro balança devagar. Com ele cravado no y, a mesma volta mostra
    // sempre o mesmo desenho e o giro não aparece; balançando, os polos passeiam.
    if (!reduzido) {
      const eixo = inclinacaoDoEixo(state.clock.elapsedTime)
      grupo.rotation.x = eixo.x
      grupo.rotation.z = eixo.z
    }
    grupo.updateMatrixWorld()

    if (!reduzido && ponteiroRef.current) {
      aux.raycaster.setFromCamera(state.pointer, state.camera)
      // O raio vai para o espaço do GRUPO em vez de cada partícula ir para o
      // mundo: uma transformação por quadro no lugar de mil e quatrocentas.
      aux.inversa.copy(grupo.matrixWorld).invert()
      aux.raioLocal.copy(aux.raycaster.ray).applyMatrix4(aux.inversa)

      const camera = aux.raioLocal.origin
      // Só a metade virada para quem olha reage. Sem este corte, a casca de
      // trás — que aparece ATRÁS do vazio aberto na frente — se abriria junto,
      // e o buraco pareceria atravessar a esfera.
      const limiteDaFrente = camera.lengthSq()

      for (let i = 0; i < QUANTIDADE; i++) {
        const k = i * 3
        aux.p.set(
          base[k] + deslocamento[k],
          base[k + 1] + deslocamento[k + 1],
          base[k + 2] + deslocamento[k + 2]
        )
        if (aux.p.distanceToSquared(camera) >= limiteDaFrente) continue

        // Distância até a LINHA do cursor, não até um ponto: é o que
        // corresponde ao que a pessoa vê como "perto do mouse" na tela.
        const forca = intensidadeDaRepulsao(aux.raioLocal.distanceToPoint(aux.p), ALCANCE_DO_CURSOR)
        if (forca <= 0) continue

        aux.raioLocal.closestPointToPoint(aux.p, aux.perto)
        aux.dir.subVectors(aux.p, aux.perto)
        const comprimento = aux.dir.length()
        // Partícula exatamente em cima da linha não tem para onde ser
        // empurrada; normalizar aqui seria dividir por zero.
        if (comprimento < 1e-6) continue
        const empurrao = (forca * FORCA_DO_CURSOR * delta) / comprimento
        deslocamento[k] += aux.dir.x * empurrao
        deslocamento[k + 1] += aux.dir.y * empurrao
        deslocamento[k + 2] += aux.dir.z * empurrao
      }
    }

    const volta = fatorDeRetorno(delta)
    const attr = pontos.geometry.getAttribute("position")
    const posicoes = attr.array as Float32Array
    const attrCor = pontos.geometry.getAttribute("color")
    const cores = attrCor.array as Float32Array

    // A profundidade de cada partícula sai de UMA linha da matriz do grupo (a
    // do z), e não de transformar o vetor inteiro: o resto do resultado seria
    // jogado fora, e são mil e quatrocentas contas por quadro.
    const m = grupo.matrixWorld.elements
    const escala = grupo.scale.x || 1

    for (let i = 0; i < QUANTIDADE; i++) {
      const k = i * 3
      for (let e = 0; e < 3; e++) {
        deslocamento[k + e] *= volta
        posicoes[k + e] = base[k + e] + deslocamento[k + e]
      }
      const z = m[2] * posicoes[k] + m[6] * posicoes[k + 1] + m[10] * posicoes[k + 2] + m[14]
      // O raio acompanha a respiração: sem isso a esfera clarearia e escureceria
      // inteira a cada ciclo, em vez de só mudar de tamanho.
      const brilho = brilhoPorProfundidade(z, RAIO * escala)
      // No escuro a partícula distante APAGA (tende ao preto, e o aditivo soma
      // luz sobre o fundo). No claro ela não pode apagar: preto sobre branco é
      // o ponto de MAIOR contraste, e a esfera viraria uma bola escura com a
      // profundidade invertida. Ali ela se dissolve na cor do fundo.
      if (claro) {
        cores[k] = chao.r + (tinta.r - chao.r) * brilho
        cores[k + 1] = chao.g + (tinta.g - chao.g) * brilho
        cores[k + 2] = chao.b + (tinta.b - chao.b) * brilho
      } else {
        cores[k] = tinta.r * brilho
        cores[k + 1] = tinta.g * brilho
        cores[k + 2] = tinta.b * brilho
      }
    }
    attr.needsUpdate = true
    attrCor.needsUpdate = true
  })

  return (
    <group ref={grupoRef}>
      <points ref={pontosRef} geometry={geometria}>
        <pointsMaterial
          size={0.032}
          sizeAttenuation
          map={textura}
          // Branco de propósito: a cor já vem resolvida por partícula, e o
          // shader MULTIPLICA as duas.
          color={BRANCO}
          vertexColors
          transparent
          // Additivo com depthWrite ligado deixaria a partícula de trás
          // recortar a da frente, e a nuvem ficaria com falhas.
          depthWrite={false}
          // Aditivo só soma LUZ, e sobre branco não há o que somar: no tema
          // claro a esfera sumia — virava um borrão pálido no meio da tela
          // vazia, que é justamente onde ela é o centro da atenção.
          blending={claro ? NormalBlending : AdditiveBlending}
        />
      </points>
    </group>
  )
}

export function NeuroSphere({
  className,
  fallback = null,
}: {
  className?: string
  /** O que aparece no lugar quando o navegador está sem WebGL. */
  fallback?: React.ReactNode
}) {
  // Síncrono no primeiro render: num useEffect o <Canvas> já teria montado e
  // estourado antes da checagem.
  const [webgl] = useState(() => (typeof window === "undefined" ? true : temWebGL()))
  const reduzido = usaMovimentoReduzido()
  const caixaRef = useRef<HTMLDivElement>(null)
  const naTela = useNaTela(caixaRef)
  const ponteiroRef = useRef(false)
  const [socorro, setSocorro] = useState(false)
  const socorrer = useCallback(() => setSocorro(true), [])

  const { resolvedTheme } = useTheme()
  const [cor, setCor] = useState("rgb(75,130,255)")
  const [fundo, setFundo] = useState("rgb(10,10,15)")
  useEffect(() => {
    setCor(corDoToken("--primary", "rgb(75,130,255)"))
    setFundo(corDoToken("--background", "rgb(10,10,15)"))
  }, [resolvedTheme])

  // O tema sai da LUMINÂNCIA do fundo, não do `resolvedTheme`: o que decide se
  // dá para somar luz é a cor que está atrás da esfera, e ela é a mesma conta
  // em qualquer nome de tema que venha a existir.
  const claro = useMemo(() => {
    const [r, g, b] = fundo.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255 > 0.5
  }, [fundo])

  // Sem WebGL sobra o que quem chamou mandou pôr no lugar — a página não fica
  // com um buraco do tamanho da esfera.
  if (!webgl) return <div className={className}>{fallback}</div>

  return (
    <div
      ref={caixaRef}
      aria-hidden
      className={className}
      onPointerEnter={() => { ponteiroRef.current = true }}
      onPointerLeave={() => { ponteiroRef.current = false }}
    >
      <Canvas
        // Quem manda desenhar é o ticker do GSAP; "always" só existe como
        // socorro, se os quadros pararem de chegar.
        //
        // Movimento reduzido também desenha, e isso mudou: antes era "demand",
        // que desenha UMA vez e só volta se algo mudar. Como nada mudava, a
        // esfera ficava congelada no primeiro quadro — e congelada ela não lê
        // como "efeito desligado", lê como cena travada, bem no meio da tela
        // vazia. Agora ela gira devagar (ver GIRO_REDUZIDO), sem respirar e sem
        // reagir ao cursor. O custo por quadro continua limitado pelo mesmo
        // ticker, e some junto quando a esfera sai da tela.
        frameloop={socorro && naTela ? "always" : "never"}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        {!socorro && <TickerDoGsap ativo={naTela} onSocorro={socorrer} />}
        <Nuvem reduzido={reduzido} cor={cor} fundo={fundo} claro={claro} ponteiroRef={ponteiroRef} />
      </Canvas>
    </div>
  )
}
