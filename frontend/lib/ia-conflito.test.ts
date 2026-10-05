import { describe, expect, it } from "vitest"
import { FOLGA_DE_DUPLICATA_MS, conflitoDoBloco, duplicataNaAgenda, janelaDoConflito } from "./ia-conflito"
import { ocorrenciasNaJanela, type BlocoDaAgenda } from "./ia-agenda"

// Brasil, UTC−3: o getTimezoneOffset() é +180.
const BR = 180
/** Um instante na parede de São Paulo. */
const sp = (iso: string) => Date.parse(`${iso}-03:00`)

/** O que a rota faz: lê a vizinhança, expande e pergunta. */
function checa(inicio: number, fim: number, blocos: BlocoDaAgenda[], ignorar: string | null = null) {
  const { de, ate } = janelaDoConflito(inicio, fim)
  return conflitoDoBloco(inicio, fim, ocorrenciasNaJanela(blocos, de, ate, BR), ignorar)
}

const bloco = (id: string, title: string, ini: string, fim: string, regra?: string): BlocoDaAgenda => ({
  id,
  title,
  start_time: new Date(sp(ini)).toISOString(),
  end_time: new Date(sp(fim)).toISOString(),
  is_recurring: !!regra,
  recurrence_rule: regra ?? null,
})

describe("conflitoDoBloco", () => {
  it("o furo das 21h: o vizinho que já era 'amanhã' em UTC agora é visto", () => {
    // 20:30–21:30 contra 21:00–22:00, numa terça. Em UTC, o segundo começa à
    // 00:00 do dia seguinte — a consulta antiga, presa ao dia UTC, não o lia.
    const academia = bloco("a", "Academia", "2026-10-06T21:00:00", "2026-10-06T22:00:00")
    expect(checa(sp("2026-10-06T20:30:00"), sp("2026-10-06T21:30:00"), [academia])).toEqual({ tipo: "choque", titulo: "Academia" })
  })

  it("o recorrente de toda semana choca na quarta de hoje, mesmo tendo nascido meses atrás", () => {
    const jiu = bloco("j", "Jiu Jitsu", "2026-06-03T19:00:00", "2026-06-03T20:30:00", "weekly") // uma quarta
    expect(checa(sp("2026-10-07T20:00:00"), sp("2026-10-07T21:00:00"), [jiu])).toEqual({ tipo: "choque", titulo: "Jiu Jitsu" })
  })

  it("o recorrente não choca no dia em que não vale", () => {
    const jiu = bloco("j", "Jiu Jitsu", "2026-06-03T19:00:00", "2026-06-03T20:30:00", "weekly")
    expect(checa(sp("2026-10-08T19:00:00"), sp("2026-10-08T20:00:00"), [jiu])).toBeNull()
  })

  it("o bloco que atravessa a meia-noite choca com o de depois dela", () => {
    const plantao = bloco("p", "Plantão", "2026-10-06T23:00:00", "2026-10-07T01:00:00")
    expect(checa(sp("2026-10-07T00:30:00"), sp("2026-10-07T01:30:00"), [plantao])).toEqual({ tipo: "choque", titulo: "Plantão" })
  })

  it("menos de 15 min de vão é colado; 15 em ponto ainda é", () => {
    const aula = bloco("a", "Aula", "2026-10-06T10:00:00", "2026-10-06T11:00:00")
    expect(checa(sp("2026-10-06T11:10:00"), sp("2026-10-06T12:00:00"), [aula])).toEqual({ tipo: "colado", titulo: "Aula" })
    expect(checa(sp("2026-10-06T11:15:00"), sp("2026-10-06T12:00:00"), [aula])?.tipo).toBe("colado")
    expect(checa(sp("2026-10-06T11:16:00"), sp("2026-10-06T12:00:00"), [aula])).toBeNull()
  })

  it("vale igual para o vizinho de DEPOIS, com 15 min em ponto", () => {
    const aula = bloco("a", "Aula", "2026-10-06T12:15:00", "2026-10-06T13:00:00")
    expect(checa(sp("2026-10-06T11:00:00"), sp("2026-10-06T12:00:00"), [aula])?.tipo).toBe("colado")
  })

  it("encostado (um termina, o outro começa) é colado, não choque", () => {
    const aula = bloco("a", "Aula", "2026-10-06T10:00:00", "2026-10-06T11:00:00")
    expect(checa(sp("2026-10-06T11:00:00"), sp("2026-10-06T12:00:00"), [aula])?.tipo).toBe("colado")
  })

  it("choque vence colado, mesmo vindo depois na agenda", () => {
    const cafe = bloco("c", "Café", "2026-10-06T08:50:00", "2026-10-06T09:00:00")
    const reuniao = bloco("r", "Reunião", "2026-10-06T09:30:00", "2026-10-06T10:30:00")
    expect(checa(sp("2026-10-06T09:05:00"), sp("2026-10-06T10:00:00"), [cafe, reuniao])).toEqual({ tipo: "choque", titulo: "Reunião" })
  })

  it("o próprio bloco, recém-gravado, não choca consigo", () => {
    const eu = bloco("eu", "Estudar", "2026-10-06T14:00:00", "2026-10-06T15:00:00")
    expect(checa(sp("2026-10-06T14:00:00"), sp("2026-10-06T15:00:00"), [eu], "eu")).toBeNull()
  })

  it("intervalo torto não inventa aviso", () => {
    expect(conflitoDoBloco(10, 5, [], null)).toBeNull()
    expect(conflitoDoBloco(Number.NaN, 5, [], null)).toBeNull()
  })
})

describe("duplicataNaAgenda", () => {
  /** O que a rota faz para o anti-duplicata: vizinhança de 45 min. */
  function dup(titulo: string, inicio: number, fim: number, blocos: BlocoDaAgenda[]) {
    const { de, ate } = janelaDoConflito(inicio, fim, FOLGA_DE_DUPLICATA_MS)
    return duplicataNaAgenda(inicio, fim, titulo, ocorrenciasNaJanela(blocos, de, ate, BR))
  }

  it("o mesmo furo das 21h: 'Estudar' às 21:10 vê o 'Estudar' das 20:30", () => {
    const estudar = bloco("e", "Estudar", "2026-10-06T20:30:00", "2026-10-06T21:00:00")
    expect(dup("Estudar", sp("2026-10-06T21:10:00"), sp("2026-10-06T22:00:00"), [estudar])?.id).toBe("e")
  })

  it("pedir de novo o recorrente, no dia em que ele vale, é duplicata", () => {
    const jiu = bloco("j", "Jiu Jitsu", "2026-06-03T19:00:00", "2026-06-03T20:30:00", "weekly")
    expect(dup("jiu jitsu", sp("2026-10-07T19:00:00"), sp("2026-10-07T20:30:00"), [jiu])?.id).toBe("j")
  })

  it("mesmo título longe no dia não é duplicata: estudar de manhã e de noite", () => {
    const estudar = bloco("e", "Estudar", "2026-10-06T08:00:00", "2026-10-06T09:00:00")
    expect(dup("Estudar", sp("2026-10-06T20:00:00"), sp("2026-10-06T21:00:00"), [estudar])).toBeNull()
  })

  it("título diferente no mesmo horário não é duplicata — isso é conflito", () => {
    const aula = bloco("a", "Aula", "2026-10-06T10:00:00", "2026-10-06T11:00:00")
    expect(dup("Reunião", sp("2026-10-06T10:00:00"), sp("2026-10-06T11:00:00"), [aula])).toBeNull()
  })
})
