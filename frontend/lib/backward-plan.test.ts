import { describe, it, expect } from "vitest"
import { planejarDeTrasPraFrente, type AtividadeRotina } from "./backward-plan"

// Esta é a lógica que mexe com o sono de alguém. Um erro de sinal aqui não dá
// tela vermelha: dá um alarme às 4h da manhã, silenciosamente errado. Por isso
// os testes conferem os HORÁRIOS calculados, não só o formato do resultado.

const emMinutos = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60_000)

// Âncora fixa: 10/07/2026 às 08:30 (hora local), 1h de duração.
const ancora = () => ({
  anchorTitle: "Faculdade",
  anchorStart: new Date(2026, 6, 10, 8, 30),
  anchorEnd: new Date(2026, 6, 10, 9, 30),
})

const ativ = (name: string, category: string, duration_minutes: number): AtividadeRotina => ({
  name,
  category,
  duration_minutes,
})

describe("planejarDeTrasPraFrente — a cadeia do dia", () => {
  it("encadeia os blocos sem buraco nem sobreposição", () => {
    const { plan } = planejarDeTrasPraFrente({ ...ancora(), atividades: [], sleepHours: 8 })
    expect(plan).toHaveLength(5)
    for (let i = 0; i < plan.length - 1; i++) {
      expect(plan[i].end.getTime()).toBe(plan[i + 1].start.getTime())
    }
  })

  it("termina exatamente na âncora", () => {
    const a = ancora()
    const { plan } = planejarDeTrasPraFrente({ ...a, atividades: [], sleepHours: 8 })
    const ultimo = plan[plan.length - 1]
    expect(ultimo.title).toBe("Faculdade")
    expect(ultimo.start.getTime()).toBe(a.anchorStart.getTime())
    expect(ultimo.end.getTime()).toBe(a.anchorEnd.getTime())
  })

  it("com os padrões, calcula acordar 95min antes (45 preparo + 20 refeição + 30 deslocamento)", () => {
    const a = ancora()
    const { wake } = planejarDeTrasPraFrente({ ...a, atividades: [], sleepHours: 8 })
    expect(emMinutos(wake, a.anchorStart)).toBe(95)
    expect(wake.getHours()).toBe(6)
    expect(wake.getMinutes()).toBe(55)
  })

  it("deitar = acordar menos as horas de sono desejadas", () => {
    const { wake, sleepStart } = planejarDeTrasPraFrente({ ...ancora(), atividades: [], sleepHours: 8 })
    expect(emMinutos(sleepStart, wake)).toBe(8 * 60)
    expect(sleepStart.getHours()).toBe(22) // 06:55 − 8h = 22:55 do dia anterior
    expect(sleepStart.getMinutes()).toBe(55)
    expect(sleepStart.getDate()).toBe(9)
  })

  it("dormir menos empurra a hora de deitar para mais tarde", () => {
    const seis = planejarDeTrasPraFrente({ ...ancora(), atividades: [], sleepHours: 6 })
    const nove = planejarDeTrasPraFrente({ ...ancora(), atividades: [], sleepHours: 9 })
    expect(seis.sleepStart.getTime()).toBeGreaterThan(nove.sleepStart.getTime())
    expect(emMinutos(seis.sleepStart, seis.wake)).toBe(360)
    expect(emMinutos(nove.sleepStart, nove.wake)).toBe(540)
  })

  it("sono fracionado (7,5h) é respeitado", () => {
    const { wake, sleepStart } = planejarDeTrasPraFrente({ ...ancora(), atividades: [], sleepHours: 7.5 })
    expect(emMinutos(sleepStart, wake)).toBe(450)
  })

  it("a ordem é dormir → preparo → refeição → deslocamento → âncora", () => {
    const { plan } = planejarDeTrasPraFrente({ ...ancora(), atividades: [], sleepHours: 8 })
    expect(plan.map((p) => p.title)).toEqual([
      "Dormir", "Se arrumar", "Café da manhã", "Deslocamento", "Faculdade",
    ])
  })
})

