// Repetição de tarefas — ao concluir uma tarefa recorrente, o prazo avança
// para a próxima ocorrência (estilo Todoist) em vez de encerrar a tarefa.
// Regras: daily | weekly | monthly | yearly | every:N (a cada N dias)

/**
 * O tipo de repetição, pela CHAVE — o nome de cada uma vem do dicionário
 * (lib/i18n). Este arquivo decide QUAL repetição é; como ela se diz é assunto
 * do idioma, e um módulo puro de datas não tem por que saber disso.
 */
export type ChaveRepeticaoFixa =
  | "naoRepete"
  | "diariamente"
  | "semanalmente"
  | "mensalmente"
  | "anualmente"

/**
 * As fixas mais a personalizada. A separação não é enfeite: a personalizada é
 * a única que precisa de um NÚMERO para virar texto, e por isso o dicionário a
 * guarda como função. Se `RECURRENCE_OPTIONS` a incluísse, `repeticao[chave]`
 * devolveria "texto ou função" em todo lugar que só quer o texto.
 */
export type ChaveRepeticao = ChaveRepeticaoFixa | "aCadaNDias"

export const RECURRENCE_OPTIONS: readonly { value: string; chave: ChaveRepeticaoFixa }[] = [
  { value: "none", chave: "naoRepete" },
  { value: "daily", chave: "diariamente" },
  { value: "weekly", chave: "semanalmente" },
  { value: "monthly", chave: "mensalmente" },
  { value: "yearly", chave: "anualmente" },
]

/** Uma repetição já interpretada: a chave e, só em "aCadaNDias", o número. */
export interface Repeticao {
  chave: ChaveRepeticao
  /** Quantos dias. Presente apenas quando a chave é "aCadaNDias". */
  dias?: number
}

/**
 * O valor do formulário virando o que vai para o banco.
 *
 * "none" é NULO na coluna, e não a string "none": uma tarefa que não repete não
 * tem regra nenhuma. A conversão morava escrita à mão no diálogo, e passou a
 * valer também para o menu rápido do cartão — duas cópias da mesma regra é
 * como uma delas fica para trás.
 */
export function regraParaBanco(valor: string, aCadaDias = 1): string | null {
  if (valor === "none" || !valor) return null
  if (valor === "every") return `every:${Math.max(1, Math.floor(aCadaDias) || 1)}`
  return valor
}

/**
 * Repetição que o menu rápido do cartão NÃO sabe montar (hoje, "a cada N dias").
 *
 * Ela existe para o menu não mentir: oferecer só as fixas e marcar nenhuma
 * faria uma tarefa que repete a cada 3 dias parecer que não repete. Quem cai
 * aqui é mandado ao diálogo, que é onde o número se escolhe.
 */
export function ehRepeticaoPersonalizada(rule: string | null | undefined): boolean {
  return typeof rule === "string" && /^every:\d+$/.test(rule)
}

/**
 * A regra do banco virando repetição. `null` quando não repete — e "não
 * repete" é ausência de regra, então "none" e regra desconhecida caem juntas
 * aqui em vez de virarem a chave `naoRepete`: quem chama quer saber se HÁ
 * repetição, e um selo dizendo "não repete" em cada cartão seria ruído.
 */
export function repeticaoDaRegra(rule: string | null | undefined): Repeticao | null {
  if (!rule) return null
  const fixa = RECURRENCE_OPTIONS.find((o) => o.value === rule)
  if (fixa && fixa.chave !== "naoRepete") return { chave: fixa.chave }
  const m = rule.match(/^every:(\d+)$/)
  if (m) return { chave: "aCadaNDias", dias: Number(m[1]) }
  return null
}

export function nextOccurrence(from: Date, rule: string): Date | null {
  const d = new Date(from)
  if (rule === "daily") d.setDate(d.getDate() + 1)
  else if (rule === "weekly") d.setDate(d.getDate() + 7)
  else if (rule === "monthly") d.setMonth(d.getMonth() + 1)
  else if (rule === "yearly") d.setFullYear(d.getFullYear() + 1)
  else {
    const m = rule.match(/^every:(\d+)$/)
    if (!m) return null
    d.setDate(d.getDate() + Math.max(1, Number(m[1])))
  }
  return d
}

// Próxima ocorrência garantidamente no futuro (pula ocorrências já passadas)
export function nextFutureOccurrence(base: Date | null, rule: string): Date | null {
  const next = nextOccurrence(base ?? new Date(), rule)
  if (!next) return null

  const agora = Date.now()
  if (next.getTime() > agora) return next

  // Regras em dias saltam DIRETO para a próxima ocorrência futura. Avançar de
  // um em um esbarrava no limite do laço: uma tarefa diária largada por mais
  // de ~2,7 anos devolvia data no PASSADO como se fosse o próximo prazo.
  const dias =
    rule === "daily" ? 1 : rule === "weekly" ? 7 : Number(rule.match(/^every:(\d+)$/)?.[1] ?? 0)

  if (dias > 0) {
    const passo = dias * 86_400_000
    const saltos = Math.ceil((agora - next.getTime()) / passo)
    next.setDate(next.getDate() + saltos * dias)
    // O salto é por ms e a aplicação é por dia de calendário: no horário de
    // verão isso pode faltar uma hora. Uma volta resolve.
    while (next.getTime() <= agora) next.setDate(next.getDate() + dias)
    return next
  }

  // monthly/yearly convergem rápido (cada volta é um mês ou um ano).
  let atual: Date | null = next
  let guard = 0
  while (atual && atual.getTime() <= agora && guard < 5000) {
    atual = nextOccurrence(atual, rule)
    guard++
  }
  return atual
}
