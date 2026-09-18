import { describe, it, expect } from "vitest"
import { instrucaoDeIdioma, pedeConfirmacao, pedidoDeResumo, RESPOSTA_CURTA } from "./ia-idioma"

describe("instrucaoDeIdioma", () => {
  it("a instrução vem escrita no idioma que ela pede", () => {
    expect(instrucaoDeIdioma("en")).toMatch(/Always answer in English/)
    expect(instrucaoDeIdioma("pt")).toMatch(/português do Brasil/)
  })

  // O erro que esta frase existe para impedir: "list my tasks" devolvendo
  // "Buy bread" para quem escreveu "Comprar pão".
  it("em inglês, manda NÃO traduzir o que a pessoa escreveu", () => {
    expect(instrucaoDeIdioma("en")).toMatch(/[Nn]ever translate what the person wrote/)
  })
})

describe("pedeConfirmacao", () => {
  it("reconhece o pedido em português", () => {
    expect(pedeConfirmacao("Crio a tarefa às 9h. Posso confirmar?")).toBe(true)
    expect(pedeConfirmacao("Quer que eu confirme? Confirma?")).toBe(true)
  })

  it("reconhece o pedido em inglês", () => {
    expect(pedeConfirmacao("I'll create it at 9am. Can I confirm?")).toBe(true)
    expect(pedeConfirmacao("Shall I confirm?")).toBe(true)
  })

  // Os dois idiomas valem sempre: o modelo às vezes responde na língua da
  // última mensagem, e botão que não aparece é pior que botão sobrando.
  it("não depende do idioma da interface", () => {
    expect(pedeConfirmacao("Posso confirmar?")).toBe(pedeConfirmacao("Can I confirm?"))
  })

  it("conversa comum não faz o botão aparecer", () => {
    expect(pedeConfirmacao("Hoje você tem três tarefas.")).toBe(false)
    expect(pedeConfirmacao("You have three tasks today.")).toBe(false)
    // "confirmado" não é pergunta: o pedido já passou.
    expect(pedeConfirmacao("Tarefa confirmada e criada.")).toBe(false)
  })
})

describe("RESPOSTA_CURTA", () => {
  it("cada idioma responde com a própria palavra", () => {
    expect(RESPOSTA_CURTA.pt).toEqual({ sim: "sim", nao: "não" })
    expect(RESPOSTA_CURTA.en).toEqual({ sim: "yes", nao: "no" })
  })
})

describe("pedidoDeResumo", () => {
  // Isto entra no histórico como fala do USUÁRIO, e o modelo tende a responder
  // na língua da última fala: em português, puxaria de volta uma conversa que
  // estava em inglês.
  it("fala o idioma da conversa", () => {
    expect(pedidoDeResumo("en")).toMatch(/^Summarize for me/)
    expect(pedidoDeResumo("pt")).toMatch(/^Resuma para mim/)
  })

  it("nos dois idiomas, proíbe chamar mais ferramentas", () => {
    expect(pedidoDeResumo("en")).toMatch(/[Dd]o not call any more tools/)
    expect(pedidoDeResumo("pt")).toMatch(/[Nn]ão chame mais ferramentas/)
  })
})
