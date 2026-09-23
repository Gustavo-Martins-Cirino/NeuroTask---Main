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

/** O nome curto, como se fala: "na sexta", e não "na sexta-feira". */
const CURTOS = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
] as const

/** Domingo e sábado são masculinos: "no domingo"/"próximo domingo", contra
 *  "na segunda"/"próxima segunda". A tabela CITA a expressão para o modelo
 *  procurar, então concordância errada ali é frase que ele não encontra. */
const ARTIGO = ["no", "na", "na", "na", "na", "na", "no"] as const
const PROXIMO = ["próximo", "próxima", "próxima", "próxima", "próxima", "próxima", "próximo"] as const

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

/** O dia da semana (0 = domingo) de uma data "AAAA-MM-DD". */
export function diaDaSemanaDaChave(chave: string): number {
  const [a, m, d] = chave.split("-").map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

/**
 * A próxima ocorrência de um dia da semana, a partir de hoje.
 *
 * **Hoje conta.** Se hoje é sábado e alguém diz "no sábado", a resposta é hoje —
 * e não daqui a sete dias. É a leitura que a maioria das pessoas faz, e o
 * relatório de testes registrou o oposto acontecendo ("no domingo", num sábado,
 * virou o domingo da semana seguinte).
 */
export function proximaOcorrencia(p: ParedeDoUsuario, diaDaSemana: number): string {
  const alvo = ((Math.trunc(diaDaSemana) % 7) + 7) % 7
  const delta = (alvo - p.diaDaSemana + 7) % 7
  return diaSomado(p, delta)
}

/**
 * O mesmo dia da semana, na PRÓXIMA semana do calendário — a que abre no
 * domingo seguinte.
 *
 * É isto que "sexta que vem" e "próxima sexta" querem dizer, e não é o mesmo
 * que `proximaOcorrencia`: numa terça, a próxima sexta é a desta semana, e a
 * "sexta que vem" é a de depois. As duas só coincidem quando o dia pedido já
 * cai na semana seguinte de qualquer jeito.
 */
export function naSemanaQueVem(p: ParedeDoUsuario, diaDaSemana: number): string {
  const alvo = ((Math.trunc(diaDaSemana) % 7) + 7) % 7
  // Daqui até o domingo que abre a próxima semana, e dali até o dia pedido.
  return diaSomado(p, 7 - p.diaDaSemana + alvo)
}

/**
 * A próxima ocorrência SEM contar hoje — o que "próxima sexta" quer dizer.
 *
 * São três expressões e três leituras, e confundi-las já custou dois bugs:
 *
 * · "na sexta" → `proximaOcorrencia`, que conta hoje (num sábado, "no sábado"
 *   é hoje);
 * · "próxima sexta" → esta, que pula hoje mas fica na primeira sexta que vier
 *   (numa terça, é a desta semana);
 * · "sexta que vem" → `naSemanaQueVem`, que pula para a semana seguinte.
 *
 * A diferença entre esta e `naSemanaQueVem` só aparece quando o dia pedido NÃO
 * é hoje — e é justamente aí que ela importa: numa terça, "próxima sexta" é
 * 25/09 e "sexta que vem" é 02/10. Quando o dia pedido É hoje, as duas somam 7
 * e dão a mesma data.
 */
export function proximaSemContarHoje(p: ParedeDoUsuario, diaDaSemana: number): string {
  const alvo = ((Math.trunc(diaDaSemana) % 7) + 7) % 7
  const delta = (alvo - p.diaDaSemana + 7) % 7
  return diaSomado(p, delta === 0 ? 7 : delta)
}

/** "19/09" a partir de "2026-09-19" — como a resposta deve escrever a data. */
export function diaMesDaChave(chave: string): string {
  const [, m, d] = chave.split("-")
  return `${d}/${m}`
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
    ``,
    `DIA DA SEMANA → DATA. NUNCA calcule dia da semana nem some 7 de cabeça: a`,
    `lista abaixo já traz a EXPRESSÃO ao lado da data. Procure a frase que o`,
    `usuário escreveu e use a data que está com ela — as três expressões de um`,
    `mesmo dia não significam a mesma coisa.`,
    ...DIAS.map((nome, i) => {
      // Três expressões, três leituras. Dar a data "certa" sem dizer a QUAL
      // frase ela responde só move a decisão para o modelo, que é onde o erro
      // nasce: o relatório de 22/09 pegou "sexta que vem", numa terça, caindo
      // na sexta desta semana. E a versão seguinte quase criou o ponto cego
      // oposto, mandando "próxima sexta" para a semana seguinte — o "próxima
      // segunda" que passava no teste passava por coincidência, porque para
      // segunda, numa terça, as três leituras dão a mesma data.
      const curto = `${ARTIGO[i]} ${CURTOS[i]}`
      const proxima = `"${PROXIMO[i]} ${CURTOS[i]}"`
      const queVem = `"${CURTOS[i]} que vem"`
      const data = (chave: string) => `${chave} (${diaMesDaChave(chave)})`

      const aChegar = proximaOcorrencia(p, i)
      const semContarHoje = proximaSemContarHoje(p, i)
      const semanaSeguinte = naSemanaQueVem(p, i)

      if (aChegar === hoje) {
        // Hoje: "na terça" é hoje, e as outras duas vão para daqui a 7.
        return `- ${nome} = ${data(aChegar)} é HOJE ← "${curto}" · ${data(semanaSeguinte)} ← ${proxima}, ${queVem}`
      }
      if (semanaSeguinte === semContarHoje) {
        // O dia já cai na semana seguinte: as três dizem a mesma data.
        return `- ${nome} = ${data(aChegar)} ← "${curto}", ${proxima}, ${queVem} (as três)`
      }
      return `- ${nome} = ${data(semContarHoje)} ← "${curto}", ${proxima} · ${data(semanaSeguinte)} ← ${queVem}`
    }),
    ``,
    // Os 14 dias cabem numa linha só, e precisam caber: cada chamada à Neuro
    // reenvia este prompt inteiro, e o teto do provedor é de 8000 tokens por
    // MINUTO. Em lista, isto custava ~250 tokens — quase uma chamada a mais.
    `Os próximos dias: ` +
      Array.from({ length: 14 }, (_, i) => {
        const chave = diaSomado(p, i)
        return `${diaMesDaChave(chave)} ${DIAS[diaDaSemanaDaChave(chave)].slice(0, 3)}`
      }).join(" · "),
    ``,
    `Ao criar ou editar, escreva a data em ISO 8601 com este fuso (${fuso}).`,
    `Ao falar com o usuário, escreva a data como dd/mm (ex.: 21/09) — SEMPRE, e`,
    `nunca "na segunda" sozinho, que esconde a data trocada.`,
    `NÃO escreva o nome do dia da semana na sua frase. O app acrescenta o dia`,
    `certo, calculado aqui, embaixo da sua resposta; quando os dois discordam,`,
    `quem lê não sabe em qual acreditar — e já aconteceu ("segunda-feira, 10/10"`,
    `na sua frase e "sábado, 10/10" na do app, sendo 10/10 um sábado).`,
  ].join("\n")
}
