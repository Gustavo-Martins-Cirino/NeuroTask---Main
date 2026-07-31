import { describe, it, expect } from "vitest"
import { computeSuggestions, type BlocoBruto, type CheckinBruto } from "./routine-insights"
import type { RoutineActivity } from "./routine"

// A rotina aprendida SUGERE — quem decide é o usuário. Por isso o erro caro
// aqui é sugerir demais: sugestão errada ensina a pessoa a ignorar o aviso,
// e aí a sugestão boa também passa batido. Os limiares (3 dias distintos,
// 3 amostras, desvio ≥ 10 min) existem para isso e são o que estes testes
// protegem.

// Datas locais: o agrupamento por dia usa getFullYear/getMonth/getDate.
const bloco = (title: string, dia: number, hIni: number, minDur: number): BlocoBruto => {
  const start = new Date(2026, 6, dia, hIni, 0)
  return {
    title,
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + minDur * 60_000).toISOString(),
  }
}

const atividade = (id: string, name: string, duration_minutes: number): RoutineActivity => ({
  id,
  name,
  category: "outro",
  duration_minutes,
})

const checkin = (title: string, actual_minutes: number): CheckinBruto => ({ title, actual_minutes })

describe("computeSuggestions — novas atividades", () => {
  it("sugere quando o mesmo título aparece em 3 dias distintos", () => {
    const s = computeSuggestions(
      [bloco("Academia", 1, 7, 60), bloco("Academia", 2, 7, 60), bloco("Academia", 3, 7, 60)],
      [], []
    )
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ kind: "new", title: "Academia", minutes: 60, days: 3 })
  })

  it("NÃO sugere com apenas 2 dias — o limiar é 3", () => {
    const s = computeSuggestions([bloco("Academia", 1, 7, 60), bloco("Academia", 2, 7, 60)], [], [])
    expect(s).toHaveLength(0)
  })

  it("três blocos no MESMO dia não valem três dias", () => {
    const s = computeSuggestions(
      [bloco("Academia", 1, 7, 60), bloco("Academia", 1, 12, 60), bloco("Academia", 1, 18, 60)],
      [], []
    )
    expect(s).toHaveLength(0)
  })

  it("ignora sono (não é atividade de rotina a sugerir)", () => {
    const s = computeSuggestions(
      [bloco("Dormir", 1, 23, 60), bloco("Dormir", 2, 23, 60), bloco("Dormir", 3, 23, 60)],
      [], []
    )
    expect(s).toHaveLength(0)
  })

  it("agrupa ignorando acento e caixa", () => {
    const s = computeSuggestions(
      [bloco("Almoço", 1, 12, 45), bloco("almoco", 2, 12, 45), bloco("ALMOÇO", 3, 12, 45)],
      [], []
    )
    expect(s).toHaveLength(1)
    expect(s[0].kind === "new" && s[0].days).toBe(3)
  })

  it("não sugere o que a pessoa já cadastrou", () => {
    const s = computeSuggestions(
      [bloco("Academia", 1, 7, 60), bloco("Academia", 2, 7, 60), bloco("Academia", 3, 7, 60)],
      [],
      [atividade("a1", "Academia", 60)]
    )
    expect(s).toHaveLength(0)
  })

  it("respeita sugestão dispensada", () => {
    const blocos = [bloco("Academia", 1, 7, 60), bloco("Academia", 2, 7, 60), bloco("Academia", 3, 7, 60)]
    const s = computeSuggestions(blocos, [], [], new Set(["new-academia"]))
    expect(s).toHaveLength(0)
  })

  it("descarta bloco longo demais para ser rotina (> 4h)", () => {
    const s = computeSuggestions(
      [bloco("Estudar", 1, 8, 300), bloco("Estudar", 2, 8, 300), bloco("Estudar", 3, 8, 300)],
      [], []
    )
    expect(s).toHaveLength(0)
  })

  it("usa a MEDIANA, então um dia fora da curva não distorce", () => {
    const s = computeSuggestions(
      [bloco("Corrida", 1, 7, 30), bloco("Corrida", 2, 7, 30), bloco("Corrida", 3, 7, 180)],
      [], []
    )
    expect(s[0].kind === "new" && s[0].minutes).toBe(30)
  })

  it("arredonda a duração para múltiplo de 5", () => {
    const s = computeSuggestions(
      [bloco("Leitura", 1, 20, 23), bloco("Leitura", 2, 20, 23), bloco("Leitura", 3, 20, 23)],
      [], []
    )
    expect(s[0].kind === "new" && s[0].minutes).toBe(25)
  })

  it("adivinha a categoria pelo título", () => {
    const categoriaDe = (titulo: string) => {
      const s = computeSuggestions(
        [bloco(titulo, 1, 8, 30), bloco(titulo, 2, 8, 30), bloco(titulo, 3, 8, 30)],
        [], []
      )
      return s[0]?.kind === "new" ? s[0].category : null
    }
    expect(categoriaDe("Deslocamento para o trabalho")).toBe("deslocamento")
    expect(categoriaDe("Almoço")).toBe("refeicao")
    expect(categoriaDe("Tomar banho")).toBe("preparo")
    expect(categoriaDe("Reunião de time")).toBe("outro")
  })
})

