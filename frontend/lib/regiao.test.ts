import { describe, it, expect } from "vitest"
import { REGIOES, REGIAO_DEFAULT, infoDaRegiao, regiaoDoFormato, formatoDaRegiao } from "./regiao"
import { formatHourMinute } from "./time-format"

describe("regiao ↔ formato de hora", () => {
  it("Brasil é 24h e Estados Unidos é AM/PM", () => {
    expect(formatoDaRegiao("BR")).toBe("24h")
    expect(formatoDaRegiao("US")).toBe("12h")
  })

  it("a volta é exata: derivar a região do formato e voltar dá o mesmo", () => {
    for (const r of REGIOES) {
      expect(regiaoDoFormato(formatoDaRegiao(r.value))).toBe(r.value)
    }
  })

  it("a região é DERIVADA do formato guardado, e é isso que dispensa storage próprio", () => {
    expect(regiaoDoFormato("24h")).toBe("BR")
    expect(regiaoDoFormato("12h")).toBe("US")
  })

  it("cada formato tem exatamente uma região — sem isso a derivação seria ambígua", () => {
    const formatos = REGIOES.map((r) => r.formato)
    expect(new Set(formatos).size).toBe(formatos.length)
  })
})

describe("infoDaRegiao", () => {
  it("devolve o nome que a pessoa entende, não o formato técnico", () => {
    expect(infoDaRegiao("BR").nome).toBe("Brasil")
    expect(infoDaRegiao("US").nome).toBe("Estados Unidos")
  })

  it("o exemplo mostrado é a MESMA hora nos dois formatos", () => {
    // 14:30 e 2:30 PM são o mesmo instante — se um dia divergirem, a tela passa
    // a sugerir que mudar de região muda a hora, e não muda: muda a escrita.
    for (const r of REGIOES) {
      expect(r.exemplo).toBe(formatHourMinute(14, 30, r.formato))
    }
  })

  it("região desconhecida cai na primeira em vez de quebrar a tela", () => {
    expect(infoDaRegiao("XX" as never).value).toBe(REGIAO_DEFAULT)
  })
})
