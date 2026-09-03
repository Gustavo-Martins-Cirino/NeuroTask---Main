// Quando a Neuro deve RECUSAR criar uma tarefa por já existir uma igual.
//
// **O bug que deu origem a isto**: "a IA não criou a tarefa". A regra antiga
// dizia que dois títulos eram o mesmo quando um CONTINHA o outro, com seis
// caracteres de mínimo. Isso transforma toda especialização em duplicata:
// existindo "Estudar three.js", pedir "Estudar" era recusado; existindo
// "Reunião", pedir "Reunião com o cliente" também. A pessoa pedia, a IA
// respondia "já existe uma parecida", e nada era criado.
//
// Pior: a comparação não olhava DATA nenhuma. "Academia" de terça bloqueava
// "Academia" de quinta — e uma tarefa que se repete é o caso mais comum que
// existe num app de rotina.
//
// **O princípio que resolve as duas: na dúvida, CRIA.** Tarefa duplicada é um
// aborrecimento que se apaga em um toque; tarefa que nunca foi criada é uma
// promessa que o app quebrou — e some sem deixar rastro, porque quem pediu
// acha que está lá.

/** Título sem acento, sem pontuação e sem espaço sobrando. */
export function normalizaTitulo(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * O quanto os dois podem diferir de tamanho e ainda serem "o mesmo título".
 *
 * A regra de conter continua valendo — ela é o que pega erro de digitação
 * ("manhã" / "manhão") e pontuação a mais. O que ela ganhou foi um piso de
 * proporção: conter só vale quando o maior é quase do tamanho do menor. Assim
 * "manha" dentro de "manhao" (0,83) segue duplicata, e "estudar" dentro de
 * "estudar three js" (0,44) volta a ser uma tarefa nova.
 */
export const PROPORCAO_MINIMA = 0.8

/** Abaixo disto, conter não diz nada: "ir" está dentro de metade dos títulos. */
export const TAMANHO_MINIMO = 6

export function ehMesmoTitulo(a: unknown, b: unknown): boolean {
  const na = normalizaTitulo(a)
  const nb = normalizaTitulo(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length < TAMANHO_MINIMO || nb.length < TAMANHO_MINIMO) return false
  if (!na.includes(nb) && !nb.includes(na)) return false
  const menor = Math.min(na.length, nb.length)
  const maior = Math.max(na.length, nb.length)
  return menor / maior >= PROPORCAO_MINIMA
}

/** "AAAA-MM-DD" na parede de quem usa, ou null se a tarefa não tem prazo. */
export function diaLocal(iso: unknown, tzMin: number): string | null {
  if (typeof iso !== "string" || !iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const off = Number.isFinite(tzMin) ? tzMin : 0
  const d = new Date(t - off * 60_000)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${d.getUTCFullYear()}-${mm}-${dd}`
}

/**
 * A tarefa nova é a mesma que uma que já existe?
 *
 * Só quando o título é o mesmo E o dia é o mesmo. Sem prazo dos dois lados
 * também conta como mesmo dia — são duas anotações soltas iguais.
 *
 * **Prazo em só um dos lados NÃO é duplicata**, e é decisão: existir "Academia"
 * solta e pedir "Academia amanhã às 8h" é agendar o que estava solto, não
 * repetir. Recusar ali deixaria a pessoa sem o horário que ela acabou de pedir.
 */
export function ehDuplicata(
  nova: { title: unknown; due_date?: unknown },
  existente: { title: unknown; due_date?: unknown },
  tzMin: number
): boolean {
  if (!ehMesmoTitulo(nova.title, existente.title)) return false
  return diaLocal(nova.due_date, tzMin) === diaLocal(existente.due_date, tzMin)
}
