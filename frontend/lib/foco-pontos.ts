// Quanto o Modo Foco paga, e quando.
//
// Duas fontes, as duas pela cota PRÓPRIA do foco (award_focus_xp, em
// supabase/foco_xp.sql), fora do teto diário de 150 das tarefas — dentro dele,
// quem já encosta no teto não sentiria o foco, e é justamente quem mais o usa:
//
// 1. Tempo focado: +2 XP a cada 5 min com o timer CORRENDO. Pausa não conta, e
//    o relógio é o próprio timer (que sai de um instante de fim, lib/sino-foco),
//    então aba de fundo e recarregar não comem nem inventam minuto.
// 2. Tarefa concluída dentro do foco vale o dobro — a metade extra é o bônus —,
//    desde que o foco tenha rodado de verdade: 15 min, ou a sessão inteira
//    quando ela for mais curta que isso.

export const MINUTOS_POR_BLOCO = 5
export const XP_POR_BLOCO = 2
export const MINUTOS_PARA_DOBRAR = 15
/** Espelho do `focus_cap` de supabase/foco_xp.sql — quem aplica é o servidor. */
export const TETO_DIARIO_DO_FOCO = 60

const SEGUNDOS_POR_BLOCO = MINUTOS_POR_BLOCO * 60

/**
 * Segundos de foco de verdade na sessão: o que o timer já andou agora, mais o que
 * andou antes de um "recomeçar" ou de uma troca de duração (que zeram o timer,
 * mas não o tempo que a pessoa já passou focada).
 */
export function segundosFocados(guardado: number, duracao: number, restante: number): number {
  return Math.max(0, guardado) + Math.max(0, duracao - restante)
}

/**
 * Quantos blocos de 5 min a sessão já completou, e quanto XP ainda falta pagar
 * por eles. Pagar a DIFERENÇA, e não "um bloco por tique", é o que impede um
 * tique perdido (aba de fundo) de engolir um bloco, ou dois tiques de pagá-lo duas vezes.
 */
export function xpAPagar(segundos: number, blocosPagos: number): { blocos: number; xp: number } {
  const blocos = Math.floor(Math.max(0, segundos) / SEGUNDOS_POR_BLOCO)
  const novos = Math.max(0, blocos - Math.max(0, blocosPagos))
  return { blocos: Math.max(blocos, blocosPagos), xp: novos * XP_POR_BLOCO }
}

/** Se a tarefa concluída agora, dentro do foco, vale o dobro. */
export function dobraATarefa(segundos: number, duracao: number): boolean {
  if (segundos <= 0 || duracao <= 0) return false
  return segundos >= Math.min(MINUTOS_PARA_DOBRAR * 60, duracao)
}

/** O XP a mais pela tarefa: o mesmo que ela já vale, ou nada. */
export function bonusDaTarefa(xpDaTarefa: number, segundos: number, duracao: number): number {
  return xpDaTarefa > 0 && dobraATarefa(segundos, duracao) ? xpDaTarefa : 0
}

/**
 * A função do servidor ainda não existe — `foco_xp.sql` não foi rodado. O
 * PostgREST responde PGRST202 (fora do cache do schema) e o Postgres, 42883.
 * Nesse caso o XP do foco cai no award_xp comum: vale menos (entra no teto de
 * 150), mas não some.
 */
export function funcaoAusente(erro: { code?: string | null } | null | undefined): boolean {
  return erro?.code === "PGRST202" || erro?.code === "42883"
}

/** O que award_focus_xp devolve: o total novo e quanto de fato entrou. */
export function leRespostaDoFoco(dado: unknown): { total: number; concedido: number } | null {
  if (!dado || typeof dado !== "object") return null
  const { total, concedido } = dado as Record<string, unknown>
  if (typeof total !== "number" || typeof concedido !== "number") return null
  if (!Number.isFinite(total) || !Number.isFinite(concedido)) return null
  return { total, concedido: Math.max(0, concedido) }
}
