// Os atalhos da tela vazia da Neuro IA — os quatro cartões que sugerem o que
// perguntar. Eram uma constante no meio do JSX; agora são da pessoa.
// Referência: components/inspirações/prompts.jsx (`PromptLibrary`).
//
// **Da referência ficou o "salvos e editáveis", não a biblioteca.** O original
// traz busca, categorias, agrupamento e um diálogo de criar — mobília de quem
// guarda dezenas de prompts. Aqui o teto é SEIS, e buscar entre seis dá mais
// trabalho do que ler os seis (foi o mesmo argumento que tirou a busca do
// seletor de região). Sem busca, categoria não tem para que servir: ela existe
// para estreitar uma lista longa.
//
// Só dados e regras puras aqui. O I/O — ler e gravar no `user_metadata`, como
// avatar_modo e onboarding_v1 — mora em components/atalhos-neuro.tsx.

export const CHAVE_ATALHOS = "atalhos_neuro_v1"

export const ATALHOS_PADRAO: string[] = [
  "Organize meu dia com base nas minhas anotações",
  "Quais devem ser minhas 3 prioridades de hoje?",
  "Sugira blocos de foco para a tarde",
  "Como melhorar meu foco hoje?",
]

/** Teto de atalhos. Seis porque a grade tem duas colunas e a tela vazia precisa
 *  caber com a esfera acima dela — mais que isso e a sugestão vira parede. */
export const MAX_ATALHOS = 6

/** O cartão tem três linhas de altura; além disso o texto seria cortado. */
export const MAX_CARACTERES = 120

/**
 * Deixa a lista em estado exibível: sem espaço sobrando, sem vazio, sem
 * repetido, dentro dos dois tetos. Roda na LEITURA também, e não só na
 * gravação — o `user_metadata` é editável pelo cliente, então o que volta de lá
 * não é confiável só por ter sido gravado por nós um dia.
 */
export function saneiaAtalhos(brutos: unknown): string[] {
  if (!Array.isArray(brutos)) return []
  const vistos = new Set<string>()
  const limpos: string[] = []
  for (const bruto of brutos) {
    if (typeof bruto !== "string") continue
    // Quebra de linha vira espaço: o cartão é de uma frase, e um "\n" colado
    // deixaria um buraco no meio do texto sem nunca virar duas linhas de fato.
    const texto = bruto.replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES)
    if (!texto) continue
    // Repetido é comparado sem caixa: dois cartões que só diferem numa maiúscula
    // são o mesmo cartão para quem olha.
    const chave = texto.toLocaleLowerCase()
    if (vistos.has(chave)) continue
    vistos.add(chave)
    limpos.push(texto)
    if (limpos.length === MAX_ATALHOS) break
  }
  return limpos
}

/**
 * O que a tela vazia mostra. A distinção que importa: NUNCA MEXEU (a chave não
 * existe) recebe os padrões; APAGOU TODOS (a chave existe e está vazia) recebe
 * nada. Devolver os padrões nos dois casos faria os cartões renascerem sozinhos
 * para quem acabou de removê-los de propósito.
 */
export function leAtalhos(metadata: Record<string, unknown> | null | undefined): string[] {
  const guardado = metadata?.[CHAVE_ATALHOS]
  if (guardado === undefined || guardado === null) return [...ATALHOS_PADRAO]
  if (!Array.isArray(guardado)) return [...ATALHOS_PADRAO]
  return saneiaAtalhos(guardado)
}

/** Sem isto, "Restaurar padrão" apareceria mesmo já estando no padrão. */
export function ehPadrao(atalhos: string[]): boolean {
  return (
    atalhos.length === ATALHOS_PADRAO.length &&
    atalhos.every((a, i) => a === ATALHOS_PADRAO[i])
  )
}

export function podeAdicionar(atalhos: string[]): boolean {
  return atalhos.length < MAX_ATALHOS
}
