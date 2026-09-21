// O recibo: o que a Neuro REALMENTE fez, montado pelo servidor.
//
// **O bug que deu origem a isto** (relatório de 19/09/2026): "pedi 6 blocos e
// ela confirmou os 6, mas só 1 existe". E o contrário: "respondeu 'esse horário
// conflita, quer ajustar?' e o bloco já estava salvo".
//
// A causa é a mesma nos dois: quem escreve a confirmação é o modelo, de cabeça,
// e ele não confere o que as ferramentas devolveram. Quando o laço de tool calls
// estoura o limite de voltas, então, ele resume o que ACHA que fez.
//
// Este módulo não pede nada ao modelo. Ele recebe o que foi executado de
// verdade e escreve a lista — e é essa lista que vai para a tela, embaixo da
// resposta. Se as duas discordarem, quem usa vê a discordância em vez de
// descobrir dias depois, abrindo o calendário.

import { diaDaSemanaDaChave, diaMesDaChave } from "@/lib/ia-agora"

/** Uma ferramenta executada, com o que ela recebeu e o que devolveu. */
export interface AcaoExecutada {
  nome: string
  args: Record<string, unknown>
  resultado: unknown
}

/**
 * As ferramentas que MUDAM alguma coisa. Só elas entram no recibo: listar não
 * precisa de comprovante, e um recibo em toda resposta viraria ruído.
 */
export const FERRAMENTAS_QUE_ESCREVEM = new Set([
  "create_task",
  "update_task",
  "delete_task",
  "create_time_block",
  "update_time_block",
  "delete_time_block",
  "create_note",
  "update_note",
  "delete_note",
  "plan_day_backwards",
])

export interface TextosDoRecibo {
  /** Cabeçalho da lista. */
  titulo: string
  /** Quando o laço acabou antes de a conversa terminar. */
  naoTerminei: string
  /** Rótulo de cada tipo de ação, na voz do app. */
  criou: string
  atualizou: string
  excluiu: string
  /** Quando a ferramenta falhou. */
  falhou: string
  /** Regra de recorrência → como ela se diz. Vem de `ia.agenda.repeticao`. */
  repeticao: Record<string, string>
}

const VERBO: Record<string, keyof Pick<TextosDoRecibo, "criou" | "atualizou" | "excluiu">> = {
  create_task: "criou",
  create_time_block: "criou",
  create_note: "criou",
  plan_day_backwards: "criou",
  update_task: "atualizou",
  update_time_block: "atualizou",
  update_note: "atualizou",
  delete_task: "excluiu",
  delete_time_block: "excluiu",
  delete_note: "excluiu",
}

function dois(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * "segunda-feira, 21/09, 09:00" a partir de um ISO e do fuso de quem usa.
 *
 * O dia da semana entra junto porque foi assim que o bug 1 se escondeu: a
 * confirmação dizia "na segunda" sem a data, e a data errada passava batida.
 */
export function quando(iso: unknown, tzMin: number, nomesDosDias: readonly string[]): string | null {
  if (typeof iso !== "string" || !iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  const local = new Date(t - (Number.isFinite(tzMin) ? tzMin : 0) * 60_000)
  const chave = `${local.getUTCFullYear()}-${dois(local.getUTCMonth() + 1)}-${dois(local.getUTCDate())}`
  const dia = nomesDosDias[diaDaSemanaDaChave(chave)] ?? ""
  return `${dia}, ${diaMesDaChave(chave)}, ${dois(local.getUTCHours())}:${dois(local.getUTCMinutes())}`
}

function titulo(args: Record<string, unknown>): string {
  const t = args.title
  return typeof t === "string" && t.trim() ? `"${t.trim()}"` : ""
}

/**
 * O recibo, ou `null` quando nada foi mudado — resposta que só leu a agenda não
 * ganha comprovante.
 */
export function recibo(
  acoes: AcaoExecutada[],
  tzMin: number,
  textos: TextosDoRecibo,
  nomesDosDias: readonly string[],
  lacoEstourou = false
): string | null {
  const escritas = acoes.filter((a) => FERRAMENTAS_QUE_ESCREVEM.has(a.nome))
  if (escritas.length === 0) return lacoEstourou ? textos.naoTerminei : null

  const linhas = escritas.map((a) => {
    const r = (a.resultado ?? {}) as {
      ok?: boolean
      error?: string
      warning?: string
      note?: string
      created?: number
      recurrence_rule?: string | null
    }
    if (r.ok === false) {
      return `⚠️ ${textos.falhou} ${titulo(a.args)} ${r.error ?? ""}`.replace(/\s+/g, " ").trim()
    }
    // `note` quer dizer "não fiz, e este é o motivo" — é o que o anti-duplicata
    // devolve, com `ok: true` e nada criado. Lê-lo como sucesso produzia o pior
    // tipo de linha: um "✅ criei" embaixo de uma frase dizendo que não criou
    // (relatório de 21/09, caso R13).
    if (typeof r.note === "string" && r.note.trim()) {
      return `ℹ️ ${r.note.trim()}`
    }
    const verbo = textos[VERBO[a.nome] ?? "criou"]
    const momento = quando(a.args.start_time ?? a.args.due_date, tzMin, nomesDosDias)
    // `plan_day_backwards` cria vários de uma vez e devolve a contagem.
    const quantos = typeof r.created === "number" ? ` (${r.created})` : ""
    // Bloco que repete precisa dizer que repete: senão o comprovante mostra uma
    // ocorrência e quem lê acha que criou um bloco avulso.
    const repete = r.recurrence_rule ? ` (${textos.repeticao[r.recurrence_rule] ?? r.recurrence_rule})` : ""
    const partes = [`✅ ${verbo}${quantos}`, titulo(a.args), momento ? `— ${momento}` : "", repete.trim()]
    const linha = partes.filter(Boolean).join(" ")
    // O aviso já costuma vir com o ⚠️ dele; pôr outro dá "⚠️ ⚠️" na tela.
    if (!r.warning) return linha
    const aviso = r.warning.replace(/^\s*⚠️\s*/, "")
    return `${linha}\n   ⚠️ ${aviso}`
  })

  return [textos.titulo, ...linhas, ...(lacoEstourou ? [textos.naoTerminei] : [])].join("\n")
}
