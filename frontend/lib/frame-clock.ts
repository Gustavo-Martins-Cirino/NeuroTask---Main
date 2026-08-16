// O relógio que alimenta o `advance()` do R3F quando quem manda desenhar é o
// ticker único do GSAP, e não o requestAnimationFrame que o `<Canvas>` abriria
// por conta própria.
//
// Duas armadilhas moram aqui, e nenhuma das duas aparece lendo o componente:
//
// 1. UNIDADE. Com `frameloop="never"` o R3F NÃO trata o argumento de advance()
//    como um instante de rAF: ele faz `delta = t - clock.elapsedTime` e logo
//    depois `clock.elapsedTime = t`. Ou seja, `t` é o tempo da CENA, em
//    segundos, e o delta que chega em cada useFrame é a distância entre duas
//    chamadas. Passar milissegundos ali multiplicaria por mil todo movimento
//    da sala.
//
// 2. SALTO. O relógio da cena nasce em zero; o do ticker, não — quando o
//    Escritório abre, o GSAP já pode estar em 300 s de página. E o TickerUnico
//    roda com `lagSmoothing(0)`, que de propósito NÃO absorve travada longa:
//    uma aba deixada em segundo plano por dez minutos volta com um pulo de
//    600 s. Entregar qualquer um dos dois cru faria a sala saltar de uma vez.
//    Por isso o tempo daqui é ACUMULADO a partir do zero, somando deltas
//    medidos e limitados.

/** Teto do delta de um quadro, em segundos (~15 fps). */
export const DELTA_MAX_S = 1 / 15

export interface RelogioQuadro {
  /** Segundos de cena acumulados — é exatamente o que vai para advance(). */
  tempo: number
  /** Último instante lido do ticker; ausente antes do primeiro quadro. */
  ultimo?: number
}

/**
 * @param tempoInicial de onde continuar — o `clock.elapsedTime` que a cena já
 * marca. Começar do zero com o relógio do R3F adiante entregaria delta NEGATIVO
 * no primeiro quadro, e um delta negativo não deixa a cena lenta: joga toda
 * animação que integra por delta para trás.
 */
export function relogioNovo(tempoInicial = 0): RelogioQuadro {
  return { tempo: Number.isFinite(tempoInicial) && tempoInicial > 0 ? tempoInicial : 0 }
}

/**
 * Avança o relógio com o instante que o ticker entregou (em segundos).
 * Quadro engolido — aba oculta, sala fora da tela — chega aqui como delta
 * enorme e sai limitado: a cena continua de onde parou em vez de saltar.
 */
export function proximoQuadro(
  relogio: RelogioQuadro,
  agora: number,
  deltaMax: number = DELTA_MAX_S
): RelogioQuadro {
  if (!Number.isFinite(agora)) return relogio
  // Primeiro quadro: não há distância a medir, só de onde contar daqui em diante.
  if (relogio.ultimo === undefined) return { tempo: relogio.tempo, ultimo: agora }
  const teto = Number.isFinite(deltaMax) && deltaMax > 0 ? deltaMax : DELTA_MAX_S
  // Tempo andando para trás não existe; se acontecer, o quadro só não avança.
  const delta = Math.min(Math.max(agora - relogio.ultimo, 0), teto)
  return { tempo: relogio.tempo + delta, ultimo: agora }
}

// ---- Rede de segurança ----
//
// Um Canvas em `frameloop="never"` depende INTEIRAMENTE de alguém chamar
// advance(). Se esse alguém sumir, a cena não fica lenta: ela congela, e nada
// na tela explica o porquê. O ticker é do GSAP, não do app — ele dorme sozinho
// quando julga que ninguém precisa dele (`autoSleep` em gsap-core: nenhum tween
// ativo e menos de dois ouvintes). Enquanto estivermos inscritos isso não
// deveria acontecer, mas "não deveria" é fraco demais para uma tela que some.
//
// Então o componente vigia o próprio relógio: se os quadros pararem de chegar
// enquanto a sala está à vista, ele devolve o Canvas ao loop nativo do R3F.
// Perde-se o ticker único; não se perde a cena.

/** Silêncio tolerado antes de considerar o ticker perdido. */
export const LIMITE_SOCORRO_MS = 1000

export function tickerSumiu(
  deveDesenhar: boolean,
  msDesdeOUltimoQuadro: number,
  limite: number = LIMITE_SOCORRO_MS
): boolean {
  // Sala fora da tela não desenha de propósito — silêncio ali é o esperado.
  if (!deveDesenhar) return false
  if (!Number.isFinite(msDesdeOUltimoQuadro)) return false
  return msDesdeOUltimoQuadro > limite
}
