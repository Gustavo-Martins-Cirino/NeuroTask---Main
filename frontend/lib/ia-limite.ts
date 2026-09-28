// Quanto esperar quando o provedor recusa por cota — lido dele, não chutado.
//
// **O que deu origem a isto** (relatório da rodada Y): a frase do reserva dizia
// "pode repetir em cerca de um minuto", e o Gustavo mediu QUATRO recusas em sete
// minutos — em t=0, +70s, +3min e +4min. A promessa do minuto era uma instrução
// minha cravada no prompt, sem nenhum dado por trás.
//
// O 429 do Groq diz as duas coisas que faltavam: QUAL teto estourou (por minuto
// ou por dia) e em quanto tempo tentar de novo. A mensagem passa a sair daí.
//
// Trocar uma imprecisão grave por uma pequena foi um bom negócio; trocá-la pelo
// número que o provedor já mandava é melhor.

export interface EsperaDoLimite {
  /** Segundos até liberar, quando o provedor informa. `null` quando ele cala. */
  segundos: number | null
  /** O teto é DIÁRIO. Esperar um minuto não adianta, e dizer que adianta é pior. */
  porDia: boolean
}

/**
 * Lê o corpo do 429.
 *
 * O Groq escreve a espera em formatos que crescem com ela — "7.66s",
 * "2m59.56s", "1h23m45.6s" — então a conta soma as três casas em vez de
 * procurar só os segundos. Ler "45.6s" de "1h23m45.6s" daria 45 segundos para
 * uma espera de hora e meia, que é exatamente o tipo de erro que este módulo
 * existe para não cometer.
 */
export function leEsperaDoGroq(detalhe: string): EsperaDoLimite {
  const texto = typeof detalhe === "string" ? detalhe : ""
  // "per day (TPD)", "per day (RPD)", "tokens per day" — qualquer um serve.
  const porDia = /per\s+day|\bTPD\b|\bRPD\b/i.test(texto)

  const m = texto.match(/try again in\s+(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i)
  if (!m || (!m[1] && !m[2] && !m[3])) return { segundos: null, porDia }

  const horas = Number(m[1] ?? 0)
  const minutos = Number(m[2] ?? 0)
  const segundos = Number(m[3] ?? 0)
  const total = horas * 3600 + minutos * 60 + segundos
  return { segundos: Number.isFinite(total) && total > 0 ? Math.ceil(total) : null, porDia }
}

/**
 * Como dizer a espera para quem está conversando.
 *
 * Vai para o prompt do modo reserva, e por isso é português direto: é o modelo
 * que lê e repete. Sem número do provedor, a frase é **vaga de propósito** —
 * "alguns minutos" não promete nada, e foi a promessa exata ("um minuto") que a
 * rodada Y desmentiu quatro vezes seguidas.
 */
export function comoDizerAEspera(e: EsperaDoLimite): string {
  if (e.porDia) return "o limite DIÁRIO de uso foi atingido, e ele só se renova amanhã"
  if (e.segundos === null) return "o limite de uso foi atingido; ele se renova em alguns minutos"
  if (e.segundos <= 90) return "o limite do minuto foi atingido; ele se renova em cerca de um minuto"
  if (e.segundos < 3600) {
    return `o limite de uso foi atingido; ele se renova em cerca de ${Math.ceil(e.segundos / 60)} minutos`
  }
  const horas = Math.ceil(e.segundos / 3600)
  return `o limite de uso foi atingido; ele só se renova daqui a cerca de ${horas} ${horas === 1 ? "hora" : "horas"}`
}

const MARCA = "__RATE_LIMIT__"

/**
 * O sentinela que atravessa o laço carregando o que foi lido.
 *
 * Era uma string pelada, e por isso a espera medida morria antes de chegar a
 * quem monta a frase. Continua string porque o laço devolve texto — o que muda
 * é ela levar carga.
 */
export function marcaDeLimite(e: EsperaDoLimite): string {
  return `${MARCA}|${e.segundos ?? ""}|${e.porDia ? "dia" : "minuto"}`
}

export function ehLimite(texto: string): boolean {
  return typeof texto === "string" && texto.startsWith(MARCA)
}

export function leMarcaDeLimite(texto: string): EsperaDoLimite {
  if (!ehLimite(texto)) return { segundos: null, porDia: false }
  const [, seg, escopo] = texto.split("|")
  const n = Number(seg)
  return { segundos: seg && Number.isFinite(n) ? n : null, porDia: escopo === "dia" }
}
