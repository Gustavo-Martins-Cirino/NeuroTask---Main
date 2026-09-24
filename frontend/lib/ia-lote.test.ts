import { describe, it, expect } from "vitest"
import { blocosDoLote, CRIAR_BLOCOS_EM_LOTE } from "@/lib/ia-lote"

const bloco = (title: string) => ({
  title,
  start_time: "2026-09-28T08:00:00-03:00",
  end_time: "2026-09-28T09:00:00-03:00",
})

describe("blocosDoLote", () => {
  it("o total pedido é o tamanho do array — é daqui que sai o '2 de 10'", () => {
    const dez = Array.from({ length: 10 }, (_, i) => bloco(`V${i + 1}`))
    expect(blocosDoLote({ blocos: dez })).toHaveLength(10)
  })

  it("sem array, não é lote", () => {
    expect(blocosDoLote({})).toEqual([])
    expect(blocosDoLote({ blocos: "V1, V2" })).toEqual([])
  })

  it("descarta o item sem título ou sem horário em vez de inventar", () => {
    const lote = blocosDoLote({
      blocos: [bloco("V1"), { title: "V2" }, { start_time: "x", end_time: "y" }, { title: " ", start_time: "a", end_time: "b" }],
    })
    expect(lote).toHaveLength(1)
    expect(lote[0].title).toBe("V1")
  })

  it("passa adiante só os campos que create_time_block conhece", () => {
    const [b] = blocosDoLote({
      blocos: [{ ...bloco("V1"), color: "#6366f1", recurrence_rule: "weekly", user_id: "outro" }],
    })
    expect(b.color).toBe("#6366f1")
    expect(b.recurrence_rule).toBe("weekly")
    expect(b).not.toHaveProperty("user_id")
  })

  it("o nome da ferramenta é o mesmo que a rota anuncia", () => {
    expect(CRIAR_BLOCOS_EM_LOTE).toBe("create_time_blocks")
  })
})
