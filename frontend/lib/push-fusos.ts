// Fuso horário do push: a conta que decide QUANDO tocar a notificação.
//
// `reminders` guarda hora de parede sem fuso ("09:00", "2026-08-25") porque é
// assim que a pessoa pensa no lembrete: nove da manhã é nove da manhã, esteja
// ela onde estiver. O preço é que o servidor, que roda em UTC, precisa saber de
// que parede está falando — e antes ele assumia que era sempre a do Brasil.
// Quem estivesse fora recebia o push na hora errada.
//
// Quem sabe o fuso é o APARELHO, e ele conta isso na hora de se inscrever
// (`tz_offset_min` em `push_subscriptions`). O dispatcher passou a percorrer um
// grupo por fuso em vez de um horário só.

/** Brasil, UTC−3. Vale para inscrição antiga, feita antes da coluna existir. */
export const FUSO_PADRAO_MIN = 180

export interface InscricaoFuso {
  user_id: string
  /** Minutos ATRÁS do UTC, como `Date.getTimezoneOffset()`: Brasil = 180. */
  tz_offset_min: number | null
}

/**
 * Agrupa quem tem push por fuso: offset → usuários.
 *
 * Um usuário com aparelhos em fusos diferentes (o notebook viajou, o celular
 * ficou) aparece nos dois grupos. É de propósito: o lembrete toca no primeiro
 * dos dois em que a parede chegar, e a trava `pushed` impede o segundo. Sem
 * isso, quem viaja perderia o lembrete ou receberia dois.
 */
export function agruparPorFuso(
  inscricoes: readonly InscricaoFuso[],
  padrao: number = FUSO_PADRAO_MIN
): Map<number, string[]> {
  const porFuso = new Map<number, Set<string>>()
  for (const i of inscricoes) {
    const fuso = Number.isFinite(i.tz_offset_min) ? (i.tz_offset_min as number) : padrao
    const atual = porFuso.get(fuso) ?? new Set<string>()
    atual.add(i.user_id)
    porFuso.set(fuso, atual)
  }
  return new Map([...porFuso].map(([fuso, usuarios]) => [fuso, [...usuarios]]))
}

export interface ParedeLocal {
  /** "AAAA-MM-DD" no fuso pedido — a chave de `reminders.remind_date`. */
  dataChave: string
  /** "HH:mm" agora, no fuso pedido. */
  hm: string
  /** "HH:mm" de N minutos atrás, PRESO ao começo do dia (ver abaixo). */
  hmAtras: (minutos: number) => string
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * A hora de parede num fuso, a partir de um instante absoluto.
 *
 * `hmAtras` não atravessa a meia-noite, e isso conserta um buraco silencioso: a
 * consulta pede `remind_time` entre `hmAtras(10)` e `hm` DENTRO da data de hoje.
 * À 00:05, "dez minutos atrás" seria 23:55 e o intervalo [23:55, 00:05] não
 * contém nada — todo lembrete marcado nos dez primeiros minutos do dia nunca
 * chegava. Preso em 00:00, o intervalo vira [00:00, 00:05] e funciona. O que
 * ficou do dia anterior é de outra `remind_date`, então não se perde nada.
 */
export function paredeEm(agoraMs: number, offsetMin: number): ParedeLocal {
  const local = new Date(agoraMs - offsetMin * 60_000)
  const dataChave =
    `${local.getUTCFullYear()}-${doisDigitos(local.getUTCMonth() + 1)}-${doisDigitos(local.getUTCDate())}`
  const minutosDoDia = local.getUTCHours() * 60 + local.getUTCMinutes()
  const hm = `${doisDigitos(local.getUTCHours())}:${doisDigitos(local.getUTCMinutes())}`
  const hmAtras = (minutos: number) => {
    const alvo = Math.max(0, minutosDoDia - Math.max(0, minutos))
    return `${doisDigitos(Math.floor(alvo / 60))}:${doisDigitos(alvo % 60)}`
  }
  return { dataChave, hm, hmAtras }
}
