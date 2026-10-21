import { idsDoYoutube } from "./youtube-embed"

// A lista de músicas do player do Modo Foco: o que está guardado, em que ordem
// toca e de onde continua. A parte que fala com o YouTube mora no componente;
// aqui só decisão.
//
// O formato guardado é o MESMO dos antigos favoritos ({id, url, title}), na
// mesma chave do localStorage: quem já tinha favoritos encontra todos na lista.

export interface Faixa {
  id: string
  url: string
  title: string
}

export const MAX_FAIXAS = 100

/** Antes disso, "anterior" volta para a música de antes; depois, recomeça a atual (como no Spotify). */
export const SEGUNDOS_PARA_RECOMECAR = 3

/** O que identifica a MESMA música, venha o link no formato que vier (youtu.be, watch, shorts...). */
export function chaveDaFaixa(url: string): string | null {
  const ids = idsDoYoutube(url)
  if (!ids) return null
  return ids.video ? `v:${ids.video}` : `l:${ids.lista}`
}

/** A lista guardada, conferida item a item: lixo e repetidas saem, e nunca passa do teto. */
export function leFaixas(bruto: string | null): Faixa[] {
  let dados: unknown
  try {
    dados = JSON.parse(bruto ?? "[]")
  } catch {
    return []
  }
  if (!Array.isArray(dados)) return []
  const vistas = new Set<string>()
  const faixas: Faixa[] = []
  for (const d of dados) {
    if (!d || typeof d !== "object") continue
    const { id, url, title } = d as Record<string, unknown>
    if (typeof id !== "string" || typeof url !== "string") continue
    const chave = chaveDaFaixa(url)
    if (!chave || vistas.has(chave)) continue
    vistas.add(chave)
    faixas.push({ id, url, title: typeof title === "string" && title.trim() ? title.trim().slice(0, 200) : url })
    if (faixas.length >= MAX_FAIXAS) break
  }
  return faixas
}

/** Entra no fim da lista — ou devolve a que já estava lá, se for a mesma música. */
export function adicionaFaixa(faixas: Faixa[], nova: Faixa): { faixas: Faixa[]; jaExistia: Faixa | null } {
  const chave = chaveDaFaixa(nova.url)
  if (!chave) return { faixas, jaExistia: null }
  const existente = faixas.find((f) => chaveDaFaixa(f.url) === chave) ?? null
  if (existente) return { faixas, jaExistia: existente }
  return { faixas: [...faixas, nova].slice(-MAX_FAIXAS), jaExistia: null }
}

/**
 * A próxima (1) ou a anterior (-1), dando a volta na lista. Pula as que o
 * YouTube recusou tocar fora dele; se todas foram recusadas, `null`. Sem atual
 * (ou com a atual removida), começa do começo — ou do fim, voltando.
 */
export function vizinha(
  faixas: Faixa[],
  atualId: string | null,
  direcao: 1 | -1,
  recusadas: ReadonlySet<string> = new Set()
): Faixa | null {
  if (faixas.length === 0) return null
  const atual = faixas.findIndex((f) => f.id === atualId)
  const inicio = atual === -1 ? (direcao === 1 ? -1 : faixas.length) : atual
  for (let passo = 1; passo <= faixas.length; passo++) {
    const i = (((inicio + direcao * passo) % faixas.length) + faixas.length) % faixas.length
    if (!recusadas.has(faixas[i].id)) return faixas[i]
  }
  return null
}

/** A capa: a miniatura que o próprio YouTube gera. Lista sem vídeo não tem. */
export function miniaturaDaFaixa(url: string): string | null {
  const ids = idsDoYoutube(url)
  return ids?.video ? `https://i.ytimg.com/vi/${ids.video}/mqdefault.jpg` : null
}

/** O título ainda é o link colado — o do vídeo, quando o player o conhecer, entra no lugar. */
export function tituloProvisorio(faixa: Faixa): boolean {
  return faixa.title === faixa.url
}

export interface Retomada {
  id: string
  segundos: number
}

/** De onde continuar: só faz sentido com uns segundos andados, e volta um pouco para não cortar a frase. */
export function leRetomada(bruto: string | null): Retomada | null {
  try {
    const r = JSON.parse(bruto ?? "null") as Partial<Retomada> | null
    if (!r || typeof r.id !== "string" || typeof r.segundos !== "number" || !Number.isFinite(r.segundos)) return null
    return { id: r.id, segundos: Math.max(0, r.segundos) }
  } catch {
    return null
  }
}

export function inicioDaRetomada(retomada: Retomada | null, faixaId: string): number | undefined {
  if (!retomada || retomada.id !== faixaId || retomada.segundos < 10) return undefined
  return Math.floor(retomada.segundos - 2)
}
