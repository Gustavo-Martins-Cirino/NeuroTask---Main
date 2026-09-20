import { describe, it, expect } from "vitest"
import { recibo, quando, FERRAMENTAS_QUE_ESCREVEM, type AcaoExecutada } from "./ia-recibo"
import { pt, en } from "./i18n"

const BRASIL = 180
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
const TEXTOS = {
  titulo: "O que ficou salvo de verdade:",
  naoTerminei: "Parei no meio: pode ter sobrado coisa do seu pedido.",
  criou: "criei",
  atualizou: "atualizei",
  excluiu: "excluí",
  falhou: "não consegui",
}

const criar = (title: string, start_time: string, resultado: unknown = { ok: true }): AcaoExecutada => ({
  nome: "create_time_block",
  args: { title, start_time },
  resultado,
})

describe("quando", () => {
  it("escreve dia da semana, data e hora na parede de quem usa", () => {
    // 21/09/2026 às 09:00 no Brasil = 12:00Z.
    expect(quando("2026-09-21T12:00:00Z", BRASIL, DIAS)).toBe("segunda-feira, 21/09, 09:00")
  })

  it("o fuso é aplicado, e não ignorado — era o bug 4 do relatório", () => {
    // Bloco das 07:00 no Brasil; sem converter, sairia "10:00".
    expect(quando("2026-09-21T10:00:00Z", BRASIL, DIAS)).toContain("07:00")
  })

  it("data que não dá para ler não vira 'Invalid Date' na tela", () => {
    expect(quando("nada disso", BRASIL, DIAS)).toBeNull()
    expect(quando(undefined, BRASIL, DIAS)).toBeNull()
    expect(quando("", BRASIL, DIAS)).toBeNull()
  })
})

describe("recibo", () => {
  // O caso T49: pediu 6, o modelo disse 6, só 1 existe. O recibo lista 1.
  it("lista o que existe, não o que foi prometido", () => {
    const texto = recibo([criar("[TESTE] T49a", "2026-10-03T13:00:00Z")], BRASIL, TEXTOS, DIAS)!
    expect(texto).toContain("O que ficou salvo de verdade:")
    expect(texto).toContain('"[TESTE] T49a"')
    expect(texto.split("\n").filter((l) => l.startsWith("✅"))).toHaveLength(1)
  })

  it("cinco pedidos com quatro sucessos mostram quatro linhas", () => {
    const acoes = ["a", "b", "c", "d"].map((n, i) => criar(`T16${n}`, `2026-09-22T1${i}:00:00Z`))
    const texto = recibo(acoes, BRASIL, TEXTOS, DIAS)!
    expect(texto.split("\n").filter((l) => l.startsWith("✅"))).toHaveLength(4)
  })

  // O caso T47: a resposta deu a entender que não criou, e tinha criado.
  it("aviso de conflito não esconde que o bloco foi salvo", () => {
    const texto = recibo(
      [criar("[TESTE] T47", "2026-09-20T23:00:00Z", { ok: true, warning: "conflita com [TESTE] T46" })],
      BRASIL,
      TEXTOS,
      DIAS
    )!
    expect(texto).toContain("criei")
    expect(texto).toContain("conflita com")
  })

  it("ferramenta que falhou aparece como falha, não como sucesso", () => {
    const texto = recibo([criar("X", "2026-09-21T12:00:00Z", { ok: false, error: "sem permissão" })], BRASIL, TEXTOS, DIAS)!
    expect(texto).toContain("não consegui")
    expect(texto).toContain("sem permissão")
    expect(texto).not.toContain("✅")
  })

  // Resposta que só leu a agenda não ganha comprovante — recibo em tudo é ruído.
  it("sem nenhuma escrita, não há recibo", () => {
    const leitura: AcaoExecutada = { nome: "list_time_blocks", args: {}, resultado: { ok: true } }
    expect(recibo([leitura], BRASIL, TEXTOS, DIAS)).toBeNull()
    expect(recibo([], BRASIL, TEXTOS, DIAS)).toBeNull()
  })

  // O relatório: "se o loop chegar no limite, avisar o usuário".
  it("laço estourado avisa, com ou sem escrita", () => {
    expect(recibo([], BRASIL, TEXTOS, DIAS, true)).toBe(TEXTOS.naoTerminei)
    const comEscrita = recibo([criar("X", "2026-09-21T12:00:00Z")], BRASIL, TEXTOS, DIAS, true)!
    expect(comEscrita).toContain(TEXTOS.naoTerminei)
    expect(comEscrita).toContain("✅")
  })

  it("cada verbo é o da ação, não 'criei' para tudo", () => {
    const acoes: AcaoExecutada[] = [
      { nome: "delete_time_block", args: {}, resultado: { ok: true } },
      { nome: "update_task", args: { title: "X" }, resultado: { ok: true } },
    ]
    const texto = recibo(acoes, BRASIL, TEXTOS, DIAS)!
    expect(texto).toContain("excluí")
    expect(texto).toContain("atualizei")
  })

  it("o plano reverso diz quantos blocos criou", () => {
    const texto = recibo(
      [{ nome: "plan_day_backwards", args: {}, resultado: { ok: true, created: 4 } }],
      BRASIL,
      TEXTOS,
      DIAS
    )!
    expect(texto).toContain("(4)")
  })

  it("listar e consultar ficam de fora do conjunto que escreve", () => {
    expect(FERRAMENTAS_QUE_ESCREVEM.has("list_time_blocks")).toBe(false)
    expect(FERRAMENTAS_QUE_ESCREVEM.has("list_tasks")).toBe(false)
    expect(FERRAMENTAS_QUE_ESCREVEM.has("create_time_block")).toBe(true)
  })
})

describe("o recibo com os textos de verdade", () => {
  // O caso T49 do relatório, montado com o dicionário real: o modelo disse seis,
  // só um existe, e é o recibo que conta a verdade.
  const umSo: AcaoExecutada[] = [
    { nome: "create_time_block", args: { title: "[TESTE] T49a", start_time: "2026-10-03T13:00:00Z" }, resultado: { ok: true } },
  ]

  it("em português, sai legível e com o dia da semana", () => {
    const texto = recibo(umSo, 180, pt.ia.recibo, pt.ia.recibo.diasDaSemana)!
    expect(texto).toContain("No calendário ficou assim:")
    expect(texto).toContain("criei")
    expect(texto).toContain("sábado, 03/10, 10:00")
  })

  it("em inglês também", () => {
    const texto = recibo(umSo, 180, en.ia.recibo, en.ia.recibo.diasDaSemana)!
    expect(texto).toContain("created")
    expect(texto).toContain("Saturday, 03/10, 10:00")
  })

  it("os dois idiomas dizem coisas diferentes", () => {
    expect(en.ia.recibo.titulo).not.toBe(pt.ia.recibo.titulo)
    expect(en.ia.recibo.naoTerminei).not.toBe(pt.ia.recibo.naoTerminei)
  })

  it("são sete dias, domingo primeiro, nos dois idiomas", () => {
    for (const [nome, d] of [["pt", pt], ["en", en]] as const) {
      expect(d.ia.recibo.diasDaSemana, nome).toHaveLength(7)
    }
    expect(pt.ia.recibo.diasDaSemana[0]).toBe("domingo")
    expect(en.ia.recibo.diasDaSemana[0]).toBe("Sunday")
  })
})
