import { describe, it, expect } from "vitest"
import {
  recibo, quando, quantasGravou, quantasPediu, separaRecibo, reciboParaFala, falaDaResposta, MARCA_RECIBO,
  FERRAMENTAS_QUE_ESCREVEM, type AcaoExecutada,
} from "./ia-recibo"
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
  repeticao: { daily: "todo dia", weekly: "toda semana", weekdays: "dias úteis" },
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

  // O relatório de 20/09: "no aviso de conflito o emoji vem duplicado (⚠️ ⚠️)".
  it("aviso que já traz o próprio ⚠️ não ganha um segundo", () => {
    const texto = recibo(
      [criar("X", "2026-09-21T12:00:00Z", { ok: true, warning: "⚠️ conflita com Trabalho" })],
      BRASIL,
      TEXTOS,
      DIAS
    )!
    expect(texto).not.toContain("⚠️ ⚠️")
    expect(texto).toContain("⚠️ conflita com Trabalho")
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
    const texto = recibo(umSo, 180, { ...pt.ia.recibo, repeticao: pt.ia.agenda.repeticao }, pt.ia.recibo.diasDaSemana)!
    expect(texto).toContain("No calendário ficou assim:")
    expect(texto).toContain("criei")
    expect(texto).toContain("sábado, 03/10, 10:00")
  })

  it("em inglês também", () => {
    const texto = recibo(umSo, 180, { ...en.ia.recibo, repeticao: en.ia.agenda.repeticao }, en.ia.recibo.diasDaSemana)!
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

describe("o que o relatório de 21/09 pegou", () => {
  // R13: a frase dizia "não criei porque já existe" e logo abaixo aparecia
  // "✅ criei". `note` quer dizer NÃO FIZ — com `ok: true` e nada criado.
  it("duplicado recusado não vira ✅ criei", () => {
    const texto = recibo(
      [
        criar("[TESTE] R13 Unico", "2026-10-11T13:00:00Z", {
          ok: true,
          created: { id: "x" },
          note: 'Já existe um bloco igual/parecido ("[TESTE] R13 Unico") nesse período — não criei outro.',
        }),
      ],
      BRASIL,
      TEXTOS,
      DIAS
    )!
    expect(texto).not.toContain("✅")
    expect(texto).toContain("ℹ️")
    expect(texto).toContain("não criei outro")
  })

  // "toda terça" virava um bloco só, calado. Agora a regra vem no resultado e o
  // comprovante diz que repete.
  it("bloco recorrente diz que repete", () => {
    const texto = recibo(
      [criar("[TESTE] R18", "2026-09-22T01:00:00Z", { ok: true, recurrence_rule: "weekly" })],
      BRASIL,
      TEXTOS,
      DIAS
    )!
    expect(texto).toContain("(toda semana)")
  })

  it("bloco avulso não ganha rótulo de repetição", () => {
    const texto = recibo([criar("X", "2026-09-22T01:00:00Z", { ok: true, recurrence_rule: null })], BRASIL, TEXTOS, DIAS)!
    expect(texto).not.toContain("(")
  })

  // O pior caso do relatório: o laço criou 1 de 6 e caiu no teto de tokens. A
  // resposta tem de listar o que entrou E avisar que parou no meio — nunca
  // "não consegui criar nada".
  it("pedido interrompido lista o que entrou e avisa que faltou", () => {
    const texto = recibo([criar("[TESTE] R10a", "2026-10-10T13:00:00Z")], BRASIL, TEXTOS, DIAS, true)!
    expect(texto).toContain('"[TESTE] R10a"')
    expect(texto).toContain(TEXTOS.naoTerminei)
  })
})

describe("quantasGravou", () => {
  const acao = (nome: string, resultado: unknown): AcaoExecutada => ({ nome, args: { title: "X" }, resultado })

  it("conta só as ferramentas que escrevem", () => {
    expect(quantasGravou([
      acao("list_tasks", { ok: true }),
      acao("create_time_block", { ok: true }),
      acao("get_agenda", { ok: true }),
    ])).toBe(1)
  })

  // A prosa do rate limit diz o número ("salvei 2 itens") e a lista logo
  // abaixo é contada pelos olhos de quem lê. Falha e recusa deixam linha no
  // recibo, mas com outro símbolo — contá-las inflaria a promessa.
  it("falha e recusa de duplicata não contam como gravadas", () => {
    expect(quantasGravou([
      acao("create_time_block", { ok: true }),
      acao("create_time_block", { ok: false, error: "boom" }),
      acao("create_task", { ok: true, note: "já existe uma tarefa assim hoje" }),
    ])).toBe(1)
  })

  it("nenhuma escrita devolve zero, e não lança", () => {
    expect(quantasGravou([])).toBe(0)
    expect(quantasGravou([acao("create_task", null)])).toBe(1)
    expect(quantasGravou([acao("list_tasks", { ok: true })])).toBe(0)
  })

  // O número dito na prosa tem de bater com os ✅ da lista. Se as duas contas
  // saírem de regras diferentes, um dia discordam — e discordar é o defeito que
  // este módulo existe para evitar.
  it("o número bate com a quantidade de ✅ do recibo", () => {
    const acoes = [
      acao("create_time_block", { ok: true }),
      acao("create_time_block", { ok: false, error: "boom" }),
      acao("create_task", { ok: true, note: "já existe" }),
      acao("update_note", { ok: true }),
    ]
    const texto = recibo(acoes, 180, TEXTOS, DIAS)!
    const vistos = texto.split("\n").filter((l) => l.trimStart().startsWith("✅")).length
    expect(quantasGravou(acoes)).toBe(vistos)
  })
})

// O outro número da frase do limite: "2 DE 10". Um pedido de dez blocos chega
// numa chamada só (lib/ia-lote) e o servidor a abre em dez execuções — então o
// total pedido está aqui, e não na frase que o modelo escreveu.
describe("quantasPediu", () => {
  const acao = (nome: string, resultado: unknown): AcaoExecutada => ({ nome, args: { title: "X" }, resultado })

  it("conta a tentativa, tenha ela gravado ou não", () => {
    const acoes = [
      acao("create_time_block", { ok: true }),
      acao("create_time_block", { ok: true }),
      acao("create_time_block", { ok: false, error: "boom" }),
      acao("create_time_block", { ok: true, note: "já existe" }),
    ]
    expect(quantasPediu(acoes)).toBe(4)
    expect(quantasGravou(acoes)).toBe(2)
  })

  it("leitura não é pedido de escrita", () => {
    expect(quantasPediu([acao("list_tasks", { ok: true }), acao("list_time_blocks", { ok: true })])).toBe(0)
  })

  it("nunca é menor que o gravado", () => {
    const acoes = [acao("create_task", { ok: true }), acao("update_note", { ok: true })]
    expect(quantasPediu(acoes)).toBeGreaterThanOrEqual(quantasGravou(acoes))
  })
})

// O comprovante do servidor e o que o modelo achou de dizer não podem ter a
// mesma cara na tela — três relatórios seguidos concluíram que a prosa é a
// parte não confiável e o recibo acertou 100% das vezes. Para a tela dar peso
// diferente aos dois, eles precisam chegar separados.
describe("separaRecibo", () => {
  it("parte a resposta na marca, e tira o espaço das bordas", () => {
    const r = separaRecibo(`Criei aquele bloco.\n\n${MARCA_RECIBO}No calendário:\n✅ criei "V1"`)
    expect(r.prosa).toBe("Criei aquele bloco.")
    expect(r.recibo).toContain("No calendário:")
    expect(r.recibo).toContain("V1")
  })

  it("resposta sem recibo devolve a prosa inteira e recibo nulo", () => {
    const r = separaRecibo("Posso criar dia 28/09 das 08:00 às 08:30?")
    expect(r.prosa).toBe("Posso criar dia 28/09 das 08:00 às 08:30?")
    expect(r.recibo).toBeNull()
  })

  // O caso V2 do relatório: a prosa só perguntou "quer ajustar?" e o bloco
  // estava criado. Com os dois separados, a tela mostra o comprovante mesmo
  // quando a frase não o menciona.
  it("prosa que não fala da escrita não apaga o recibo", () => {
    const r = separaRecibo(`Choca com T06. Quer ajustar?${MARCA_RECIBO}✅ criei "V2"`)
    expect(r.prosa).toBe("Choca com T06. Quer ajustar?")
    expect(r.recibo).toContain("V2")
  })

  it("prosa vazia não vira recibo vazio nem quebra", () => {
    expect(separaRecibo(`${MARCA_RECIBO}✅ criei "X"`).prosa).toBe("")
    expect(separaRecibo(`texto${MARCA_RECIBO}   `).recibo).toBeNull()
    expect(separaRecibo("").recibo).toBeNull()
  })

  // A marca é byte de controle justamente para isto: não existe em texto que o
  // modelo escreva, então não há o que escapar nem falso positivo a temer.
  it("a marca não é caractere que alguém digite", () => {
    expect(MARCA_RECIBO).toHaveLength(1)
    expect(MARCA_RECIBO.charCodeAt(0)).toBeLessThan(32)
  })
})

// Na voz não há calendário para recarregar e conferir, e a fala é a resposta
// inteira: é o recibo que precisa ser dito, não o parágrafo do modelo.
describe("reciboParaFala", () => {
  const TITULO = "No calendário ficou assim:"

  it("tira marcadores, aspas e o cabeçalho — o que sobra é o que se fala", () => {
    const falado = reciboParaFala(`${TITULO}\n✅ criei "V1" — segunda-feira, 28/09, 08:00`, TITULO)
    expect(falado).toBe("criei V1 — segunda-feira, 28/09, 08:00")
    expect(falado).not.toContain("✅")
    expect(falado).not.toContain(TITULO)
  })

  it("junta várias linhas em frases, para o TTS respirar entre elas", () => {
    const falado = reciboParaFala(`${TITULO}\n✅ criei "A"\n✅ criei "B"`, TITULO)
    expect(falado).toBe("criei A. criei B")
  })

  // O aviso de conflito vem do tool result e mora no recibo: ele tem de ser
  // FALADO, porque na voz não há como conferir depois.
  it("o aviso de conflito sobrevive à fala", () => {
    const falado = reciboParaFala(`${TITULO}\n✅ criei "V2" — quarta, 23/09\n   ⚠️ choca com Estudo Java`, TITULO)
    expect(falado).toContain("choca com Estudo Java")
    expect(falado).not.toContain("⚠️")
  })

  it("sem recibo, não há nada a falar", () => {
    expect(reciboParaFala(null, TITULO)).toBe("")
    expect(reciboParaFala("", TITULO)).toBe("")
  })
})

// O relatório da rodada W leu o bundle e achou o buraco de falar SÓ o recibo:
// "criei o W1. Quer ajustar o horário?" ia para o áudio como "criei o W1" e
// silêncio. Na voz não há tela onde reler a pergunta — quem está falando fica
// esperando sem saber que é a vez dele.
describe("falaDaResposta", () => {
  const TITULO = TEXTOS.titulo
  const RECIBO = `${TITULO}\n✅ criou "W1" — segunda-feira, 28/09, 08:00`

  it("sem recibo, fala a prosa inteira — é a pergunta de confirmação", () => {
    expect(falaDaResposta(null, "Posso criar o bloco às 8h?", TITULO)).toBe("Posso criar o bloco às 8h?")
  })

  it("com recibo e prosa sem pergunta, fala só o recibo", () => {
    const fala = falaDaResposta(RECIBO, "Pronto, já deixei tudo organizado para você.", TITULO)
    expect(fala).toBe("criou W1 — segunda-feira, 28/09, 08:00")
    expect(fala).not.toContain("organizado")
  })

  it("a pergunta da prosa é falada; o resto dela não", () => {
    const fala = falaDaResposta(RECIBO, "Criei o bloco das 8h. Quer ajustar o horário?", TITULO)
    expect(fala).toContain("Quer ajustar o horário?")
    expect(fala).not.toContain("Criei o bloco das 8h.")
  })

  it("o recibo vem primeiro, e a pergunta depois", () => {
    const fala = falaDaResposta(RECIBO, "Quer ajustar?", TITULO)
    expect(fala.indexOf("criou W1")).toBeLessThan(fala.indexOf("Quer ajustar?"))
  })

  it("mais de uma pergunta, todas faladas", () => {
    const fala = falaDaResposta(RECIBO, "Criei. Quer ajustar? Ou prefiro deixar assim?", TITULO)
    expect(fala).toContain("Quer ajustar?")
    expect(fala).toContain("Ou prefiro deixar assim?")
  })

  // O aviso de conflito e o de horário no passado vêm do `warning` do tool
  // result — já estão no recibo, então já eram falados. Este teste existe para
  // não se perderem se alguém simplificar a função.
  it("o aviso do recibo continua sendo falado", () => {
    const comAviso = `${RECIBO}\n   ⚠️ Esse horário já passou — criei no dia que você pediu mesmo assim.`
    expect(falaDaResposta(comAviso, "", TITULO)).toContain("Esse horário já passou")
  })

  it("prosa com ? mas sem frase que se isole cai na prosa inteira", () => {
    const fala = falaDaResposta(RECIBO, "e agora?", TITULO)
    expect(fala).toContain("e agora?")
  })

  it("prosa vazia não vira ponto solto no fim da fala", () => {
    expect(falaDaResposta(RECIBO, "", TITULO)).toBe("criou W1 — segunda-feira, 28/09, 08:00")
  })
})
