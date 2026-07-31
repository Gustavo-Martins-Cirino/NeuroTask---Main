// Planejamento retroativo (Fase 2) — o NÚCLEO determinístico do copiloto.
//
// A IA extrai o compromisso-âncora da conversa; a cadeia do dia (dormir →
// acordar → preparo → refeição → deslocamento → âncora) é calculada AQUI, por
// regra, nunca pelo modelo. É a lógica mais delicada do app: um erro vira um
// alarme às 4h da manhã na vida de alguém.
//
// Módulo puro de propósito: sem Supabase, sem rede, sem fuso. A rota de IA
// busca a rotina, chama esta função e formata o resultado.

export interface AtividadeRotina {
  name: string
  category: string
  duration_minutes: number
}

export interface BlocoPlanejado {
  title: string
  start: Date
  end: Date
  color: string
}

export interface PlanoRetroativo {
  /** Os 5 blocos, em ordem cronológica. */
  plan: BlocoPlanejado[]
  wake: Date
  sleepStart: Date
  /** Avisos para a pessoa (ex.: escolhi uma atividade entre várias). */
  notes: string[]
}

export interface EntradaPlano {
  anchorTitle: string
  anchorStart: Date
  anchorEnd: Date
  atividades: AtividadeRotina[]
  sleepHours: number
}

const COR = {
  sono: "#6366f1",
  preparo: "#8b5cf6",
  refeicao: "#f97316",
  deslocamento: "#06b6d4",
  ancora: "#3b82f6",
}

// Padrões de quem ainda não cadastrou rotina — o planejador nunca fica sem
// resposta só porque a biblioteca de atividades está vazia.
const PADRAO = {
  preparo: { name: "Se arrumar", dur: 45 },
  refeicao: { name: "Café da manhã", dur: 20 },
  deslocamento: { name: "Deslocamento", dur: 30 },
}

export function normTitle(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function planejarDeTrasPraFrente(entrada: EntradaPlano): PlanoRetroativo {
  const { anchorTitle, anchorStart, anchorEnd, atividades, sleepHours } = entrada
  const notes: string[] = []

  // Escolhe a atividade de cada categoria: melhor match com o nome do
  // compromisso (ex.: "faculdade" → "Deslocamento → Faculdade"), senão a
  // única/primeira. Tokens curtos (< 4 letras) não valem como match — "de",
  // "da", "e" casariam com qualquer coisa.
  const escolher = (cat: keyof typeof PADRAO) => {
    const cands = atividades.filter((a) => a.category === cat)
    if (cands.length === 0) return PADRAO[cat]
    if (cands.length === 1) return { name: cands[0].name, dur: cands[0].duration_minutes }
    const tokens = normTitle(anchorTitle).split(" ").filter((t) => t.length >= 4)
    const match = cands.find((c) => tokens.some((t) => normTitle(c.name).includes(t)))
    if (match) return { name: match.name, dur: match.duration_minutes }
    notes.push(
      `Usei "${cands[0].name}"; você também tem: ${cands.slice(1).map((c) => c.name).join(", ")} — me avise se preferir outra.`
    )
    return { name: cands[0].name, dur: cands[0].duration_minutes }
  }

  const prep = escolher("preparo")
  const meal = escolher("refeicao")
  const move = escolher("deslocamento")

  // Cadeia de trás pra frente
  const min = 60_000
  const moveStart = new Date(anchorStart.getTime() - move.dur * min)
  const mealStart = new Date(moveStart.getTime() - meal.dur * min)
  const wake = new Date(mealStart.getTime() - prep.dur * min)
  const sleepStart = new Date(wake.getTime() - sleepHours * 3_600_000)

  const plan: BlocoPlanejado[] = [
    { title: "Dormir", start: sleepStart, end: wake, color: COR.sono },
    { title: prep.name, start: wake, end: mealStart, color: COR.preparo },
    { title: meal.name, start: mealStart, end: moveStart, color: COR.refeicao },
    { title: move.name, start: moveStart, end: anchorStart, color: COR.deslocamento },
    { title: anchorTitle, start: anchorStart, end: anchorEnd, color: COR.ancora },
  ]

  return { plan, wake, sleepStart, notes }
}
