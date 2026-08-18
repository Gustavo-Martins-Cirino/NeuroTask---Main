// As três perguntas que o dashboard responde sobre você, e só elas.
//
// O roadmap foi explícito: o dashboard agrada POR SER minimalista, e encher de
// número é o jeito mais rápido de estragá-lo. Três perguntas, não dez —
// escolhidas por serem as que mudam o que você faz amanhã:
//
//   1. Concluídas por dia   — o ritmo, e se ele está caindo
//   2. Constância na semana — em que dia você costuma sumir
//   3. Melhor hora          — quando você de fato rende
//
// Tudo sai de UMA lista: as datas de conclusão das tarefas (`tasks.completed_at`).
// Uma consulta, três leituras.
//
// Módulo puro. As funções recebem `Date` e leem as partes LOCAIS (getHours,
// getDay): a pessoa conclui uma tarefa às 22h no fuso dela, e agrupar por UTC
// jogaria metade das noites para o dia seguinte. Como os testes constroem as
// datas com o construtor local, eles dão o mesmo resultado em qualquer máquina.

/** Segunda primeiro: a pergunta é sobre a semana de trabalho, e domingo no meio
 *  da fileira quebraria a leitura de "onde eu sumo". */
export const DIAS_DA_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const

/** getDay() dá 0=domingo; aqui 0=segunda. */
function indiceSemana(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** Chave do dia no fuso local — nunca toISOString(), que converte para UTC e
 *  muda o dia de tudo que foi feito depois das 21h no Brasil. */
export function chaveDoDia(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mes}-${dia}`
}

// ---------------------------------------------------------------------------
// 1. Concluídas por dia
// ---------------------------------------------------------------------------

export interface PontoDia {
  chave: string
  /** "17/08" — o eixo só mostra alguns, mas a dica do gráfico mostra todos. */
  rotulo: string
  total: number
}

// Os dias sem nenhuma conclusão entram como zero, e não somem da lista: numa
// linha do tempo, pular o dia vazio encurta o eixo e transforma uma semana
// parada numa subida contínua — a mentira mais fácil de contar com um gráfico.
export function concluidasPorDia(datas: Date[], hoje: Date, dias = 14): PontoDia[] {
  const contagem = new Map<string, number>()
  for (const d of datas) {
    const k = chaveDoDia(d)
    contagem.set(k, (contagem.get(k) ?? 0) + 1)
  }

  const pontos: PontoDia[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i)
    const chave = chaveDoDia(d)
    pontos.push({
      chave,
      rotulo: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      total: contagem.get(chave) ?? 0,
    })
  }
  return pontos
}

// ---------------------------------------------------------------------------
// 2. Constância na semana
// ---------------------------------------------------------------------------

export interface PontoSemana {
  indice: number
  rotulo: string
  /** Em quantas dessas segundas (terças…) houve pelo menos uma conclusão. */
  diasComAlgo: number
  /** Quantas já passaram na janela — pode ser menor que `semanas` perto da borda. */
  diasContados: number
  /** diasComAlgo / diasContados, de 0 a 1. */
  taxa: number
}

// Constância é "com que frequência eu apareço nesse dia", e não "quantas tarefas
// eu faço nele". Somar tarefas responderia outra pergunta e deixaria uma única
// sexta-feira de mutirão parecer um hábito.
export function constanciaNaSemana(datas: Date[], hoje: Date, semanas = 4): PontoSemana[] {
  const comAlgo = new Set(datas.map(chaveDoDia))

  const pontos: PontoSemana[] = DIAS_DA_SEMANA.map((rotulo, indice) => ({
    indice, rotulo, diasComAlgo: 0, diasContados: 0, taxa: 0,
  }))

  for (let i = 0; i < semanas * 7; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i)
    const p = pontos[indiceSemana(d)]
    p.diasContados++
    if (comAlgo.has(chaveDoDia(d))) p.diasComAlgo++
  }

  for (const p of pontos) {
    p.taxa = p.diasContados > 0 ? p.diasComAlgo / p.diasContados : 0
  }
  return pontos
}

// ---------------------------------------------------------------------------
// 3. Melhor hora
// ---------------------------------------------------------------------------

export interface PontoHora {
  hora: number
  total: number
}

/** Sempre as 24 horas, inclusive as vazias — o vale das 3h da manhã é parte da
 *  resposta, e uma barra ausente lê como "sem dado", não como "zero". */
export function porHoraDoDia(datas: Date[]): PontoHora[] {
  const pontos: PontoHora[] = Array.from({ length: 24 }, (_, hora) => ({ hora, total: 0 }))
  for (const d of datas) pontos[d.getHours()].total++
  return pontos
}

// ---------------------------------------------------------------------------
// As manchetes — o número que responde a pergunta antes do gráfico
// ---------------------------------------------------------------------------

/** O dia mais constante. `null` quando não há nada — e aí a tela diz isso em
 *  vez de coroar a segunda-feira com 0%. */
export function diaMaisConstante(pontos: PontoSemana[]): PontoSemana | null {
  const comAlgo = pontos.filter((p) => p.diasComAlgo > 0)
  if (comAlgo.length === 0) return null
  // Empate fica com o primeiro da semana, que é a ordem em que já aparecem.
  return comAlgo.reduce((melhor, p) => (p.taxa > melhor.taxa ? p : melhor))
}

export function horaMaisProdutiva(pontos: PontoHora[]): PontoHora | null {
  const comAlgo = pontos.filter((p) => p.total > 0)
  if (comAlgo.length === 0) return null
  return comAlgo.reduce((melhor, p) => (p.total > melhor.total ? p : melhor))
}

/** "14h" ou "2 PM", conforme a região escolhida. */
export function rotuloDeHora(hora: number, doze: boolean): string {
  if (!doze) return `${hora}h`
  const periodo = hora < 12 ? "AM" : "PM"
  return `${hora % 12 === 0 ? 12 : hora % 12} ${periodo}`
}

export function totalNoPeriodo(pontos: PontoDia[]): number {
  return pontos.reduce((soma, p) => soma + p.total, 0)
}
