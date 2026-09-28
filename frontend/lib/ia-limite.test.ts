import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"
import {
  leEsperaDoLimite,
  comoDizerAEspera,
  marcaDeLimite,
  leMarcaDeLimite,
  ehLimite,
  corpoParaLog,
  escopoNaTela,
  minutosDeEspera,
  horasDeEspera,
} from "./ia-limite"

// Corpos como o Groq escreve de verdade.
const TPM =
  'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_x` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7900, Requested 500. Please try again in 7.66s.'
const TPM_LONGO =
  'Rate limit reached ... on tokens per minute (TPM): Limit 8000, Used 8000, Requested 2900. Please try again in 2m59.56s.'
const TPD =
  'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_x` on tokens per day (TPD): Limit 100000, Used 99000, Requested 2900. Please try again in 1h23m45.6s.'

// E como o Gemini escreve — o mesmo recado, em outra forma. `PerDay` vem
// colado dentro do quotaId, que era o que `per\s+day` deixava passar.
const GEMINI_DIA = JSON.stringify({
  error: {
    code: 429,
    message: "You exceeded your current quota.",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }],
      },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "51s" },
    ],
  },
})
const GEMINI_MINUTO = JSON.stringify({
  error: {
    code: 429,
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }],
      },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "17s" },
    ],
  },
})

describe("leEsperaDoLimite", () => {
  it("lê os segundos do formato curto", () => {
    expect(leEsperaDoLimite(TPM)).toEqual({ segundos: 8, porDia: false, origem: null })
  })

  // "2m59.56s" lido só pelos segundos daria 59 — quase três minutos a menos.
  it("soma minutos e segundos", () => {
    expect(leEsperaDoLimite(TPM_LONGO).segundos).toBe(180)
  })

  // E "1h23m45.6s" lido pelos segundos daria 45s para uma espera de hora e meia.
  it("soma horas, minutos e segundos", () => {
    expect(leEsperaDoLimite(TPD).segundos).toBe(5026)
  })

  it("reconhece o teto DIÁRIO, que muda o que se deve dizer", () => {
    expect(leEsperaDoLimite(TPD).porDia).toBe(true)
    expect(leEsperaDoLimite(TPM).porDia).toBe(false)
  })

  it("corpo sem tempo nenhum não inventa número", () => {
    expect(leEsperaDoLimite("Rate limit reached.")).toEqual({ segundos: null, porDia: false, origem: null })
    expect(leEsperaDoLimite("")).toEqual({ segundos: null, porDia: false, origem: null })
    expect(leEsperaDoLimite(undefined as unknown as string)).toEqual({ segundos: null, porDia: false, origem: null })
  })
})

describe("comoDizerAEspera", () => {
  // A frase que a rodada Y desmentiu quatro vezes: sem número do provedor, não
  // se promete o minuto.
  it("sem número, a frase é vaga de propósito", () => {
    expect(comoDizerAEspera({ segundos: null, porDia: false, origem: null })).toContain("alguns minutos")
    expect(comoDizerAEspera({ segundos: null, porDia: false, origem: null })).not.toContain("um minuto")
  })

  it("espera curta pode prometer o minuto", () => {
    expect(comoDizerAEspera({ segundos: 8, porDia: false, origem: null })).toContain("cerca de um minuto")
  })

  it("espera de minutos diz quantos", () => {
    expect(comoDizerAEspera({ segundos: 180, porDia: false, origem: null })).toContain("cerca de 3 minutos")
  })

  it("espera de horas não vira minutos", () => {
    const frase = comoDizerAEspera({ segundos: 5026, porDia: false, origem: null })
    expect(frase).toContain("horas")
    expect(frase).not.toContain("minuto")
  })

  // Mandar esperar um minuto num teto diário é a pior versão do erro: a pessoa
  // fica tentando a tarde inteira.
  it("teto diário diz que só amanhã", () => {
    const frase = comoDizerAEspera({ segundos: 5026, porDia: true, origem: null })
    expect(frase).toContain("DIÁRIO")
    expect(frase).toContain("amanhã")
  })
})

describe("a marca que atravessa o laço", () => {
  it("leva e devolve o que foi lido", () => {
    const e = { segundos: 180, porDia: false, origem: null }
    expect(leMarcaDeLimite(marcaDeLimite(e))).toEqual(e)
  })

  it("leva e devolve o teto diário", () => {
    const e = { segundos: 5026, porDia: true, origem: null }
    expect(leMarcaDeLimite(marcaDeLimite(e))).toEqual(e)
  })

  it("sem número, continua sem número do outro lado", () => {
    expect(leMarcaDeLimite(marcaDeLimite({ segundos: null, porDia: false, origem: null }))).toEqual({
      segundos: null,
      porDia: false,
      origem: null,
    })
  })

  it("reconhece a marca e não confunde com resposta normal", () => {
    expect(ehLimite(marcaDeLimite({ segundos: null, porDia: false, origem: null }))).toBe(true)
    expect(ehLimite("Criei o bloco às 14:00.")).toBe(false)
    expect(ehLimite("")).toBe(false)
  })

  // A regressão que este guarda existe para não deixar acontecer de novo.
  it("a marca com carga não casa por igualdade com a palavra pelada", () => {
    const e = { segundos: 13, porDia: false, origem: null }
    expect(marcaDeLimite(e)).not.toBe("__RATE_LIMIT__")
    expect(ehLimite(marcaDeLimite(e))).toBe(true)
  })

  it("o número da origem atravessa junto", () => {
    const e = { segundos: 13, porDia: false, origem: "13" }
    expect(leMarcaDeLimite(marcaDeLimite(e))).toEqual(e)
  })
})

