// O estado do card "Comece por aqui", guardado no aparelho.
//
// O card nascia vazio e só aparecia quando as três contagens voltavam do banco —
// depois dos números do dashboard, que ficam logo abaixo dele. Medido: um
// deslocamento de layout de 0,099 sozinho, empurrando a tela ~300 px para baixo.
//
// Duas coisas resolvem sem reservar altura (reservar puniria quem já graduou,
// que é quase todo mundo — o espaço vazio fecharia com o mesmo pulo ao contrário):
//  · a última contagem fica guardada, e o card é desenhado na hora com ela; a
//    consulta só ATUALIZA o que já está na tela;
//  · graduar é para sempre neste aparelho. Ninguém "desgradua" apagando tarefa,
//    e quem já graduou para de pagar as três consultas a cada visita.

export const CHAVE_DISPENSADO = "neurotask:onboarded"
export const CHAVE_CONTAGEM = "neurotask:comece-contagem"

export interface Contagem {
  tasks: number
  done: number
  blocks: number
}

export function graduou(c: Contagem): boolean {
  return c.tasks > 0 && c.done > 0 && c.blocks > 0
}

const inteiro = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0

/** A contagem guardada, ou null se não há nada (ou veio torto). */
export function leContagem(raw: string | null): Contagem | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Record<string, unknown>
    if (!d || typeof d !== "object") return null
    if (!inteiro(d.tasks) || !inteiro(d.done) || !inteiro(d.blocks)) return null
    return { tasks: d.tasks, done: d.done, blocks: d.blocks }
  } catch {
    return null
  }
}

export function serializaContagem(c: Contagem): string {
  return JSON.stringify({ tasks: c.tasks, done: c.done, blocks: c.blocks })
}
