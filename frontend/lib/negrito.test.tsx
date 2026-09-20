import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { comNegrito, semNegrito } from "./negrito"

const html = (texto: string) => renderToStaticMarkup(<>{comNegrito(texto)}</>)

describe("comNegrito", () => {
  // A queixa literal do relatório.
  it("o que vinha com asteriscos vira negrito", () => {
    expect(html("Criei **[TESTE] T01 Academia** às 7h")).toBe(
      "Criei <strong>[TESTE] T01 Academia</strong> às 7h"
    )
  })

  it("texto sem marca nenhuma passa inteiro", () => {
    expect(html("Hoje você tem três blocos.")).toBe("Hoje você tem três blocos.")
  })

  it("vários negritos na mesma frase", () => {
    expect(html("**A** e **B**")).toBe("<strong>A</strong> e <strong>B</strong>")
  })

  // Marca sobrando acontece: o modelo corta a resposta, ou a revelação mostra
  // meia palavra. Texto certo sem negrito é melhor que asterisco na tela.
  it("marca ímpar não deixa asterisco à mostra", () => {
    expect(html("Criei **Academia")).toBe("Criei Academia")
  })

  it("marca colada e vazia não quebra", () => {
    expect(html("****")).toBe("")
    expect(html("**")).toBe("")
  })

  // O texto vem do MODELO, que repete o que a pessoa escreveu. Nada de HTML
  // por string: o React escapa, e é por isso que ele monta os nós.
  it("não deixa HTML de dentro do texto virar marcação", () => {
    expect(html("**<img src=x onerror=alert(1)>**")).toBe(
      "<strong>&lt;img src=x onerror=alert(1)&gt;</strong>"
    )
  })

  it("quebra de linha sobrevive, que é o que o whitespace-pre-wrap mostra", () => {
    expect(html("linha 1\n**linha 2**")).toBe("linha 1\n<strong>linha 2</strong>")
  })
})

describe("semNegrito", () => {
  it("tira as marcas e devolve string", () => {
    expect(semNegrito("Criei **X** agora")).toBe("Criei X agora")
    expect(semNegrito("sem marca")).toBe("sem marca")
  })
})