describe("planejarDeTrasPraFrente — escolha da atividade", () => {
  it("usa a rotina cadastrada no lugar dos padrões", () => {
    const a = ancora()
    const { plan, wake } = planejarDeTrasPraFrente({
      ...a,
      atividades: [ativ("Banho e roupa", "preparo", 20), ativ("Pão com café", "refeicao", 10), ativ("Ônibus", "deslocamento", 60)],
      sleepHours: 8,
    })
    expect(plan.map((p) => p.title)).toEqual(["Dormir", "Banho e roupa", "Pão com café", "Ônibus", "Faculdade"])
    expect(emMinutos(wake, a.anchorStart)).toBe(90)
  })

  it("casa a atividade pelo nome do compromisso (faculdade → Deslocamento → Faculdade)", () => {
    const { plan, notes } = planejarDeTrasPraFrente({
      ...ancora(),
      atividades: [
        ativ("Deslocamento → Trabalho", "deslocamento", 30),
        ativ("Deslocamento → Faculdade", "deslocamento", 75),
      ],
      sleepHours: 8,
    })
    expect(plan[3].title).toBe("Deslocamento → Faculdade")
    expect(emMinutos(plan[3].start, plan[3].end)).toBe(75)
    expect(notes).toHaveLength(0) // acertou sozinho, não precisa avisar
  })

  it("sem match claro, usa a primeira E avisa que havia outras", () => {
    const { plan, notes } = planejarDeTrasPraFrente({
      ...ancora(),
      atividades: [
        ativ("Deslocamento → Trabalho", "deslocamento", 30),
        ativ("Deslocamento → Academia", "deslocamento", 15),
      ],
      sleepHours: 8,
    })
    expect(plan[3].title).toBe("Deslocamento → Trabalho")
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain("Deslocamento → Academia")
  })

  it("com uma única atividade na categoria, não avisa nada", () => {
    const { notes } = planejarDeTrasPraFrente({
      ...ancora(),
      atividades: [ativ("Deslocamento → Trabalho", "deslocamento", 30)],
      sleepHours: 8,
    })
    expect(notes).toHaveLength(0)
  })

  it("palavras curtas do título não servem de match (evita casar por 'de'/'da')", () => {
    const { plan } = planejarDeTrasPraFrente({
      anchorTitle: "Ir de van",
      anchorStart: new Date(2026, 6, 10, 8, 30),
      anchorEnd: new Date(2026, 6, 10, 9, 30),
      atividades: [ativ("Carro", "deslocamento", 30), ativ("Van da empresa", "deslocamento", 90)],
      sleepHours: 8,
    })
    expect(plan[3].title).toBe("Carro") // primeira, não a que contém "van"
  })

  it("match ignora acento e maiúscula", () => {
    const { plan } = planejarDeTrasPraFrente({
      anchorTitle: "REUNIÃO importante",
      anchorStart: new Date(2026, 6, 10, 8, 30),
      anchorEnd: new Date(2026, 6, 10, 9, 30),
      atividades: [ativ("Preparo padrão", "preparo", 30), ativ("Preparo reuniao", "preparo", 50)],
      sleepHours: 8,
    })
    expect(plan[1].title).toBe("Preparo reuniao")
  })

  it("categoria ausente cai no padrão sem quebrar a cadeia", () => {
    const a = ancora()
    const { plan, wake } = planejarDeTrasPraFrente({
      ...a,
      atividades: [ativ("Ônibus", "deslocamento", 60)],
      sleepHours: 8,
    })
    expect(plan[1].title).toBe("Se arrumar")
    expect(plan[2].title).toBe("Café da manhã")
    expect(emMinutos(wake, a.anchorStart)).toBe(45 + 20 + 60)
  })
})

describe("planejarDeTrasPraFrente — bordas", () => {
  it("compromisso de madrugada joga o sono para o dia anterior, sem inverter nada", () => {
    const { plan, sleepStart, wake } = planejarDeTrasPraFrente({
      anchorTitle: "Voo",
      anchorStart: new Date(2026, 6, 10, 5, 0),
      anchorEnd: new Date(2026, 6, 10, 7, 0),
      atividades: [],
      sleepHours: 8,
    })
    expect(sleepStart.getTime()).toBeLessThan(wake.getTime())
    expect(sleepStart.getDate()).toBe(9)
    for (const p of plan) expect(p.end.getTime()).toBeGreaterThan(p.start.getTime())
  })

  it("atividades muito longas não invertem a ordem dos blocos", () => {
    const { plan } = planejarDeTrasPraFrente({
      ...ancora(),
      atividades: [ativ("Preparo lento", "preparo", 240), ativ("Trajeto longo", "deslocamento", 180)],
      sleepHours: 8,
    })
    for (const p of plan) expect(p.end.getTime()).toBeGreaterThan(p.start.getTime())
    for (let i = 0; i < plan.length - 1; i++) {
      expect(plan[i].start.getTime()).toBeLessThan(plan[i + 1].start.getTime())
    }
  })

  it("cada bloco tem cor própria (o calendário precisa distinguir)", () => {
    const { plan } = planejarDeTrasPraFrente({ ...ancora(), atividades: [], sleepHours: 8 })
    expect(new Set(plan.map((p) => p.color)).size).toBe(5)
  })
})
