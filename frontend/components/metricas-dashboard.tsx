"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useTimeFormat } from "@/hooks/use-time-format"
import {
  concluidasPorDia, constanciaNaSemana, porHoraDoDia,
  diaMaisConstante, horaMaisProdutiva, rotuloDeHora, totalNoPeriodo,
  sentidoDaTroca, escalonamentoDasBarras,
  type PontoDia, type PontoSemana, type PontoHora,
} from "@/lib/dashboard-metricas"

// A seção de métricas do dashboard.
// Referência: components/inspirações/Captura de tela 2026-08-07 213605.png.
//
// **Fechada por padrão, e essa é a decisão principal.** O dashboard agrada por
// ser minimalista; um painel de números sempre aberto acabaria com isso. Quem
// quiser os números abre — e quem não quiser nem sabe que eles existem.
//
// Três perguntas, não dez, e uma de cada vez (as abas da referência). Cada
// gráfico tem UMA série, então nenhum tem legenda: o título já diz o que está
// plotado, e uma caixinha com um quadradinho só repetiria o título.
//
// A cor é a mesma nas três abas — `--chart-1`, o acento do app — com o cinza de
// apoio para o que não é o destaque. Nas barras isso é o padrão de ÊNFASE: o dia
// (ou a hora) que responde a pergunta acende, o resto recua. Pintar cada barra de
// um tom conforme a altura seria repetir com a cor o que a altura já diz.

const JANELA_DIAS = 28
const DIAS_NA_LINHA = 14
const SEMANAS = 4

type Aba = "dias" | "semana" | "hora"

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "dias", rotulo: "Por dia" },
  { id: "semana", rotulo: "Constância" },
  { id: "hora", rotulo: "Melhor hora" },
]

const ACENTO = "var(--chart-1)"
const APOIO = "var(--muted-foreground)"
// 0.7, e não os 0.3 que pareciam "discreto o bastante": a barra é desenhada
// COM a opacidade, então o que conta é a cor já misturada com o fundo. Medida,
// a 0.3 ela dava 1,54:1 no claro e 1,57:1 no escuro — abaixo do piso de 3:1 que
// uma marca com dado precisa ter. A 0.7 dá 3,12:1 e 3,46:1, e a ênfase não se
// perde: contra o acento, a separação até sobe (ΔE 21,5 e 21,9).
const OPACIDADE_APOIO = 0.7

// **A ALTURA e o CONTEÚDO se movem por regras diferentes, e essa é a decisão.**
//
// A altura vai em tween. Mola em `height: "auto"` passa da altura final e volta,
// e o cartão inteiro balançando não lê como abrir, lê como solavanco — o resto
// do site (Tarefas, Calendário, Foco) também colapsa em tween.
//
// O movimento fica por conta do que está DENTRO, e vem emprestado da entrada do
// dashboard (`app/app/page.tsx`): cada peça sobe 12px com mola macia, uma depois
// da outra. É a mesma mola de lá, não uma parecida — a tela abre com esse
// movimento, e a seção agora abre com ele também.
//
// Fechar é mais curto que abrir de propósito: quem abre está sendo apresentado
// ao conteúdo e o tempo a mais é confortável; quem fecha já decidiu.
const ABRIR = { duration: 0.44, ease: [0.22, 0.61, 0.36, 1] as const }
const FECHAR = { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const }

/** A mola da entrada do dashboard, copiada de lá com os mesmos números. */
const MOLA_DASHBOARD = { type: "spring" as const, stiffness: 260, damping: 24 }
/** O intervalo entre as peças, também o do dashboard. */
const ESCALONAMENTO = 0.07

/** O quanto a manchete anda de lado ao trocar de aba. Curto de propósito: a
 *  distância que convence de que veio de algum lugar é bem menor do que a que
 *  parece um carrossel. */
const DESLOCAMENTO_ABA = 28

/** Quanto o traço da linha leva para ser desenhado ponta a ponta. A área e a
 *  bolinha se penduram nesta duração, para os três terminarem juntos.
 *
 *  Medido nas três abas: as colunas terminam em ~0,42s (semana) e ~0,58s (as 24
 *  horas, com o escalonamento). A 0,7s a linha era a mais lenta das três, e como
 *  ela é a aba de entrada, era ela que dava o tempo da seção inteira — com a
 *  saída da aba anterior por cima, passava de 0,8s do clique até parar. Em 0,55s
 *  ela ainda se desenha ponta a ponta, e as três abas passam a terminar por
 *  perto: a seção fica com um ritmo só, em vez de uma aba destoando. */
