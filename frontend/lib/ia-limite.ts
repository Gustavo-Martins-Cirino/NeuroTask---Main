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
 * Lê o corpo do 429 do Groq.
 *
 * Ele conta as duas coisas que importam, e conta juntas:
 *
 *     "...on tokens per day (TPD): Limit 100000, Used 99000, Requested 2900.
 *      Please try again in 1h23m45.6s."
 *
 * QUAL teto estourou (minuto ou dia) e QUANTO esperar. A frase da tela sai daí
 * — antes saía de um "cerca de um minuto" cravado por mim no prompt, que a
 * rodada Y desmentiu quatro vezes em sete minutos.
 *
 * Esta função já leu três provedores; com a política de um provedor só, o que
 * sobrou do Gemini e da Anthropic saiu junto com eles. O `retry-after` do
 * header continua aqui porque é padrão de HTTP, não de fornecedor: se o Groq
 * mandar e o corpo calar, é informação de graça.
 */
export function leEsperaDoLimite(detalhe: string, retryAfter?: string | null): EsperaDoLimite {
  const texto = typeof detalhe === "string" ? detalhe : ""
  const origem = origemSegura(retryAfter)
  // \b nas siglas: sem ele, "TPD" casaria no meio de outra palavra.
  const porDia = /per\s*day|\bTPD\b|\bRPD\b/i.test(texto)

  const m = texto.match(/try again in\s+(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i)
  const doCorpo = m && (m[1] || m[2] || m[3]) ? somaHMS(m[1], m[2], m[3]) : null
  if (doCorpo !== null) return { segundos: doCorpo, porDia, origem }

  // Só a forma em segundos: a forma de data pede o relógio de agora, e um
  // relógio fora de hora inventaria uma espera — preferimos não saber a saber
  // errado. Ela continua visível em `origem`, para quem quiser conferir.
  const doHeader = origem && /^\d+$/.test(origem) ? Number(origem) : null
  return { segundos: doHeader && doHeader > 0 ? doHeader : null, porDia, origem }
}

/**
 * O que a TELA precisa saber — chave, não frase.
 *
 * Módulo puro não fala idioma: aqui sai a chave e o dicionário devolve o
 * texto, como em `saudacao` e `nivel-faixa`.
 *
 * Houve aqui uma `comoDizerAEspera` que escrevia português direto, porque o
 * destino dela era o prompt do MODO RESERVA — um modelo lia e repetia. Com o
 * reserva removido (só Groq), quem lê a espera é gente, e gente lê no idioma
 * da interface.
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
 * A frase pronta, montada a partir dos textos que quem mostra escolheu.
 *
 * Recebe os quatro textos em vez de importar o dicionário — é o mesmo arranjo
 * do `recibo`: o módulo decide QUAL frase, o dicionário decide EM QUE LÍNGUA.
 * Existe porque agora são dois clientes (o chat e a conversa por voz) fazendo
 * a mesma escolha, e escolha duplicada é escolha que diverge.
 */
export function fraseDaEspera(
  e: EsperaDoLimite,
  textos: {
    dia: string
    horas: (horas: number) => string
    minutos: (minutos: number) => string
    vago: string
  }
): string {
  switch (escopoNaTela(e)) {
    case "dia":
      return textos.dia
    case "horas":
      return textos.horas(horasDeEspera(e.segundos as number))
    case "minutos":
      return textos.minutos(minutosDeEspera(e.segundos as number))
    default:
      return textos.vago
  }
}

/**
 * O corpo cru do 429, do jeito que cabe numa linha de log.
 *
 * O log dizia `escopo=minuto segundos=13` — o RESULTADO do parse. Com ele não
 * se falseia o parse: se `leEsperaDoLimite` classificar errado, a linha repete
 * a classificação errada com toda a confiança, e foi exatamente esse o impasse
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
