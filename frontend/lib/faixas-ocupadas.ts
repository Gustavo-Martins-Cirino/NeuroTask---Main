// Faixas ocupadas de uma agenda — puro, sem Supabase e sem fuso do servidor.
//
// Estava preso dentro de `lib/friends.ts`, que importa o cliente do navegador e
// por isso não servia numa rota de servidor. A agenda pública precisa da MESMA
// conta, então ela saiu para cá: uma regra só, dois consumidores.
//
// A regra de privacidade que rege tudo isto: daqui só saem HORÁRIOS. Título,
// descrição e id do bloco não entram nem no tipo de entrada — o que não é lido
// não vaza por engano.

export interface BlocoBruto {
  start_time: string
  end_time: string
  is_recurring: boolean
  recurrence_rule: string | null
}

export interface FaixaOcupada {
  start: Date
  end: Date
}

const DIA_MS = 24 * 3_600_000

/**
 * As faixas ocupadas de UM dia, no fuso local de quem chama.
 *
 * Blocos recorrentes são expandidos para a ocorrência daquele dia; os que
 * atravessam a meia-noite são recortados na borda. Sobreposições viram uma
 * faixa só — duas reuniões coladas são um período ocupado, não dois.
 */
export function faixasDoDia(blocos: BlocoBruto[], inicioDoDia: Date): FaixaOcupada[] {
  const fimDoDia = new Date(inicioDoDia.getTime() + DIA_MS)
  const faixas: FaixaOcupada[] = []

  for (const b of blocos) {
    const s = new Date(b.start_time)
    const e = new Date(b.end_time)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) continue

    if (!b.is_recurring) {
      if (e > inicioDoDia && s < fimDoDia) {
        faixas.push({
          start: s < inicioDoDia ? new Date(inicioDoDia) : s,
          end: e > fimDoDia ? new Date(fimDoDia) : e,
        })
      }
      continue
    }

    // Recorrentes simples (sem cruzar a meia-noite): a ocorrência do dia.
    if (s > fimDoDia) continue // a série ainda nem começou
    const dow = inicioDoDia.getDay() // 0 = domingo
    const valeHoje =
      b.recurrence_rule === "daily" ||
      (b.recurrence_rule === "weekdays" && dow >= 1 && dow <= 5) ||
      (b.recurrence_rule === "weekly" && dow === s.getDay())
    if (!valeHoje) continue

    const ocorreInicio = new Date(inicioDoDia)
    ocorreInicio.setHours(s.getHours(), s.getMinutes(), 0, 0)
    const duracao = e.getTime() - s.getTime()
    if (duracao <= 0 || duracao > DIA_MS) continue
    const ocorreFim = new Date(Math.min(ocorreInicio.getTime() + duracao, fimDoDia.getTime()))
    faixas.push({ start: ocorreInicio, end: ocorreFim })
  }

  return fundir(faixas)
}

/** Ordena por início e junta o que se toca ou se sobrepõe. */
export function fundir(faixas: FaixaOcupada[]): FaixaOcupada[] {
  const ordenadas = [...faixas].sort((a, b) => a.start.getTime() - b.start.getTime())
  const saida: FaixaOcupada[] = []
  for (const f of ordenadas) {
    const ultima = saida[saida.length - 1]
    if (ultima && f.start <= ultima.end) {
      if (f.end > ultima.end) ultima.end = new Date(f.end)
    } else {
      saida.push({ start: new Date(f.start), end: new Date(f.end) })
    }
  }
  return saida
}

export interface DiaDaAgenda {
  /** Meia-noite local do dia. */
  dia: Date
  faixas: FaixaOcupada[]
}

/**
 * `dias` dias a partir de `inicio` (inclusive), cada um com suas faixas.
 *
 * Dias sem nada vêm com lista vazia de propósito: "livre o dia todo" é uma
 * resposta, e some-la do resultado obrigaria quem exibe a remontar o calendário.
 */
export function agendaDosProximosDias(blocos: BlocoBruto[], inicio: Date, dias: number): DiaDaAgenda[] {
  const total = Math.max(0, Math.min(60, Math.floor(dias)))
  const base = new Date(inicio)
  base.setHours(0, 0, 0, 0)

  const saida: DiaDaAgenda[] = []
  for (let i = 0; i < total; i++) {
    const dia = new Date(base)
    dia.setDate(dia.getDate() + i)
    saida.push({ dia, faixas: faixasDoDia(blocos, dia) })
  }
  return saida
}
