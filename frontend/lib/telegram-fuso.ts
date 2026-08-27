// Fuso horário do bot do Telegram — a outra ponta da dívida que o push já pagou
// (ver lib/push-fusos.ts).
//
// O problema aqui é diferente e mais difícil: **o Telegram não conta o fuso de
// quem manda a mensagem**. Um update traz chat_id, texto e nada mais. Então o
// dado tem de vir do APP, e o app só fala com o Telegram em um momento — o
// pareamento. É lá que o fuso do navegador entra, viajando dentro do código de
// seis dígitos e ficando gravado no vínculo.
//
// Quem parear pelo aparelho errado (ou viajar depois) fica com o fuso velho, e
// por isso existe o segundo palpite: a inscrição de push mais recente, que é
// reescrita toda vez que alguém liga o push num aparelho novo. O último recurso
// continua sendo o padrão do servidor.
//
// Sem isso, o `/hoje` respondia sempre pela parede do Brasil: quem estivesse em
// Lisboa às 23h já veria a agenda de amanhã, e às 00:30 ainda veria a de ontem.

/** Fusos reais vão de UTC−12 a UTC+14; fora disso é dado corrompido. */
export const LIMITE_DO_FUSO_MIN = 840

export function fusoValido(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= LIMITE_DO_FUSO_MIN
}

/**
 * O primeiro palpite válido, em ordem de confiança. Zero é um fuso legítimo
 * (Londres no inverno), então a checagem não pode ser por veracidade — um `??`
 * distraído aqui mandaria todo mundo em UTC para o padrão do servidor.
 */
export function fusoDoUsuario(candidatos: readonly unknown[], padrao: number): number {
  for (const c of candidatos) if (fusoValido(c)) return c
  return fusoValido(padrao) ? padrao : 0
}

/** O dia de hoje naquele fuso, em instantes absolutos (o que o banco guarda). */
export function janelaDoDia(agoraMs: number, offsetMin: number): { inicio: string; fim: string } {
  const local = new Date(agoraMs - offsetMin * 60_000)
  const inicioUtc =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + offsetMin * 60_000
  return {
    inicio: new Date(inicioUtc).toISOString(),
    fim: new Date(inicioUtc + 24 * 3_600_000).toISOString(),
  }
}

/** "HH:mm" de um instante absoluto, na parede de quem lê. */
export function horaLocal(iso: string, offsetMin: number): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return "--:--"
  const d = new Date(t - offsetMin * 60_000)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}
