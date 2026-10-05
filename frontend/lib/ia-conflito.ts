// O que a Neuro enxerga em volta de um bloco novo: com quem ele choca, de quem
// ficou colado demais, e se ele repete um que já existe.
//
// **Os dois furos que deram origem a isto** (05/10/2026, lendo a rota):
//  · A janela era o dia do SERVIDOR (`setHours(0,0,0,0)` roda em UTC na Vercel).
//    Para quem está no Brasil, o dia UTC vira às 21h: um bloco das 20:30 às 21:30
//    não via o das 21:00 que já estava na agenda, porque esse já era "amanhã". O
//    anti-duplicata tinha o mesmo corte, e "Estudar" às 21:10 passava ao lado do
//    "Estudar" das 20:30.
//  · A consulta pegava só blocos que COMEÇAVAM no dia, então o recorrente — uma
//    linha só, com a data da primeira ocorrência — nunca entrava. O Jiu Jitsu de
//    toda quarta não chocava com nada.
//
// Agora a janela é a VIZINHANÇA do bloco novo (o intervalo dele mais a folga),
// e quem expande os recorrentes é o mesmo `ocorrenciasNaJanela` que a leitura da
// agenda usa: se a Neuro LISTA um bloco, ela também o enxerga aqui.

import type { Ocorrencia } from "@/lib/ia-agenda"
import { ehMesmoTitulo } from "@/lib/ia-duplicata"

/** Menos que isto entre dois blocos é "colado demais". */
export const FOLGA_MINIMA_MS = 15 * 60_000
/** Mesmo título a menos que isto é o mesmo pedido repetido, não um bloco novo. */
export const FOLGA_DE_DUPLICATA_MS = 45 * 60_000

export type Conflito = { tipo: "choque" | "colado"; titulo: string }

/**
 * O pedaço da agenda que precisa ser lido para checar o bloco [inicio, fim).
 * Um milissegundo a mais de cada lado: `ocorrenciasNaJanela` compara estrito, e
 * o vizinho que termina a EXATOS 15 min ficaria de fora da leitura.
 */
export function janelaDoConflito(inicio: number, fim: number, folgaMs = FOLGA_MINIMA_MS): { de: number; ate: number } {
  return { de: inicio - folgaMs - 1, ate: fim + folgaMs + 1 }
}

/** O vão entre o bloco e a ocorrência; negativo quando se sobrepõem. */
function vao(inicio: number, fim: number, o: Ocorrencia): number {
  if (inicio < o.fim && fim > o.inicio) return -1
  return inicio >= o.fim ? inicio - o.fim : o.inicio - fim
}

const intervaloValido = (inicio: number, fim: number) => Number.isFinite(inicio) && Number.isFinite(fim) && fim > inicio

/**
 * O primeiro choque, ou, sem choque, o primeiro vizinho colado demais.
 *
 * `ignorar` é o id do próprio bloco: recém-gravado, ele está na agenda e
 * chocaria consigo mesmo.
 */
export function conflitoDoBloco(
  inicio: number,
  fim: number,
  agenda: readonly Ocorrencia[],
  ignorar: string | null
): Conflito | null {
  if (!intervaloValido(inicio, fim)) return null
  const outros = agenda.filter((o) => !ignorar || o.id !== ignorar)

  const choque = outros.find((o) => vao(inicio, fim, o) < 0)
  if (choque) return { tipo: "choque", titulo: choque.titulo }

  const colado = outros.find((o) => vao(inicio, fim, o) <= FOLGA_MINIMA_MS)
  return colado ? { tipo: "colado", titulo: colado.titulo } : null
}

/** O bloco de mesmo título que já ocupa (ou quase) este horário, se houver. */
export function duplicataNaAgenda(
  inicio: number,
  fim: number,
  titulo: string,
  agenda: readonly Ocorrencia[]
): Ocorrencia | null {
  if (!intervaloValido(inicio, fim)) return null
  return agenda.find((o) => ehMesmoTitulo(o.titulo, titulo) && vao(inicio, fim, o) <= FOLGA_DE_DUPLICATA_MS) ?? null
}
