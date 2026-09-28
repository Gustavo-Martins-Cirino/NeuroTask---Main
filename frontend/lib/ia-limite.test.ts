import { describe, it, expect } from "vitest"
import { leEsperaDoGroq, comoDizerAEspera, marcaDeLimite, leMarcaDeLimite, ehLimite } from "./ia-limite"

// Corpos como o Groq escreve de verdade.
const TPM =
  'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_x` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7900, Requested 500. Please try again in 7.66s.'
const TPM_LONGO =
  'Rate limit reached ... on tokens per minute (TPM): Limit 8000, Used 8000, Requested 2900. Please try again in 2m59.56s.'
const TPD =
  'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_x` on tokens per day (TPD): Limit 100000, Used 99000, Requested 2900. Please try again in 1h23m45.6s.'

describe("leEsperaDoGroq", () => {
  it("lê os segundos do formato curto", () => {
    expect(leEsperaDoGroq(TPM)).toEqual({ segundos: 8, porDia: false })
  })

  // "2m59.56s" lido só pelos segundos daria 59 — quase três minutos a menos.
  it("soma minutos e segundos", () => {
    expect(leEsperaDoGroq(TPM_LONGO).segundos).toBe(180)
  })

  // E "1h23m45.6s" lido pelos segundos daria 45s para uma espera de hora e meia.
  it("soma horas, minutos e segundos", () => {
    expect(leEsperaDoGroq(TPD).segundos).toBe(5026)
  })

  it("reconhece o teto DIÁRIO, que muda o que se deve dizer", () => {
    expect(leEsperaDoGroq(TPD).porDia).toBe(true)
    expect(leEsperaDoGroq(TPM).porDia).toBe(false)
  })

  it("corpo sem tempo nenhum não inventa número", () => {
    expect(leEsperaDoGroq("Rate limit reached.")).toEqual({ segundos: null, porDia: false })
    expect(leEsperaDoGroq("")).toEqual({ segundos: null, porDia: false })
    expect(leEsperaDoGroq(undefined as unknown as string)).toEqual({ segundos: null, porDia: false })
  })
})

describe("comoDizerAEspera", () => {
  // A frase que a rodada Y desmentiu quatro vezes: sem número do provedor, não
  // se promete o minuto.
  it("sem número, a frase é vaga de propósito", () => {
    expect(comoDizerAEspera({ segundos: null, porDia: false })).toContain("alguns minutos")
    expect(comoDizerAEspera({ segundos: null, porDia: false })).not.toContain("um minuto")
  })

  it("espera curta pode prometer o minuto", () => {
    expect(comoDizerAEspera({ segundos: 8, porDia: false })).toContain("cerca de um minuto")
  })

  it("espera de minutos diz quantos", () => {
    expect(comoDizerAEspera({ segundos: 180, porDia: false })).toContain("cerca de 3 minutos")
  })

  it("espera de horas não vira minutos", () => {
    const frase = comoDizerAEspera({ segundos: 5026, porDia: false })
    expect(frase).toContain("horas")
    expect(frase).not.toContain("minuto")
  })

  // Mandar esperar um minuto num teto diário é a pior versão do erro: a pessoa
  // fica tentando a tarde inteira.
  it("teto diário diz que só amanhã", () => {
    const frase = comoDizerAEspera({ segundos: 5026, porDia: true })
    expect(frase).toContain("DIÁRIO")
    expect(frase).toContain("amanhã")
  })
})

describe("a marca que atravessa o laço", () => {
  it("leva e devolve o que foi lido", () => {
    const e = { segundos: 180, porDia: false }
    expect(leMarcaDeLimite(marcaDeLimite(e))).toEqual(e)
  })

  it("leva e devolve o teto diário", () => {
    const e = { segundos: 5026, porDia: true }
    expect(leMarcaDeLimite(marcaDeLimite(e))).toEqual(e)
  })

  it("sem número, continua sem número do outro lado", () => {
    expect(leMarcaDeLimite(marcaDeLimite({ segundos: null, porDia: false }))).toEqual({
      segundos: null,
      porDia: false,
    })
  })

  it("reconhece a marca e não confunde com resposta normal", () => {
    expect(ehLimite(marcaDeLimite({ segundos: null, porDia: false }))).toBe(true)
    expect(ehLimite("Criei o bloco às 14:00.")).toBe(false)
    expect(ehLimite("")).toBe(false)
  })
})
