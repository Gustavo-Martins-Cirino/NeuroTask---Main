// Que data e hora a Neuro recebe — e por que ela não vem mais do cliente.
//
// **O bug que deu origem a isto**: "a IA não consegue ver o mês". O cliente
// mandava `new Date().toLocaleString("pt-BR")`, ou seja `"28/08/2026, 20:11:03"`,
// e o prompt pedia respostas em ISO 8601. Um modelo lendo "28/08" tem de adivinhar
// se é dia/mês ou mês/dia — e quando ele erra, erra em silêncio: a tarefa nasce
// em abril, ou a pergunta "o que tenho este mês?" fala do mês errado.
//
// Três coisas mudam aqui, e as três atacam a mesma ambiguidade:
//
// 1. **Quem monta a frase é o SERVIDOR**, a partir do fuso que o cliente já
//    mandava. O `now` do corpo deixou de ser usado. Duas telas (chat e voz)
//    formatavam a data por conta própria, e formato de data em dois lugares é
//    como um deles fica diferente sem ninguém notar.
// 2. O dia vem por EXTENSO e também em ISO. Nome de mês não tem como ser lido
//    de trás para frente.
// 3. O mês corrente vem com começo e fim explícitos, porque "este mês" era a
//    pergunta que falhava — e nenhuma conta de calendário deveria sobrar para o
//    modelo fazer.

const DIAS = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado",
] as const

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const

function dois(n: number): string {
  return String(n).padStart(2, "0")
}

/** A parede de quem usa, em campos separados — a base de todo o resto daqui. */
export interface ParedeDoUsuario {
  ano: number
  /** 1 a 12, como se lê, e não 0 a 11 como no Date. */
  mes: number
  dia: number
  hora: number
  minuto: number
  /** 0 = domingo. */
  diaDaSemana: number
}

export function paredeDoUsuario(agoraMs: number, tzMin: number): ParedeDoUsuario {
  const t = Number.isFinite(agoraMs) ? agoraMs : Date.now()
  const off = Number.isFinite(tzMin) ? tzMin : 0
  const d = new Date(t - off * 60_000)
  return {
    ano: d.getUTCFullYear(),
    mes: d.getUTCMonth() + 1,
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
    diaDaSemana: d.getUTCDay(),
  }
}

/** "AAAA-MM-DD" a partir da parede. */
export function chaveDoDia(p: ParedeDoUsuario): string {
  return `${p.ano}-${dois(p.mes)}-${dois(p.dia)}`
}

/** O sufixo de fuso do ISO: Brasil (offset 180) vira "-03:00". */
export function sufixoDeFuso(tzMin: number): string {
  const off = Number.isFinite(tzMin) ? Math.trunc(tzMin) : 0
  if (off === 0) return "Z"
  // `getTimezoneOffset` conta minutos ATRÁS do UTC, então o sinal do ISO é o
  // oposto do sinal dele. Trocar os dois é o erro clássico daqui.
  const sinal = off > 0 ? "-" : "+"
  const abs = Math.abs(off)
  return `${sinal}${dois(Math.floor(abs / 60))}:${dois(abs % 60)}`
}

/** O último dia do mês — inclusive fevereiro bissexto e a virada de dezembro. */
export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/** Soma dias na parede e devolve "AAAA-MM-DD", atravessando mês e ano. */
export function diaSomado(p: ParedeDoUsuario, dias: number): string {
  const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia))
  d.setUTCDate(d.getUTCDate() + (Number.isFinite(dias) ? Math.trunc(dias) : 0))
  return `${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}`
}

/**
 * O bloco de data e hora que entra no prompt.
 *
 * Redundante de propósito: por extenso, em ISO e com as datas de referência já
 * calculadas. Cada linha existe para tirar uma conta das mãos do modelo — e
 * conta de calendário é exatamente o que ele erra sem avisar.
 */
export function descreveAgora(agoraMs: number, tzMin: number): string {
  const p = paredeDoUsuario(agoraMs, tzMin)
  const hoje = chaveDoDia(p)
  const fuso = sufixoDeFuso(tzMin)
  const fimDoMes = `${p.ano}-${dois(p.mes)}-${dois(ultimoDiaDoMes(p.ano, p.mes))}`

  return [
    `Data e hora do usuário: ${DIAS[p.diaDaSemana]}, ${p.dia} de ${MESES[p.mes - 1]} de ${p.ano}, ${dois(p.hora)}:${dois(p.minuto)}.`,
    `Em ISO 8601: ${hoje}T${dois(p.hora)}:${dois(p.minuto)}:00${fuso} (o fuso do usuário é ${fuso}).`,
    `Datas de referência, já calculadas — use estas, não recalcule:`,
    `- hoje = ${hoje}`,
    `- amanhã = ${diaSomado(p, 1)}`,
    `- ontem = ${diaSomado(p, -1)}`,
    `- daqui a 7 dias = ${diaSomado(p, 7)}`,
    `- o mês atual (${MESES[p.mes - 1]}) vai de ${p.ano}-${dois(p.mes)}-01 a ${fimDoMes}`,
    `Ao criar ou editar, escreva a data em ISO 8601 com este fuso (${fuso}).`,
  ].join("\n")
}
