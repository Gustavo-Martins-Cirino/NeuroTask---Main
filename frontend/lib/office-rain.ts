// Chuva escorrendo no vidro da janela do Escritório.
//
// Feito com malhas, não com shader — pela mesma razão da rolagem do código
// (lib/office-code-scroll): são poucas dezenas de riscos, e assim a conta de
// onde cada gota está num instante t vira função pura, que dá para testar. Um
// shader seria mais bonito e completamente invisível para os testes.

export interface Gota {
  /** Deslocamento horizontal a partir do centro do vidro, em unidades do modelo. */
  x: number
  /** Onde a gota está no ciclo quando t = 0 (0 = topo, 1 = base). */
  fase: number
  /** Ciclos por segundo. Gota gorda desce mais rápido — é o que dá o escalonado. */
  velocidade: number
  /** Comprimento do risco (o rastro molhado atrás da gota). */
  comprimento: number
  largura: number
}

export const GOTAS_PADRAO = 30

// Gerador determinístico (mulberry32). Precisa ser reproduzível: a mesma janela
// tem que ter a mesma chuva a cada render, senão as gotas saltam de lugar
// quando o modelo é reconstruído (trocar de skin, subir de nível).
function aleatorio(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function criarGotas(
  quantidade: number,
  larguraVidro: number,
  alturaVidro: number,
  semente = 7
): Gota[] {
  const n = Math.max(0, Math.floor(quantidade))
  const rnd = aleatorio(semente)
  const gotas: Gota[] = []

  for (let i = 0; i < n; i++) {
    // Margem: risco colado no caixilho parece defeito de encaixe, não chuva.
    const x = (rnd() - 0.5) * larguraVidro * 0.9
    const gorda = rnd()
    gotas.push({
      x,
      fase: rnd(),
      velocidade: 0.1 + gorda * 0.22,
      comprimento: alturaVidro * (0.05 + gorda * 0.13),
      largura: 0.006 + gorda * 0.006,
    })
  }

  return gotas
}

/** Onde a gota está no ciclo: 0 no topo do vidro, 1 na base. Nunca sai de [0,1). */
export function progressoDaGota(gota: Gota, t: number): number {
  if (!Number.isFinite(t)) return gota.fase
  const p = (gota.fase + gota.velocidade * t) % 1
  return p < 0 ? p + 1 : p
}

export interface SegmentoDaGota {
  /** Centro do risco no eixo vertical do modelo (Z-up). */
  centroZ: number
  /** Fração do comprimento total que está à vista, de 0 a 1. */
  escalaZ: number
}

/**
 * O pedaço do risco que cabe DENTRO do vão do vidro, num instante t.
 *
 * A gota não é um retângulo teleportando de volta para o topo: ela entra
 * crescendo (a cauda ainda está atrás do caixilho de cima) e sai encolhendo (a
 * cabeça já passou do caixilho de baixo). Sem esse corte, ou o risco aparece
 * por cima da moldura, ou some de estalo ao chegar no peitoril — e "some de
 * estalo" lê como bug de render, não como chuva.
 */
export function segmentoDaGota(
  gota: Gota,
  t: number,
  topoZ: number,
  alturaVidro: number
): SegmentoDaGota {
  const base = topoZ - alturaVidro
  // O percurso inclui o comprimento do risco nas duas pontas: é o que dá o
  // entra-e-sai em vez do salto.
  const cabeca = topoZ - progressoDaGota(gota, t) * (alturaVidro + gota.comprimento)
  const cauda = Math.min(topoZ, cabeca + gota.comprimento)
  const cabecaVisivel = Math.max(base, cabeca)
  const comprimento = Math.max(0, cauda - cabecaVisivel)

  return {
    centroZ: (cauda + cabecaVisivel) / 2,
    escalaZ: gota.comprimento > 0 ? comprimento / gota.comprimento : 0,
  }
}

// ---- Quando chove ----
// Não há previsão do tempo aqui, e inventar chuva seria decorar com dado falso.
// O gatilho é o que o usuário já escolheu: se o som de Chuva está ligado no
// mixer, chove na janela. As duas coisas se reforçam em vez de brigar.

// A chave e o evento moram em hooks/use-sound-mixer, que é quem escreve. Aqui
// fica só a leitura: o id da trilha e como interpretar o que está salvo.
export const MIXER_TRILHA_CHUVA = "rain"

export function chuvaLigadaNoMix(bruto: string | null): boolean {
  if (!bruto) return false
  try {
    const salvo = JSON.parse(bruto) as { tracks?: Record<string, { active?: boolean }> }
    return salvo?.tracks?.[MIXER_TRILHA_CHUVA]?.active === true
  } catch {
    return false
  }
}
