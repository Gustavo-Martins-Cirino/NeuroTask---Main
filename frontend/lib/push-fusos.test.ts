import { describe, it, expect } from "vitest"
import { FUSO_PADRAO_MIN, agruparPorFuso, paredeEm } from "./push-fusos"

// 25/08/2026, 02:20 UTC — de propósito depois da meia-noite em UTC e ainda
// ONTEM no Brasil, que é onde os dois fusos discordam da data.
const UTC_0220 = Date.UTC(2026, 7, 25, 2, 20)

describe("paredeEm", () => {
  it("lê a parede do Brasil (UTC−3), inclusive a virada do dia", () => {
    const p = paredeEm(UTC_0220, 180)
    expect(p.hm).toBe("23:20")
    expect(p.dataChave).toBe("2026-08-24")
  })

  it("lê a parede de UTC e a de um fuso à frente", () => {
    expect(paredeEm(UTC_0220, 0).hm).toBe("02:20")
    expect(paredeEm(UTC_0220, 0).dataChave).toBe("2026-08-25")
    // Berlim no verão é UTC+2 → offset negativo
    expect(paredeEm(UTC_0220, -120).hm).toBe("04:20")
  })

  it("hmAtras anda para trás dentro do dia", () => {
    expect(paredeEm(UTC_0220, 0).hmAtras(10)).toBe("02:10")
    expect(paredeEm(UTC_0220, 0).hmAtras(140)).toBe("00:00")
  })

  it("hmAtras NÃO atravessa a meia-noite — era o buraco dos 10 primeiros minutos", () => {
    // 00:05 em UTC: dez minutos atrás seria 23:55, e o intervalo [23:55, 00:05]
    // dentro da data de hoje não contém nada.
    const meiaNoiteE5 = Date.UTC(2026, 7, 25, 0, 5)
    const p = paredeEm(meiaNoiteE5, 0)
    expect(p.hm).toBe("00:05")
    expect(p.hmAtras(10)).toBe("00:00")
    expect(p.hmAtras(10) <= p.hm).toBe(true)
  })

  it("minutos negativos não empurram a janela para o futuro", () => {
    const p = paredeEm(UTC_0220, 0)
    expect(p.hmAtras(-30)).toBe("02:20")
  })
})

describe("agruparPorFuso", () => {
  it("junta os usuários por fuso, sem repetir quem tem dois aparelhos", () => {
    const g = agruparPorFuso([
      { user_id: "ana", tz_offset_min: 180 },
      { user_id: "ana", tz_offset_min: 180 },
      { user_id: "bruno", tz_offset_min: 180 },
      { user_id: "cadu", tz_offset_min: 0 },
    ])
    expect(g.get(180)).toEqual(["ana", "bruno"])
    expect(g.get(0)).toEqual(["cadu"])
  })

  it("inscrição antiga, sem fuso gravado, cai no padrão", () => {
    const g = agruparPorFuso([{ user_id: "ana", tz_offset_min: null }])
    expect(g.get(FUSO_PADRAO_MIN)).toEqual(["ana"])
  })

  it("quem viaja aparece nos dois fusos — a trava pushed resolve o resto", () => {
    const g = agruparPorFuso([
      { user_id: "ana", tz_offset_min: 180 },
      { user_id: "ana", tz_offset_min: -120 },
    ])
    expect(g.get(180)).toEqual(["ana"])
    expect(g.get(-120)).toEqual(["ana"])
  })

  it("ninguém inscrito, nenhum grupo — o dispatcher não consulta à toa", () => {
    expect(agruparPorFuso([]).size).toBe(0)
  })
})