describe("o retry-after do provedor", () => {
  it("vem cru, sem passar por conta nenhuma", () => {
    expect(leEsperaDoLimite(TPM, "8").origem).toBe("8")
    // O ponto de existir: quando os dois DIVERGEM, o header mostra a
    // divergência em vez de escondê-la atrás do número já traduzido.
    expect(leEsperaDoLimite(TPM, "600")).toMatchObject({ segundos: 8, origem: "600" })
  })

  it("aceita a forma de data que o HTTP também permite", () => {
    expect(leEsperaDoLimite(TPD, "Wed, 21 Oct 2015 07:28:00 GMT").origem).toBe(
      "Wed, 21 Oct 2015 07:28:00 GMT"
    )
  })

  it("provedor calado não vira string vazia", () => {
    expect(leEsperaDoLimite(TPM).origem).toBeNull()
    expect(leEsperaDoLimite(TPM, null).origem).toBeNull()
    expect(leEsperaDoLimite(TPM, "   ").origem).toBeNull()
  })

  // Vem de fora: `|` parte a marca em pedaços errados e `\n` encerra header.
  it("não deixa o provedor quebrar a marca nem o header", () => {
    const e = leEsperaDoLimite(TPM, "13|dia\r\nx-injetado: 1")
    expect(e.origem).not.toContain("|")
    expect(e.origem).not.toMatch(/[\r\n]/)
    expect(leMarcaDeLimite(marcaDeLimite(e))).toEqual(e)
  })

  it("origem absurdamente longa é cortada", () => {
    expect(leEsperaDoLimite(TPM, "9".repeat(500)).origem).toHaveLength(40)
  })
})

// O caminho Gemini/Anthropic dizia "precisa de um minuto para respirar" sem
// ler nada. O sinal sempre esteve no corpo — só ninguém olhava.
describe("os outros provedores", () => {
  it("lê o teto diário do Gemini, que vem colado no quotaId", () => {
    expect(leEsperaDoLimite(GEMINI_DIA)).toMatchObject({ porDia: true, segundos: 51 })
  })

  it("não confunde o teto por minuto do Gemini com o diário", () => {
    expect(leEsperaDoLimite(GEMINI_MINUTO)).toMatchObject({ porDia: false, segundos: 17 })
  })

  // A Anthropic quase não fala no corpo: o que ela dá é o header. Ignorá-lo
  // deixaria o caminho dela permanentemente vago.
  it("cai no retry-after quando o corpo cala", () => {
    expect(leEsperaDoLimite('{"type":"rate_limit_error"}', "42")).toMatchObject({ segundos: 42 })
  })

  // Um relógio fora de hora inventaria a espera. Melhor não saber que saber
  // errado — e a data continua visível em `origem`.
  it("retry-after em forma de data não vira número", () => {
    const e = leEsperaDoLimite("{}", "Wed, 21 Oct 2015 07:28:00 GMT")
    expect(e.segundos).toBeNull()
    expect(e.origem).toBe("Wed, 21 Oct 2015 07:28:00 GMT")
  })

  // O corpo é mais específico que o header: ele diz de QUAL teto se trata.
  it("o corpo tem precedência sobre o header", () => {
    expect(leEsperaDoLimite(TPM, "600").segundos).toBe(8)
    expect(leEsperaDoLimite(GEMINI_DIA, "600").segundos).toBe(51)
  })
})

describe("escopoNaTela", () => {
  it("o teto diário manda, mesmo com segundos no corpo", () => {
    expect(escopoNaTela(leEsperaDoLimite(TPD))).toBe("dia")
    expect(escopoNaTela(leEsperaDoLimite(GEMINI_DIA))).toBe("dia")
  })

  it("separa hora de minuto — 84 minutos não é frase que se diga", () => {
    expect(escopoNaTela({ segundos: 5026, porDia: false, origem: null })).toBe("horas")
    expect(escopoNaTela({ segundos: 3599, porDia: false, origem: null })).toBe("minutos")
  })

  it("provedor calado não vira promessa", () => {
    expect(escopoNaTela({ segundos: null, porDia: false, origem: null })).toBe("vago")
  })

  // "0 minutos" não é espera nenhuma: quem lê conclui que já pode tentar.
  it("arredonda para cima e nunca chega a zero", () => {
    expect(minutosDeEspera(8)).toBe(1)
    expect(minutosDeEspera(61)).toBe(2)
    expect(horasDeEspera(5026)).toBe(2)
    expect(horasDeEspera(1)).toBe(1)
  })
})

