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

const ALTURA_PLOT = 132
const BANDA_EIXO = 22
// O container inclui a banda do eixo de propósito: dimensionar só o plot deixa
// os rótulos de fora e o cartão ganha uma barrinha de rolagem interna.
const ALTURA_TOTAL = ALTURA_PLOT + BANDA_EIXO
/** Folga nas pontas da linha: r 4.5 da bolinha + 2px de anel, arredondado. */
const MARGEM_LINHA = 7

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

  const maximo = Math.max(1, ...pontos.map((p) => p.total))
  // A margem existe pela PONTA: o último ponto cai no fim do eixo, e sem ela a
  // bolinha (r 4.5 + anel de 2px) sairia metade para fora do SVG. O traço nas
  // duas extremidades também deixava de ser cortado ao meio.
  const passo = pontos.length > 1 ? (largura - MARGEM_LINHA * 2) / (pontos.length - 1) : 0
  const xDe = (i: number) => MARGEM_LINHA + i * passo
  const yDe = (v: number) => ALTURA_PLOT - (v / maximo) * (ALTURA_PLOT - 12) - 6

  const linha = pontos.map((p, i) => `${xDe(i)},${yDe(p.total)}`).join(" ")
  const area = `${xDe(0)},${ALTURA_PLOT} ${linha} ${xDe(pontos.length - 1)},${ALTURA_PLOT}`

  const ultimo = pontos.length - 1
  const destacado = ativo ?? ultimo

  return (
    <div ref={ref} className="relative pt-7">
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

          <polygon points={area} fill="url(#nt-area-dias)" />
          <polyline
            points={linha}
            fill="none"
            stroke={ACENTO}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {ativo !== null && (
            <line
              x1={xDe(ativo)} y1={0} x2={xDe(ativo)} y2={ALTURA_PLOT}
              stroke="var(--border)" strokeWidth="1"
            />
          )}

          {/* Ponta com anel na cor da superfície, para não se perder sobre a linha. */}
          <circle
            cx={xDe(destacado)} cy={yDe(pontos[destacado].total)} r="4.5"
            fill={ACENTO} stroke="var(--card)" strokeWidth="2"
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
    </div>
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

  const maximo = Math.max(...colunas.map((c) => c.valor), 0.0001)
  const faixa = colunas.length > 0 ? largura / colunas.length : 0
  // A barra ocupa 60% da faixa: a sobra é ar, não desperdício. O teto de 24px
  // sozinho não bastava — nas 24 horas a faixa tem ~27px, e uma barra de 24
  // deixaria 3px de respiro, virando um paredão. 60% dá 11px de folga ali e
  // continua batendo no teto nos 7 dias da semana.
  const espessura = Math.max(3, Math.min(24, faixa * 0.6))

  return (
    <div ref={ref} className="relative pt-7">
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
                  <rect
                    x={centro - espessura / 2}
                    y={ALTURA_PLOT - altura}
                    width={espessura}
                    height={altura}
                    // Ponta arredondada, base quadrada na linha de base.
                    rx={Math.min(4, espessura / 2)}
                    fill={c.destaque ? ACENTO : APOIO}
                    fillOpacity={c.destaque ? 1 : OPACIDADE_APOIO}
                    className="pointer-events-none"
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
    </div>
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

  // A altura abrindo já existia; o que faltava era o CONTEÚDO entrar. Sem isto
  // o painel cresce e os três blocos aparecem prontos de uma vez, o que faz o
  // movimento parecer um corte. Em cascata, o olho acompanha: abas, manchete,
  // gráfico.
  //
  // Só na ENTRADA. Escalonar a saída também faria fechar parecer lento — quem
  // fecha já decidiu, e quer o espaço de volta.
  const cascata = {
    oculto: {},
    visivel: { transition: { staggerChildren: semMovimento ? 0 : 0.055, delayChildren: semMovimento ? 0 : 0.04 } },
  }
  const peca = {
    oculto: semMovimento ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visivel: {
      opacity: 1,
      y: 0,
      transition: semMovimento ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 32 },
    },
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
        <motion.span
          animate={{ rotate: aberta ? 180 : 0, y: aberta ? 1 : 0 }}
          transition={semMovimento ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={semMovimento ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34 }}
            className="overflow-hidden"
          >
            <motion.div
              variants={cascata}
              initial="oculto"
              animate="visivel"
              className="space-y-4 px-5 pb-5"
            >
              <motion.div variants={peca} className="flex flex-wrap gap-1.5">
                {ABAS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAba(a.id)}
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

              <motion.p variants={peca} className="text-sm text-foreground">{manchete()}</motion.p>

              {!vazio && datas !== null && (
                <motion.div variants={peca}>
                  {aba === "dias" && <GraficoLinha pontos={porDia} />}
                  {aba === "semana" && (
                    <GraficoColunas colunas={colunasSemana} rotulosDoEixo={(i) => colunasSemana[i].rotulo} />
                  )}
                  {aba === "hora" && (
                    // De 24 rótulos cabem uns 6 sem colidir; a dica carrega o resto.
                    <GraficoColunas colunas={colunasHora} rotulosDoEixo={(i) => (i % 4 === 0 ? `${i}h` : null)} />
                  )}

                </motion.div>
              )}
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