describe("computeSuggestions — ajuste de duração", () => {
  const tresCheckins = [checkin("Se arrumar", 45), checkin("Se arrumar", 45), checkin("Se arrumar", 45)]

  it("sugere ajuste quando os check-ins divergem do cadastrado", () => {
    const s = computeSuggestions([], tresCheckins, [atividade("a1", "Se arrumar", 20)])
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ kind: "adjust", activityId: "a1", from: 20, to: 45, samples: 3 })
  })

  it("NÃO sugere com menos de 3 amostras", () => {
    const s = computeSuggestions([], tresCheckins.slice(0, 2), [atividade("a1", "Se arrumar", 20)])
    expect(s).toHaveLength(0)
  })

  it("NÃO sugere quando a diferença é pequena (< 10 min)", () => {
    const s = computeSuggestions([], tresCheckins, [atividade("a1", "Se arrumar", 40)])
    expect(s).toHaveLength(0)
  })

  it("sugere reduzir quando a pessoa leva menos do que estimou", () => {
    const s = computeSuggestions(
      [], [checkin("Café", 10), checkin("Café", 10), checkin("Café", 10)],
      [atividade("a1", "Café", 40)]
    )
    expect(s[0]).toMatchObject({ kind: "adjust", from: 40, to: 10 })
  })

  it("casa títulos parecidos (um contém o outro)", () => {
    const s = computeSuggestions(
      [],
      [checkin("Deslocamento trabalho", 50), checkin("Deslocamento trabalho", 50), checkin("Deslocamento trabalho", 50)],
      [atividade("a1", "Deslocamento", 20)]
    )
    expect(s).toHaveLength(1)
    expect(s[0].kind === "adjust" && s[0].to).toBe(50)
  })

  it("respeita ajuste dispensado", () => {
    const s = computeSuggestions([], tresCheckins, [atividade("a1", "Se arrumar", 20)], new Set(["adjust-a1-45"]))
    expect(s).toHaveLength(0)
  })
})

describe("computeSuggestions — volume", () => {
  it("nunca devolve mais de 4 sugestões (não vira enxurrada)", () => {
    const blocos: BlocoBruto[] = []
    for (const nome of ["Alfa", "Beta", "Gama", "Delta", "Epsilon", "Zeta"]) {
      for (const dia of [1, 2, 3]) blocos.push(bloco(nome, dia, 9, 30))
    }
    expect(computeSuggestions(blocos, [], [])).toHaveLength(4)
  })

  it("sem dados, sem sugestão", () => {
    expect(computeSuggestions([], [], [])).toHaveLength(0)
  })
})