const DESENHO = 0.55

/** Quanto o gráfico leva para ACENDER, quando o sistema pede menos movimento.
 *
 *  `prefers-reduced-motion` existe contra movimento que embrulha o estômago —
 *  parallax, giro, coisa grande atravessando a tela —, e a recomendação é
 *  REDUZIR, não apagar. Apagando, a troca de aba virava um corte seco: o gráfico
 *  novo aparecia pronto no lugar do velho e a impressão era de que o clique não
 *  fez nada. Aceso, nada se move (a geometria já nasce no lugar final) e ainda
 *  assim dá para ver que uma coisa saiu e outra entrou. */
const FUNDIDO = 0.24

const ALTURA_PLOT = 132
const BANDA_EIXO = 22
// O container inclui a banda do eixo de propósito: dimensionar só o plot deixa
// os rótulos de fora e o cartão ganha uma barrinha de rolagem interna.
const ALTURA_TOTAL = ALTURA_PLOT + BANDA_EIXO
/** A faixa reservada para a dica, acima do plot — é o `pt-7` dos gráficos. */
const BANDA_DICA = 28
/** Altura que a área do gráfico ocupa por inteiro. Reservada na troca de aba:
 *  com `mode="wait"` o gráfico velho sai antes de o novo entrar, e sem um piso
 *  o cartão desabaria e voltaria no vão entre um e outro. */
const ALTURA_AREA = ALTURA_TOTAL + BANDA_DICA
/** Folga nas pontas da linha: r 4.5 da bolinha + 2px de anel, arredondado. */
const MARGEM_LINHA = 7

/**
 * Diz quando o gráfico já pode sair do zero e crescer até o valor.
 *
 * **Por que isto existe em vez de um `initial` no elemento.** O `initial` só
 * roda na MONTAGEM, e o framer sabe bloquear animação de montagem: quem está
 * dentro de um `<AnimatePresence initial={false}>` herda `blockInitialAnimation`
 * pelo contexto de presença — e esse contexto é memoizado SEM o `initial` nas
 * dependências, então o `false` da primeira renderização fica congelado ali.
 * O gráfico monta depois, quando os dados chegam do Supabase, e caía justamente
 * nesse contexto congelado: desenhava-se de uma vez, no estado final.
 *
 * Mudança de `animate` não é animação de montagem, e nenhum bloqueio a alcança.
 * Por isso o alvo vem de um estado que vira no quadro seguinte.
 *
 * O `pronto` é a largura já medida: antes dela o `<svg>` nem existe, e virar a
 * chave antes disso faria as barras montarem já cheias.
 *
 * A chave é a mesma com ou sem `prefers-reduced-motion`, e isso é de propósito:
 * quem pede menos movimento recebe o gráfico ACESO em vez de construído (ver
 * `FUNDIDO` abaixo), e para acender também é preciso um quadro no estado
 * inicial. Enquanto ela dependia da preferência, a troca de aba não tinha
 * transição alguma para essa pessoa — o gráfico novo simplesmente aparecia
 * pronto, e trocar de aba parecia não fazer nada.
 */
function useConstrucao(pronto: boolean): boolean {
  const [construido, setConstruido] = useState(false)

  useEffect(() => {
    if (!pronto) return
    // Um quadro de folga: sem ele o estado zerado pode nunca ser pintado, e o
    // crescimento começaria de um lugar que ninguém viu.
    const id = requestAnimationFrame(() => setConstruido(true))
    return () => cancelAnimationFrame(id)
  }, [pronto])

  return construido
}

/** Largura real em pixels, para o SVG desenhar 1:1 — sem isso um viewBox fixo
 *  esticado por CSS engorda o traço no desktop e some com ele no celular. */
function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(0)

  // useEffect e não useLayoutEffect: o Next renderiza componentes de cliente no
  // servidor também, e lá o layout effect só rende aviso. Não há piscada a
  // evitar — enquanto a largura é 0, nada é desenhado.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(entrada.contentRect.width)
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return [ref, largura] as const
}

