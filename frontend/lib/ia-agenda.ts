// A agenda como a Neuro deve lê-la: na parede de quem usa, com os recorrentes
// expandidos.
//
// **Os três bugs que deram origem a isto** (relatório de 19/09/2026):
//  · "informa os horários em UTC, 3h a mais — o bloco das 07:00 ela diz 10:00";
//  · "ignora os blocos recorrentes" (Jiu Jitsu, Trabalho e Faculdade sumiram);
//  · "sobre o dia 26/09, que tem 8 blocos, respondeu 'não encontrei nenhum'".
//
// Os três são o mesmo descuido: a leitura entregava LINHA DE BANCO ao modelo —
// ISO em UTC, uma linha por série e sem recorte de dia — e deixava para ele
// interpretar. Bloco recorrente no banco é UMA linha com uma regra; quem não
// expande, não vê a ocorrência de quarta.
//
// Nada de `getHours`/`getDay` aqui: esta rota roda no servidor, onde "local" é
// UTC. Toda conta passa pelo `tzMin` de quem usa, como em `lib/ia-agora.ts`.

const DIA_MS = 24 * 3_600_000

export interface BlocoDaAgenda {
  id?: string
  title: string
  start_time: string
  end_time: string
  is_recurring?: boolean | null
  recurrence_rule?: string | null
}

export interface Ocorrencia {
  /** O id da SÉRIE. Ocorrências de um recorrente compartilham o mesmo — editar
   *  ou excluir mexe na série inteira, que é o que o calendário faz também. */
  id: string | null
  titulo: string
  /** Epoch em ms — o instante, sem fuso embutido. */
  inicio: number
  fim: number
  regra: string | null
}

interface Parede {
  ano: number
  mes: number
  dia: number
  hora: number
  minuto: number
  diaDaSemana: number
}

function parede(ms: number, tzMin: number): Parede {
  const d = new Date(ms - tzMin * 60_000)
  return {
    ano: d.getUTCFullYear(),
    mes: d.getUTCMonth() + 1,
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
    diaDaSemana: d.getUTCDay(),
  }
}

/** O instante em que começa o dia da parede que contém `ms`. */
export function inicioDoDia(ms: number, tzMin: number): number {
  const p = parede(ms, tzMin)
  return Date.UTC(p.ano, p.mes - 1, p.dia) + tzMin * 60_000
}

function dois(n: number): string {
  return String(n).padStart(2, "0")
}

/** A regra vale neste dia da semana? `null` e desconhecida nunca valem. */
export function regraValeNoDia(regra: string | null | undefined, diaDaSemana: number, diaDaSemanaDaSerie: number): boolean {
  if (regra === "daily") return true
  if (regra === "weekdays") return diaDaSemana >= 1 && diaDaSemana <= 5
  if (regra === "weekly") return diaDaSemana === diaDaSemanaDaSerie
  return false
}

/**
 * Todas as ocorrências que caem na janela [de, ate), recorrentes expandidas.
 *
 * A janela é varrida dia a dia na parede de quem usa — e não em UTC — porque é
 * o dia dele que define o que "quarta-feira" quer dizer.
 */
export function ocorrenciasNaJanela(
  blocos: BlocoDaAgenda[],
  deMs: number,
  ateMs: number,
  tzMin: number
): Ocorrencia[] {
  const saida: Ocorrencia[] = []
  if (!Number.isFinite(deMs) || !Number.isFinite(ateMs) || ateMs <= deMs) return saida

  for (const b of blocos) {
    const s = Date.parse(b.start_time)
    const e = Date.parse(b.end_time)
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue
    const duracao = e - s

    if (!b.is_recurring || !b.recurrence_rule) {
      // Avulso: entra se ENCOSTA na janela, e não só se começa dentro dela —
      // um bloco que atravessa a meia-noite pertence aos dois dias.
      if (e > deMs && s < ateMs) saida.push({ id: b.id ?? null, titulo: b.title, inicio: s, fim: e, regra: null })
      continue
    }
    if (duracao <= 0 || duracao > DIA_MS) continue

    const serie = parede(s, tzMin)
    // Dia a dia, do começo do dia da janela até o fim dela.
    for (let dia = inicioDoDia(deMs, tzMin); dia < ateMs; dia += DIA_MS) {
      const p = parede(dia, tzMin)
      if (!regraValeNoDia(b.recurrence_rule, p.diaDaSemana, serie.diaDaSemana)) continue
      const comeco = Date.UTC(p.ano, p.mes - 1, p.dia, serie.hora, serie.minuto) + tzMin * 60_000
      // A série não vale antes de existir.
      if (comeco < inicioDoDia(s, tzMin)) continue
      const fim = comeco + duracao
      if (fim > deMs && comeco < ateMs) {
        saida.push({ id: b.id ?? null, titulo: b.title, inicio: comeco, fim, regra: b.recurrence_rule })
      }
    }
  }

  return saida.sort((a, b) => a.inicio - b.inicio)
}

export interface TextosDaAgenda {
  /** "toda semana", "todo dia", "dias úteis" — some quando não é recorrente. */
  repeticao: Record<string, string>
  vazio: string
}

/**
 * As linhas que o modelo lê.
 *
 * Sempre com dia da semana E dd/mm: é o mesmo remédio do bug do dia da semana —
 * data sozinha, ou hora sozinha, é o que deixa o erro passar despercebido.
 */
export function linhasDaAgenda(
  ocorrencias: Ocorrencia[],
  tzMin: number,
  nomesDosDias: readonly string[],
  textos: TextosDaAgenda
): string {
  if (ocorrencias.length === 0) return textos.vazio
  return ocorrencias
    .map((o) => {
      const i = parede(o.inicio, tzMin)
      const f = parede(o.fim, tzMin)
      const dia = nomesDosDias[i.diaDaSemana] ?? ""
      const repete = o.regra ? ` (${textos.repeticao[o.regra] ?? o.regra})` : ""
      // O id vai junto porque é a única forma de EDITAR ou EXCLUIR depois: ele
      // não aparece em lugar nenhum da tela, então se não vier aqui o modelo
      // passa a pedi-lo a quem não tem como saber. Foi o que travou a edição
      // no reteste de 21/09 — e o mesmo buraco quebrava o excluir, calado.
      const id = o.id ? ` [id: ${o.id}]` : ""
      return `${dia} ${dois(i.dia)}/${dois(i.mes)} ${dois(i.hora)}:${dois(i.minuto)}–${dois(f.hora)}:${dois(f.minuto)} ${o.titulo}${repete}${id}`
    })
    .join("\n")
}
