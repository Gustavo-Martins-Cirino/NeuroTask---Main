import { describe, expect, it } from "vitest"
import { VALIDADE_DEPOIS_DO_FIM, restauraSessao, serializaSessao, type SessaoFoco } from "./foco-sessao"

const base: SessaoFoco = { duracao: 25 * 60, restante: 25 * 60, fimEm: null, tarefa: null, minimizado: false, ambiente: 0 }
const AMB = 10

describe("restauraSessao", () => {
  it("sem nada guardado, nada volta", () => {
    expect(restauraSessao(null, 0, AMB)).toBeNull()
    expect(restauraSessao("", 0, AMB)).toBeNull()
  })

  it("JSON quebrado não derruba: só não volta", () => {
    expect(restauraSessao("{nao é json", 0, AMB)).toBeNull()
  })

  it("rodando: volta rodando, com o tempo que passou descontado", () => {
    const s = serializaSessao({ ...base, fimEm: 100_000 + 10 * 60_000 })
    const r = restauraSessao(s, 100_000 + 4 * 60_000, AMB)
    expect(r).toMatchObject({ rodando: true, terminouFora: false, restante: 6 * 60 })
  })

  it("o fim passou enquanto a página estava fora: volta zerada e avisa", () => {
    const s = serializaSessao({ ...base, fimEm: 50_000 })
    expect(restauraSessao(s, 50_000 + 5 * 60_000, AMB)).toMatchObject({ rodando: false, terminouFora: true, restante: 0, fimEm: null })
  })

  it("um foco de ontem não reaparece", () => {
    const s = serializaSessao({ ...base, fimEm: 50_000 })
    expect(restauraSessao(s, 50_000 + VALIDADE_DEPOIS_DO_FIM + 1, AMB)).toBeNull()
  })

  it("pausada: volta pausada, no mesmo ponto", () => {
    const s = serializaSessao({ ...base, restante: 600 })
    expect(restauraSessao(s, 999_999_999, AMB)).toMatchObject({ rodando: false, terminouFora: false, restante: 600 })
  })

  it("leva junto a tarefa, o ambiente e o minimizado", () => {
    const tarefa = { id: "t1", title: "Estudar" } as SessaoFoco["tarefa"]
    const s = serializaSessao({ ...base, tarefa, ambiente: 3, minimizado: true })
    expect(restauraSessao(s, 0, AMB)).toMatchObject({ tarefa: { id: "t1", title: "Estudar" }, ambiente: 3, minimizado: true })
  })

  it("ambiente que não existe mais cai no primeiro", () => {
    expect(restauraSessao(serializaSessao({ ...base, ambiente: 42 }), 0, AMB)?.ambiente).toBe(0)
  })

  it("números fora da faixa não voltam", () => {
    expect(restauraSessao(serializaSessao({ ...base, duracao: -5 }), 0, AMB)).toBeNull()
    expect(restauraSessao(serializaSessao({ ...base, restante: base.duracao + 1 }), 0, AMB)).toBeNull()
    expect(restauraSessao(JSON.stringify({ ...base, fimEm: "amanhã" }), 0, AMB)).toBeNull()
  })
})
