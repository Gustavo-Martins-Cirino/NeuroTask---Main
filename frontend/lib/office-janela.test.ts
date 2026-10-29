import { describe, expect, it } from "vitest"
import { FLUTUA_COM_TOPO_ESCONDIDO, VOLTA_COM_TOPO_ESCONDIDO, salaFlutua } from "./office-janela"

const CABECALHO = 64
const ALTURA = 770 // a sala num notebook 1366×768

describe("sala flutuante do Escritório", () => {
  it("no topo da página, com a sala no lugar, nada flutua", () => {
    expect(salaFlutua(88, ALTURA, CABECALHO, false)).toBe(false)
  })

  it("uma rolada leve, que só esconde a beirada, não tira a sala do lugar", () => {
    expect(salaFlutua(CABECALHO - ALTURA * 0.1, ALTURA, CABECALHO, false)).toBe(false)
  })

  it("categoria curta: a página mal rola, a sala segue meio visível, mas o TOPO sumiu — flutua", () => {
    // O caso que motivou: 57% da sala aparecendo, a metade de cima escondida.
    expect(salaFlutua(-332, ALTURA, CABECALHO, false)).toBe(true)
  })

  it("rolou até o fim de uma lista longa: flutua", () => {
    expect(salaFlutua(-2000, ALTURA, CABECALHO, false)).toBe(true)
  })

  it("histerese: entre os dois limites, mantém o que já estava", () => {
    const meio = (FLUTUA_COM_TOPO_ESCONDIDO + VOLTA_COM_TOPO_ESCONDIDO) / 2
    const topo = CABECALHO - ALTURA * meio
    expect(salaFlutua(topo, ALTURA, CABECALHO, false)).toBe(false)
    expect(salaFlutua(topo, ALTURA, CABECALHO, true)).toBe(true)
    expect(salaFlutua(CABECALHO - ALTURA * 0.05, ALTURA, CABECALHO, true)).toBe(false)
  })

  it("medida inválida não prende a sala flutuando", () => {
    expect(salaFlutua(Number.NaN, ALTURA, CABECALHO, true)).toBe(false)
    expect(salaFlutua(-500, 0, CABECALHO, true)).toBe(false)
  })
})
