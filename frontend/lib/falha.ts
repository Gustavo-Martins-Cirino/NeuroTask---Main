/**
 * A forma de "deu errado" que atravessa o app.
 *
 * O módulo devolve o MOTIVO como id; quem mostra escolhe a frase no dicionário.
 * É a mesma divisão de `lib/feedback.ts` e a mesma regra do resto de `lib/`:
 * módulo puro não fala idioma. O ganho não é só tradução — o motivo é um valor
 * que dá para testar e comparar, e a frase não.
 *
 * `desconhecido` é o que sobra. Quando o banco responde algo que ninguém
 * previu, `cru` carrega a mensagem dele: é feia, mas diz o que houve, e uma
 * frase genérica no lugar dela não ajuda ninguém.
 */
export interface Falha<M extends string> {
  motivo: M | "desconhecido"
  /** Só no `desconhecido`: a mensagem que veio do banco ou da exceção. */
  cru?: string
}

/** O texto de cada motivo, mais o de quando não sobrou mensagem nenhuma. */
export type TextosDeFalha<M extends string> = Record<M, string> & { generico: string }

/**
 * `NoInfer` no primeiro parâmetro: quem manda no motivo é o DICIONÁRIO. Sem
 * isso, `explicaFalha({ motivo: "semLuz" }, textos)` deixava o TypeScript
 * escolher `M` pela chamada e um motivo inexistente no dicionário passava.
 */
export function explicaFalha<M extends string>(falha: Falha<NoInfer<M>>, textos: TextosDeFalha<M>): string {
  if (falha.motivo === "desconhecido") return falha.cru || textos.generico
  return textos[falha.motivo]
}

/**
 * As RPCs devolvem o motivo DENTRO da mensagem de erro do Postgres — não há
 * campo próprio para ele, então é por substring mesmo.
 */
export function falhaPelaMensagem<M extends string>(msg: string, mapa: Record<string, M>): Falha<M> {
  const chave = Object.keys(mapa).find((k) => msg.includes(k))
  return chave ? { motivo: mapa[chave] } : { motivo: "desconhecido", cru: msg }
}

/** O que sobrou de um `catch`: mensagem quando é Error, nada quando não é. */
export function falhaDaExcecao<M extends string>(e: unknown): Falha<M> {
  return { motivo: "desconhecido", cru: e instanceof Error ? e.message : undefined }
}
