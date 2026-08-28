// Cor da nota. Referência: components/inspirações/notas-cores.jsx — um painel
// flutuante de cor e imagem.
//
// **Da referência veio a cor, não a imagem, e a cor entra como ETIQUETA.**
// Pintar a nota inteira brigaria com os tokens do tema nas duas pontas: no claro
// vira papel de bala, no escuro o texto perde contraste contra um fundo que não
// é mais o `--card`. Aqui a cor é uma tarja e um véu — o suficiente para achar a
// nota na lista de relance, que é para o que serve cor em lista.
//
// **O que se guarda é o NOME, nunca o hex.** Com o hex no banco, mudar a paleta
// um dia deixaria notas antigas apontando para uma cor que já não existe em
// lugar nenhum — e não haveria como corrigi-las em bloco.

export interface CorDeNota {
  id: string
  nome: string
  /** Um oklch que se lê nos dois temas: nem quase-branco, nem quase-preto. */
  cor: string
}

export const CORES_DE_NOTA: readonly CorDeNota[] = [
  { id: "ambar", nome: "Âmbar", cor: "oklch(0.76 0.15 75)" },
  { id: "coral", nome: "Coral", cor: "oklch(0.7 0.17 25)" },
  { id: "rosa", nome: "Rosa", cor: "oklch(0.72 0.15 350)" },
  { id: "violeta", nome: "Violeta", cor: "oklch(0.68 0.16 295)" },
  { id: "azul", nome: "Azul", cor: "oklch(0.68 0.14 245)" },
  { id: "verde", nome: "Verde", cor: "oklch(0.72 0.15 155)" },
]

/**
 * O que veio do banco, em estado utilizável.
 *
 * Cor desconhecida vira "sem cor" em vez de erro: uma nota com um id órfão
 * (paleta mudou, dado editado à mão) tem de continuar abrindo — perder a nota
 * por causa da etiqueta dela seria trocar o essencial pelo enfeite.
 */
export function saneiaCorDeNota(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null
  const id = bruto.trim().toLowerCase()
  return CORES_DE_NOTA.some((c) => c.id === id) ? id : null
}

export function corDeNota(id: unknown): CorDeNota | null {
  const limpo = saneiaCorDeNota(id)
  return limpo ? CORES_DE_NOTA.find((c) => c.id === limpo) ?? null : null
}

/** Quanto da cor entra no fundo do cartão. */
export const VEU = 14

/**
 * O fundo do cartão da nota: a cor misturada com o que já estava atrás.
 *
 * `color-mix` com transparente, e não um segundo hex por tema: assim é o fundo
 * do tema que aparece através do véu, e a mesma paleta serve ao claro e ao
 * escuro sem duas tabelas para manter em sincronia.
 */
export function fundoDaNota(id: unknown): string | undefined {
  const c = corDeNota(id)
  return c ? `color-mix(in oklab, ${c.cor} ${VEU}%, transparent)` : undefined
}

/** A tarja: a cor cheia, que é o que se enxerga na lista de relance. */
export function tarjaDaNota(id: unknown): string | undefined {
  return corDeNota(id)?.cor
}