// A dica mora numa faixa RESERVADA acima do plot (o `pt-7` dos gráficos). Solta
// por cima do desenho, ela cobriria justamente o pico — o ponto que a pessoa
// está tentando ler é sempre o mais alto.
function Dica({ x, largura, children }: { x: number; largura: number; children: React.ReactNode }) {
  // Gruda na borda quando o ponto está no canto, em vez de sair do cartão.
  const esquerda = Math.min(Math.max(x, 56), Math.max(largura - 56, 56))
  return (
    <div
      className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border/60 bg-popover px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: esquerda }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Linha — concluídas por dia
// ---------------------------------------------------------------------------

function GraficoLinha({ pontos }: { pontos: PontoDia[] }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)
  const semMovimento = useReducedMotion()
  const construido = useConstrucao(largura > 0)

  const maximo = Math.max(1, ...pontos.map((p) => p.total))
  // A margem existe pela PONTA: o último ponto cai no fim do eixo, e sem ela a
  // bolinha (r 4.5 + anel de 2px) sairia metade para fora do SVG. O traço nas
  // duas extremidades também deixava de ser cortado ao meio.
  const passo = pontos.length > 1 ? (largura - MARGEM_LINHA * 2) / (pontos.length - 1) : 0
  const xDe = (i: number) => MARGEM_LINHA + i * passo
  const yDe = (v: number) => ALTURA_PLOT - (v / maximo) * (ALTURA_PLOT - 12) - 6

  const linha = pontos.map((p, i) => `${xDe(i)},${yDe(p.total)}`).join(" ")
  const area = `${xDe(0)},${ALTURA_PLOT} ${linha} ${xDe(pontos.length - 1)},${ALTURA_PLOT}`
  // O MESMO traço, escrito como `path` em vez de `polyline`: o desenho progressivo
  // do framer é `pathLength`, e o atributo que ele usa por baixo tem suporte
  // irregular em `polyline`. Em `path` não há dúvida.
  const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${xDe(i)} ${yDe(p.total)}`).join(" ")

  const ultimo = pontos.length - 1
  const destacado = ativo ?? ultimo

  return (
    <motion.div
      ref={ref}
      className="relative pt-7"
      // Sem `initial`: o dashboard vive dentro de um <AnimatePresence
      // initial={false}> (o PageTransition), e animação de MONTAGEM não roda
      // ali. Por isso o acender também se pendura na chave que vira depois.
      animate={{ opacity: semMovimento && !construido ? 0 : 1 }}
      transition={{ duration: semMovimento ? FUNDIDO : 0 }}
    >
      {largura > 0 && (
        <svg
          width={largura}
          height={ALTURA_TOTAL}
          role="img"
          aria-label={`Tarefas concluídas por dia nos últimos ${pontos.length} dias`}
          onPointerMove={(e) => {
            const caixa = e.currentTarget.getBoundingClientRect()
            const i = Math.round((e.clientX - caixa.left - MARGEM_LINHA) / (passo || 1))
            setAtivo(Math.min(Math.max(i, 0), ultimo))
          }}
          onPointerLeave={() => setAtivo(null)}
        >
          <defs>
            {/* Um hue só, esmaecendo para baixo. O degradê da referência ia de
                laranja a verde; duas matizes para MAGNITUDE inventam uma
                polaridade que não existe no dado. */}
            <linearGradient id="nt-area-dias" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACENTO} stopOpacity="0.16" />
              <stop offset="100%" stopColor={ACENTO} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Base sólida e fininha, um passo fora da superfície — nunca tracejada. */}
          <line
            x1={0} y1={ALTURA_PLOT} x2={largura} y2={ALTURA_PLOT}
            stroke="var(--border)" strokeWidth="1"
          />

          {/* A área não tem como ser "desenhada" — uma mancha não tem ponta
              nem percurso. Ela acende atrás do traço, começando no meio do
              desenho, para chegar junto sem competir com ele. */}
          <motion.polygon
            points={area}
            fill="url(#nt-area-dias)"
            initial={false}
            animate={{ opacity: construido ? 1 : 0 }}
            transition={semMovimento ? { duration: 0 } : { duration: 0.4, delay: DESENHO * 0.4 }}
          />
          {/* O traço se desenha da esquerda para a direita, que é o sentido do
              tempo no eixo: a linha cresce como os dias passaram. */}
          <motion.path
            d={caminho}
            fill="none"
            stroke={ACENTO}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={false}
            animate={{ pathLength: construido ? 1 : 0 }}
            transition={semMovimento ? { duration: 0 } : { duration: DESENHO, ease: "easeInOut" }}
          />

          {ativo !== null && (
            <line
              x1={xDe(ativo)} y1={0} x2={xDe(ativo)} y2={ALTURA_PLOT}
              stroke="var(--border)" strokeWidth="1"
            />
          )}

          {/* Ponta com anel na cor da superfície, para não se perder sobre a
              linha. Ela nasce depois que o traço chega — é o traço que a
              deposita ali, e aparecer antes daria a ordem inversa. Cresce pelo
              raio, e não por `scale`: escala em SVG depende de uma origem de
              transformação que muda de navegador. */}
          <motion.circle
            cx={xDe(destacado)} cy={yDe(pontos[destacado].total)}
            fill={ACENTO} stroke="var(--card)" strokeWidth="2"
            initial={false}
            animate={{ r: construido ? 4.5 : 0 }}
            transition={semMovimento ? { duration: 0 } : { ...MOLA_DASHBOARD, delay: DESENHO * 0.88 }}
          />

          {/* Alvos invisíveis por dia: dão o valor a quem para o cursor e a quem
              usa leitor de tela, sem custar um pixel de tela. */}
          {pontos.map((p, i) => (
            <circle key={p.chave} cx={xDe(i)} cy={yDe(p.total)} r={Math.max(8, passo / 2)} fill="transparent">
              <title>{`${p.rotulo}: ${p.total} ${p.total === 1 ? "tarefa" : "tarefas"}`}</title>
            </circle>
          ))}

          {/* Rótulo direto só nas pontas do eixo — o resto sai na dica. */}
          <text x={MARGEM_LINHA} y={ALTURA_PLOT + 15} className="fill-muted-foreground text-[10px]">
            {pontos[0].rotulo}
          </text>
          <text x={largura - MARGEM_LINHA} y={ALTURA_PLOT + 15} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {pontos[ultimo].rotulo}
          </text>
        </svg>
      )}

      {ativo !== null && (
        <Dica x={xDe(ativo)} largura={largura}>
          <span className="font-medium">{pontos[ativo].total}</span>
          <span className="text-muted-foreground"> em {pontos[ativo].rotulo}</span>
        </Dica>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Colunas — constância e melhor hora, no padrão de ênfase
// ---------------------------------------------------------------------------

interface Coluna {
  chave: string
  rotulo: string
  valor: number
  /** O que a dica escreve — já formatado, porque "3 de 4 segundas" e "5 tarefas"
   *  não têm a mesma cara. */
  descricao: string
  destaque: boolean
}

function GraficoColunas({ colunas, rotulosDoEixo }: { colunas: Coluna[]; rotulosDoEixo: (i: number) => string | null }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)
  const semMovimento = useReducedMotion()
  const construido = useConstrucao(largura > 0)
  const passoDaBarra = escalonamentoDasBarras(colunas.length)

  const maximo = Math.max(...colunas.map((c) => c.valor), 0.0001)
  const faixa = colunas.length > 0 ? largura / colunas.length : 0
  // A barra ocupa 60% da faixa: a sobra é ar, não desperdício. O teto de 24px
  // sozinho não bastava — nas 24 horas a faixa tem ~27px, e uma barra de 24
  // deixaria 3px de respiro, virando um paredão. 60% dá 11px de folga ali e
  // continua batendo no teto nos 7 dias da semana.
  const espessura = Math.max(3, Math.min(24, faixa * 0.6))

  return (
    <motion.div
      ref={ref}
      className="relative pt-7"
      // Sem `initial`: o dashboard vive dentro de um <AnimatePresence
      // initial={false}> (o PageTransition), e animação de MONTAGEM não roda
      // ali. Por isso o acender também se pendura na chave que vira depois.
      animate={{ opacity: semMovimento && !construido ? 0 : 1 }}
      transition={{ duration: semMovimento ? FUNDIDO : 0 }}
    >
      {largura > 0 && (
        <svg width={largura} height={ALTURA_TOTAL} role="img" aria-label="Gráfico de colunas">
          <line x1={0} y1={ALTURA_PLOT} x2={largura} y2={ALTURA_PLOT} stroke="var(--border)" strokeWidth="1" />

          {colunas.map((c, i) => {
            const centro = faixa * (i + 0.5)
            const altura = Math.max((c.valor / maximo) * (ALTURA_PLOT - 10), c.valor > 0 ? 3 : 0)
            const rotulo = rotulosDoEixo(i)
            return (
              <g key={c.chave}>
                {/* Alvo do ponteiro maior que a barra: uma coluna de 4px seria
                    impossível de acertar com o dedo. */}
                <rect
                  x={faixa * i} y={0} width={faixa} height={ALTURA_TOTAL}
                  fill="transparent"
                  onPointerEnter={() => setAtivo(i)}
                  onPointerLeave={() => setAtivo(null)}
                >
                  {/* O valor não fica preso na dica que segue o mouse: quem usa
                      leitor de tela — ou só parou o cursor — chega nele por aqui. */}
                  <title>{`${c.rotulo}: ${c.descricao}`}</title>
                </rect>
                {altura > 0 && (
                  <motion.rect
                    x={centro - espessura / 2}
                    width={espessura}
                    // Ponta arredondada, base quadrada na linha de base.
                    rx={Math.min(4, espessura / 2)}
                    fill={c.destaque ? ACENTO : APOIO}
                    fillOpacity={c.destaque ? 1 : OPACIDADE_APOIO}
                    className="pointer-events-none"
                    // Cresce a partir da BASE: `y` desce até a linha do eixo e a
                    // altura vai a zero. Animar só a altura faria a barra encolher
                    // para cima, pendurada, porque em SVG o `y` é o topo do
                    // retângulo — o oposto de uma coluna brotando do chão.
                    initial={false}
                    animate={
                      construido
                        ? { y: ALTURA_PLOT - altura, height: altura }
                        : { y: ALTURA_PLOT, height: 0 }
                    }
                    transition={
                      semMovimento
                        ? { duration: 0 }
                        : { duration: 0.42, ease: [0, 0, 0.2, 1], delay: i * passoDaBarra }
                    }
                  />
                )}
                {rotulo && (
                  <text
                    x={centro} y={ALTURA_PLOT + 15}
                    textAnchor="middle"
                    className="pointer-events-none fill-muted-foreground text-[10px]"
                  >
                    {rotulo}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}

      {ativo !== null && (
        <Dica x={faixa * (ativo + 0.5)} largura={largura}>
          <span className="font-medium">{colunas[ativo].rotulo}</span>
          <span className="text-muted-foreground"> · {colunas[ativo].descricao}</span>
        </Dica>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// A seção
// ---------------------------------------------------------------------------

export function MetricasDashboard() {
  const supabase = createClient()
  const formato = useTimeFormat()
  const semMovimento = useReducedMotion()
  const [aberta, setAberta] = useState(false)
  const [aba, setAba] = useState<Aba>("dias")
  const [sentido, setSentido] = useState<1 | -1>(1)
  const [datas, setDatas] = useState<Date[] | null>(null)

  // Só busca quando abre: fechada por padrão, a seção não deve custar uma
  // consulta a mais no carregamento do dashboard.
  useEffect(() => {
    if (!aberta || datas !== null) return
    const desde = new Date()
    desde.setDate(desde.getDate() - JANELA_DIAS)
    desde.setHours(0, 0, 0, 0)

    supabase
      .from("tasks")
      .select("completed_at")
      .not("completed_at", "is", null)
      .gte("completed_at", desde.toISOString())
      .then(({ data }) => {
        setDatas((data ?? []).map((t) => new Date(t.completed_at as string)))
      })
  }, [aberta, datas, supabase])

  const hoje = useMemo(() => new Date(), [])
  const porDia = useMemo(() => concluidasPorDia(datas ?? [], hoje, DIAS_NA_LINHA), [datas, hoje])
  const porSemana = useMemo(() => constanciaNaSemana(datas ?? [], hoje, SEMANAS), [datas, hoje])
  const porHora = useMemo(() => porHoraDoDia(datas ?? []), [datas])

  const total = totalNoPeriodo(porDia)
  const melhorDia = diaMaisConstante(porSemana)
  const melhorHora = horaMaisProdutiva(porHora)
  const doze = formato === "12h"
  const vazio = datas !== null && datas.length === 0

  const colunasSemana: Coluna[] = porSemana.map((p: PontoSemana) => ({
    chave: p.rotulo,
    rotulo: p.rotulo,
    valor: p.taxa,
    descricao: `${p.diasComAlgo} de ${p.diasContados} ${p.diasContados === 1 ? "vez" : "vezes"}`,
    destaque: melhorDia !== null && p.indice === melhorDia.indice,
  }))

  const colunasHora: Coluna[] = porHora.map((p: PontoHora) => ({
    chave: String(p.hora),
    rotulo: rotuloDeHora(p.hora, doze),
    valor: p.total,
    descricao: `${p.total} ${p.total === 1 ? "tarefa" : "tarefas"}`,
    destaque: melhorHora !== null && p.hora === melhorHora.hora,
  }))

  const manchete = () => {
    if (datas === null) return "Carregando…"
    if (vazio) return "Conclua algumas tarefas e os números aparecem aqui."
    if (aba === "dias") {
      return total === 0
        ? `Nada concluído nos últimos ${DIAS_NA_LINHA} dias.`
        : `${total} ${total === 1 ? "tarefa concluída" : "tarefas concluídas"} nos últimos ${DIAS_NA_LINHA} dias.`
    }
    if (aba === "semana") {
      return melhorDia
        ? `Você aparece mais na ${nomeCompleto(melhorDia.rotulo)} — ${melhorDia.diasComAlgo} das últimas ${melhorDia.diasContados}.`
        : "Ainda não dá para ver um padrão na semana."
    }
    return melhorHora
      ? `Você rende mais por volta das ${rotuloDeHora(melhorHora.hora, doze)}.`
      : "Ainda não dá para ver um horário preferido."
  }

  // A altura do painel. A opacidade sai na frente dela ao fechar, para o
  // conteúdo desaparecer antes de ser cortado pela borda de baixo.
  const painel = {
    oculto: { height: 0, opacity: 0 },
    visivel: {
      height: "auto",
      opacity: 1,
      transition: semMovimento
        ? { duration: 0 }
        : { height: ABRIR, opacity: { ...ABRIR, delay: 0.04 } },
    },
    saindo: {
      height: 0,
      opacity: 0,
      transition: semMovimento
        ? { duration: 0 }
        : { height: FECHAR, opacity: { duration: 0.17, ease: "linear" as const } },
    },
  }

  // A cascata é o movimento da seção, e é a do dashboard: abas, manchete e
  // gráfico sobem um depois do outro. Sem ela o painel cresce e os três blocos
  // aparecem prontos de uma vez, o que faz o abrir parecer um corte.
  //
  // O escalonamento é só na ENTRADA. Na saída as peças recolhem juntas — quem
  // fecha já decidiu, e três despedidas em fila fariam o fechar arrastar.
  const cascata = {
    oculto: {},
    visivel: {
      transition: {
        staggerChildren: semMovimento ? 0 : ESCALONAMENTO,
        delayChildren: semMovimento ? 0 : 0.06,
      },
    },
    saindo: { transition: { staggerChildren: 0 } },
  }
  const peca = {
    oculto: semMovimento ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    visivel: {
      opacity: 1,
      y: 0,
      transition: semMovimento ? { duration: 0 } : MOLA_DASHBOARD,
    },
    // Recolhe para CIMA, no mesmo sentido em que a borda de baixo está subindo.
    // Descendo, o conteúdo andaria contra o próprio painel que o encurta.
    saindo: semMovimento
      ? { opacity: 0 }
      : { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const } },
  }

  // A troca de aba, e a assimetria é a decisão: **o velho é varrido, o novo é
  // construído.**
  //
  // Só a SAÍDA desliza, e para o lado oposto ao do botão clicado — é o caminho
  // que a pílula ativa acaba de percorrer, então o gráfico velho sai por onde a
  // pílula veio. A ENTRADA não tem movimento de bloco nenhum: quem entra é o
  // gráfico se desenhando (a linha traçada, as barras subindo do eixo). Um
  // deslize por cima disso seria movimento duplo — a barra crescendo enquanto
  // ela mesma anda de lado —, e o que se perde é justamente o começo da
  // construção, que é a parte que se quer ver.
  const troca = {
    entra: { opacity: 1 },
    firme: { opacity: 1 },
    sai: (s: 1 | -1) =>
      semMovimento
        ? { opacity: 0 }
        : {
            opacity: 0,
            x: -s * DESLOCAMENTO_ABA,
            transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const },
          },
  }

  const trocarAba = (destino: Aba) => {
    if (destino === aba) return
    setSentido(sentidoDaTroca(ABAS.findIndex((a) => a.id === aba), ABAS.findIndex((a) => a.id === destino)))
    setAba(destino)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm">
      <button
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="flex w-full items-center gap-2 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Seus números
        </span>
        {/* A seta gira na mola do conteúdo, não num tempo próprio: ela é a
            primeira coisa a se mexer no clique, e é ela que anuncia com que
            movimento o resto vem. Numa curva diferente, anunciaria errado. */}
        <motion.span
          animate={{ rotate: aberta ? 180 : 0 }}
          transition={semMovimento ? { duration: 0 } : MOLA_DASHBOARD}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.span>
      </button>

      {/* Três rótulos de variante, e não objetos soltos em `animate`/`exit`: é
          por rótulo que o framer propaga o estado para dentro. Com objetos, o
          painel fechava sozinho e as peças de conteúdo ficavam paradas até
          serem cortadas pela borda. */}
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            variants={painel}
            initial="oculto"
            animate="visivel"
            exit="saindo"
            className="overflow-hidden"
          >
            {/* Sem `initial`/`animate` próprios de propósito: os rótulos descem
                do painel, e é isso que faz as peças saírem junto com ele. */}
            <motion.div variants={cascata} className="space-y-4 px-5 pb-5 pt-1.5">
              <motion.div variants={peca} className="flex flex-wrap gap-1.5">
                {ABAS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => trocarAba(a.id)}
                    className={cn(
                      "relative rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      aba === a.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {aba === a.id && (
                      <motion.span
                        layoutId="nt-metricas-aba"
                        className="absolute inset-0 rounded-full bg-primary/10"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    <span className="relative">{a.rotulo}</span>
                  </button>
                ))}
              </motion.div>

              {/* A manchete e o gráfico trocam JUNTOS, num bloco só: são a
                  resposta e a evidência da mesma pergunta, e vê-los partir em
                  tempos diferentes desmancharia a dupla. O `peca` de fora é a
                  cascata da abertura; o `troca` de dentro é a troca de aba —
                  duas animações em camadas, cada uma no seu momento.

                  Reserva de altura de duas linhas só abaixo do `sm`: no
                  desktop a manchete sempre cabe numa linha, e no celular ela
                  passa de uma para duas conforme a aba. Sem o piso, o cartão
                  encolheria e cresceria de novo a cada troca.

                  A chave é a ABA: é ela que remonta os gráficos, e é a remontagem
                  que faz a construção rodar de novo a cada troca. */}
              <motion.div variants={peca}>
                {/* Sem `initial={false}` aqui, e é de propósito. Ele não tinha
                    mais o que suprimir (a entrada do bloco é um no-op), e em
                    troca punha `blockInitialAnimation` no contexto de presença
                    — herdado por TUDO que está dentro, inclusive os gráficos.
                    Pior: o `PresenceChild` memoiza esse contexto sem o
                    `initial` nas dependências, então o `false` da primeira
                    renderização ficava congelado, e o gráfico (que só monta
                    quando os dados chegam) nascia com a construção proibida. */}
                <AnimatePresence mode="wait" custom={sentido}>
                  <motion.div
                    key={aba}
                    custom={sentido}
                    variants={troca}
                    initial="entra"
                    animate="firme"
                    exit="sai"
                    className="space-y-4"
                  >
                    {/* A manchete só acende. Ela não tem o que construir — é
                        uma frase —, e deslizá-la sozinha faria a resposta
                        chegar por um caminho e a evidência por outro. */}
                    <motion.p
                      initial={semMovimento ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: semMovimento ? 0 : 0.28 }}
                      className="min-h-10 text-sm text-foreground sm:min-h-0"
                    >
                      {manchete()}
                    </motion.p>

                    {!vazio && datas !== null && (
                      <div style={{ minHeight: ALTURA_AREA }}>
                        {aba === "dias" && <GraficoLinha pontos={porDia} />}
                        {aba === "semana" && (
                          <GraficoColunas colunas={colunasSemana} rotulosDoEixo={(i) => colunasSemana[i].rotulo} />
                        )}
                        {aba === "hora" && (
                          // De 24 rótulos cabem uns 6 sem colidir; a dica carrega o resto.
                          <GraficoColunas colunas={colunasHora} rotulosDoEixo={(i) => (i % 4 === 0 ? `${i}h` : null)} />
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function nomeCompleto(abreviado: string): string {
  const mapa: Record<string, string> = {
    Seg: "segunda", Ter: "terça", Qua: "quarta", Qui: "quinta",
    Sex: "sexta", Sáb: "sábado", Dom: "domingo",
  }
  return mapa[abreviado] ?? abreviado
}