describe("corpoParaLog", () => {
  // O que a rodada Z precisava e não tinha: a prova de qual teto o Groq citou.
  it("preserva o que decide o escopo", () => {
    expect(corpoParaLog(TPD)).toContain("per day (TPD)")
    expect(corpoParaLog(TPM)).toContain("per minute (TPM)")
    expect(corpoParaLog(TPM)).toContain("try again in 7.66s")
  })

  // A Vercel corta por quebra de linha: um JSON de erro em três linhas vira
  // três entradas soltas, e a que interessa quase nunca é a primeira.
  it("cabe numa linha só", () => {
    expect(corpoParaLog('{\n  "error": {\n    "message": "Rate limit"\n  }\n}')).toBe(
      '{ "error": { "message": "Rate limit" } }'
    )
  })

  it("corta o que for longo demais e diz quanto ficou de fora", () => {
    const saida = corpoParaLog("x".repeat(700))
    expect(saida).toHaveLength(500 + "…(+200)".length)
    expect(saida.endsWith("…(+200)")).toBe(true)
  })

  it("corpo curto passa inteiro, sem reticência", () => {
    expect(corpoParaLog("Rate limit reached.")).toBe("Rate limit reached.")
  })

  it("corpo vazio se anuncia em vez de sumir na linha", () => {
    expect(corpoParaLog("")).toBe("(vazio)")
    expect(corpoParaLog("   \n ")).toBe("(vazio)")
    expect(corpoParaLog(undefined as unknown as string)).toBe("(vazio)")
  })
})

// Quem pergunta "isto é limite?" pergunta ao módulo, nunca à string.
//
// O sentinela era a palavra pelada e virou palavra COM CARGA quando passou a
// levar a espera do provedor. Os dois clientes continuaram comparando por
// igualdade (`=== "__RATE_LIMIT__"`), a comparação parou de casar calada, e o
// sentinela cru chegava à tela — na conversa por voz, o TTS chegava a LER
// "__RATE_LIMIT__|13|minuto" em voz alta.
//
// Nada quebrou: os tipos batem, a função existe, a tela renderiza. Só está
// errada. É a mesma forma de defeito do locale-fixo, e o remédio é o mesmo —
// um guarda que lê o código em vez de confiar na disciplina de quem edita.
//
// AST e não regex: a palavra aparece em comentário (inclusive nos daqui), e
// regex não distingue comentário de código.
describe("ninguém escreve o sentinela à mão", () => {
  const RAIZ = process.cwd()
  const PASTAS = ["app", "components", "lib", "hooks"]

  /** Onde a string literal é legítima — a definição, e só ela. */
  const PERMITIDOS: Record<string, string> = {
    "lib/ia-limite.ts": "é a definição da marca; todo o resto pergunta por ehLimite()",
  }

  function arquivos(dir: string, saida: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "inspirações") continue
      const caminho = join(dir, e.name)
      if (e.isDirectory()) arquivos(caminho, saida)
      else if (/\.tsx?$/.test(e.name) && !e.name.includes(".test.")) saida.push(caminho)
    }
    return saida
  }

  const chave = (caminho: string) => relative(RAIZ, caminho).split("\\").join("/")

  /** Os literais de string que são a marca — só código, sem comentário. */
  function marcasLiterais(caminho: string): number[] {
    const codigo = readFileSync(caminho, "utf8")
    const fonte = ts.createSourceFile(caminho, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const linhas: number[] = []
    const olha = (n: ts.Node) => {
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && n.text.includes("__RATE_LIMIT__")) {
        linhas.push(fonte.getLineAndCharacterOfPosition(n.getStart(fonte)).line + 1)
      }
      ts.forEachChild(n, olha)
    }
    ts.forEachChild(fonte, olha)
    return linhas
  }

  const todos = PASTAS.flatMap((p) => arquivos(join(RAIZ, p)))

  it("a varredura acha arquivos (senão ela passa por não olhar nada)", () => {
    expect(todos.length).toBeGreaterThan(80)
  })

  it("nenhum arquivo fora da definição escreve a marca", () => {
    const infratores: string[] = []
    for (const caminho of todos) {
      const rel = chave(caminho)
      if (PERMITIDOS[rel]) continue
      for (const linha of marcasLiterais(caminho)) {
        infratores.push(`${rel}:${linha} escreve "__RATE_LIMIT__" — use ehLimite() de lib/ia-limite`)
      }
    }
    expect(infratores).toEqual([])
  })

  it("toda exceção da lista ainda escreve a marca de verdade", () => {
    for (const rel of Object.keys(PERMITIDOS)) {
      expect(marcasLiterais(join(RAIZ, rel)).length, `${rel} já não precisa da exceção`).toBeGreaterThan(0)
    }
  })
})
