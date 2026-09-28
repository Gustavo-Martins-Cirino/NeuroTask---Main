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
  /**
   * O `retry-after` do provedor, cru, como ele mandou — e `null` quando cala.
   *
   * Não entra em conta nenhuma: existe para ser CONFERIDO. O relatório da
   * rodada Z travou exatamente aqui — mediu `x-neuro-espera: 13, 14, 17` e não
   * teve como saber se o 13 era leitura fiel do provedor ou invenção nossa,
   * porque nada do que o Groq respondeu chegava ao cliente. Com o número da
   * origem ao lado do traduzido, a tradução se audita sem abrir log.
   */
  origem: string | null
}

/** O que sai quando não há 429 nenhum para ler. */
const SEM_LIMITE: EsperaDoLimite = { segundos: null, porDia: false, origem: null }

/**
 * O `retry-after` cru, seguro para viajar num header e na marca.
 *
 * Vem de fora, então nada dele é presumido: `|` é o separador da marca e
 * quebra de linha encerra header, e os dois viriam de graça se o provedor
 * resolvesse mandar. O teto de 40 é folga sobre as duas formas que o HTTP
 * define — segundos ("13") e data ("Wed, 21 Oct 2015 07:28:00 GMT").
 */
function origemSegura(bruto: string | null | undefined): string | null {
  if (typeof bruto !== "string") return null
  const limpo = bruto.replace(/[|\r\n]/g, " ").trim().slice(0, 40)
  return limpo || null
}

/**
 * "1h23m45.6s", "2m59.56s", "7.66s" → segundos.
 *
 * O Groq escreve a espera em formatos que crescem com ela, então a conta soma
 * as três casas em vez de procurar só os segundos. Ler "45.6s" de "1h23m45.6s"
 * daria 45 segundos para uma espera de hora e meia, que é exatamente o tipo de
 * erro que este módulo existe para não cometer.
 */
function somaHMS(h?: string, m?: string, s?: string): number | null {
  const total = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
  return Number.isFinite(total) && total > 0 ? Math.ceil(total) : null
}

/**
 * Lê o corpo do 429 — de qualquer um dos três provedores.
 *
 * Era `leEsperaDoGroq`, e o nome estava certo enquanto só o caminho do Groq
 * lia alguma coisa. O caminho Gemini/Anthropic dizia "precisa de um minuto
 * para respirar" sem ler nada, e o minuto era chute — o mesmo defeito da
 * rodada Y, sobrevivendo no outro provedor.
 *
 * Cada um conta a mesma coisa do seu jeito:
 *
 * · Groq    — "on tokens per day (TPD)" / "Please try again in 1h23m45.6s"
 * · Gemini  — quotaId "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
 *             (junto, sem espaço) e RetryInfo `"retryDelay": "51s"`
 * · Anthropic — pouco no corpo; o que ele dá é o header `retry-after`
 *
 * Por isso o header entra como fonte de segundos quando o corpo cala: é a
 * única coisa que a Anthropic oferece, e ignorá-la deixaria o caminho dela
 * permanentemente vago.
 */
export function leEsperaDoLimite(detalhe: string, retryAfter?: string | null): EsperaDoLimite {
  const texto = typeof detalhe === "string" ? detalhe : ""
  const origem = origemSegura(retryAfter)
  // "per day (TPD)", "per day (RPD)", "tokens per day" — e o `PerDay` colado do
  // quotaId do Gemini, que `per\s+day` deixava passar.
  const porDia = /per\s*day|\bTPD\b|\bRPD\b/i.test(texto)

  const groq = texto.match(/try again in\s+(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i)
  const doGroq = groq && (groq[1] || groq[2] || groq[3]) ? somaHMS(groq[1], groq[2], groq[3]) : null
  if (doGroq !== null) return { segundos: doGroq, porDia, origem }

  // Gemini: `"retryDelay": "51s"` dentro do RetryInfo.
  const gemini = texto.match(/"retryDelay"\s*:\s*"(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?"/i)
  const doGemini = gemini ? somaHMS(gemini[1], gemini[2], gemini[3]) : null
  if (doGemini !== null) return { segundos: doGemini, porDia, origem }

  // Último recurso, o header. Só a forma em segundos: a forma de data pede o
  // relógio de agora, e um relógio fora de hora inventaria uma espera —
  // preferimos não saber a saber errado. Ela continua visível em `origem`.
  const doHeader = origem && /^\d+$/.test(origem) ? Number(origem) : null
  return { segundos: doHeader && doHeader > 0 ? doHeader : null, porDia, origem }
}

/**
 * O que a TELA precisa saber — chave, não frase.
 *
 * Módulo puro não fala idioma: aqui sai a chave e o dicionário devolve o
 * texto, como em `saudacao` e `nivel-faixa`. É o que separa esta função de
 * `comoDizerAEspera`, que escreve português porque o destino dela é o prompt
 * do modelo, não a tela.
 */
export type EscopoNaTela = "dia" | "horas" | "minutos" | "vago"

export function escopoNaTela(e: EsperaDoLimite): EscopoNaTela {
  if (e.porDia) return "dia"
  if (e.segundos === null) return "vago"
  if (e.segundos >= 3600) return "horas"
  return "minutos"
}

/** Arredonda para cima e nunca devolve zero: "0 minutos" não é espera nenhuma. */
export function minutosDeEspera(segundos: number): number {
  return Math.max(1, Math.ceil(segundos / 60))
}

export function horasDeEspera(segundos: number): number {
  return Math.max(1, Math.ceil(segundos / 3600))
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

/**
 * O corpo cru do 429, do jeito que cabe numa linha de log.
 *
 * O log dizia `escopo=minuto segundos=13` — o RESULTADO do parse. Com ele não
 * se falseia o parse: se `leEsperaDoGroq` classificar errado, a linha repete a
 * classificação errada com toda a confiança, e foi exatamente esse o impasse
 * da rodada Z. O que resolve é o texto que o provedor mandou, ao lado do que
 * nós lemos dele.
 *
 * Uma linha só: a Vercel corta por quebra de linha, e um JSON de erro em três
 * linhas vira três entradas soltas — a que interessa quase nunca é a primeira.
 */
export function corpoParaLog(detalhe: string, teto = 500): string {
  if (typeof detalhe !== "string" || !detalhe.trim()) return "(vazio)"
  const linha = detalhe.replace(/\s+/g, " ").trim()
  return linha.length > teto ? `${linha.slice(0, teto)}…(+${linha.length - teto})` : linha
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
  return `${MARCA}|${e.segundos ?? ""}|${e.porDia ? "dia" : "minuto"}|${e.origem ?? ""}`
}

export function ehLimite(texto: string): boolean {
  return typeof texto === "string" && texto.startsWith(MARCA)
}

export function leMarcaDeLimite(texto: string): EsperaDoLimite {
  if (!ehLimite(texto)) return SEM_LIMITE
  const [, seg, escopo, origem] = texto.split("|")
  const n = Number(seg)
  return {
    segundos: seg && Number.isFinite(n) ? n : null,
    porDia: escopo === "dia",
    origem: origem || null,
  }
}
