import { describe, it, expect } from "vitest"
import {
  chaveDoDia, descreveAgora, diaSomado, paredeDoUsuario, sufixoDeFuso, ultimoDiaDoMes,
  proximaOcorrencia, naSemanaQueVem, proximaSemContarHoje, diaDaSemanaDaChave, diaMesDaChave,
} from "./ia-agora"

const BRASIL = 180   // UTC−3
const TOQUIO = -540  // UTC+9

describe("paredeDoUsuario", () => {
  it("é a parede de quem usa, não a do servidor", () => {
    // 02:00 UTC de 29/08 ainda é 23:00 de 28/08 no Brasil.
    const p = paredeDoUsuario(Date.UTC(2026, 7, 29, 2, 0), BRASIL)
    expect(chaveDoDia(p)).toBe("2026-08-28")
    expect(p.hora).toBe(23)
    expect(p.diaDaSemana).toBe(5) // sexta
  })

  it("do outro lado do meridiano também", () => {
    const p = paredeDoUsuario(Date.UTC(2026, 7, 28, 22, 0), TOQUIO)
    expect(chaveDoDia(p)).toBe("2026-08-29")
  })

  it("mês vem como se lê (1 a 12), não como no Date", () => {
    expect(paredeDoUsuario(Date.UTC(2026, 0, 15, 12, 0), 0).mes).toBe(1)
    expect(paredeDoUsuario(Date.UTC(2026, 11, 15, 12, 0), 0).mes).toBe(12)
  })

  it("instante ou fuso impossível não quebra a frase", () => {
    expect(() => paredeDoUsuario(Number.NaN, Number.NaN)).not.toThrow()
    expect(paredeDoUsuario(Date.UTC(2026, 7, 28, 12, 0), Number.NaN).dia).toBe(28)
  })
})

describe("sufixoDeFuso", () => {
  it("inverte o sinal do getTimezoneOffset — o erro clássico daqui", () => {
    // O navegador diz 180 para o Brasil (minutos ATRÁS do UTC); o ISO diz −03:00.
    expect(sufixoDeFuso(BRASIL)).toBe("-03:00")
    expect(sufixoDeFuso(TOQUIO)).toBe("+09:00")
  })

  it("UTC é Z, e meia hora também sai certo", () => {
    expect(sufixoDeFuso(0)).toBe("Z")
    expect(sufixoDeFuso(-330)).toBe("+05:30") // Índia
    expect(sufixoDeFuso(270)).toBe("-04:30")
  })
})

describe("ultimoDiaDoMes", () => {
  it("acerta os meses de 30, 31 e fevereiro", () => {
    expect(ultimoDiaDoMes(2026, 8)).toBe(31)
    expect(ultimoDiaDoMes(2026, 4)).toBe(30)
    expect(ultimoDiaDoMes(2026, 2)).toBe(28)
  })

  it("fevereiro bissexto tem 29", () => {
    expect(ultimoDiaDoMes(2028, 2)).toBe(29)
    expect(ultimoDiaDoMes(2000, 2)).toBe(29)
    expect(ultimoDiaDoMes(1900, 2)).toBe(28) // século não múltiplo de 400
  })

  it("dezembro tem 31 — a virada de ano não confunde a conta", () => {
    expect(ultimoDiaDoMes(2026, 12)).toBe(31)
  })
})

describe("diaSomado", () => {
  const p = (ano: number, mes: number, dia: number) =>
    paredeDoUsuario(Date.UTC(ano, mes - 1, dia, 12, 0), 0)

  it("atravessa o fim do mês", () => {
    expect(diaSomado(p(2026, 8, 31), 1)).toBe("2026-09-01")
  })

  it("atravessa o fim do ano, nos dois sentidos", () => {
    expect(diaSomado(p(2026, 12, 31), 1)).toBe("2027-01-01")
    expect(diaSomado(p(2027, 1, 1), -1)).toBe("2026-12-31")
  })

  it("uma semana à frente é uma semana à frente", () => {
    expect(diaSomado(p(2026, 8, 28), 7)).toBe("2026-09-04")
  })
})

describe("descreveAgora", () => {
  const frase = descreveAgora(Date.UTC(2026, 7, 28, 23, 11), BRASIL)

  it("diz o dia por EXTENSO — nome de mês não se lê de trás para frente", () => {
    // Era a causa do "não consegue ver o mês": "28/08/2026" pode virar 8 de
    // abril na cabeça de um modelo, e o erro não faz barulho.
    expect(frase).toContain("sexta-feira")
    expect(frase).toContain("28 de agosto de 2026")
  })

  it("dá o mesmo instante em ISO, com o fuso certo", () => {
    expect(frase).toContain("2026-08-28T20:11:00-03:00")
  })

  it("entrega o mês já delimitado, que era a pergunta que falhava", () => {
    expect(frase).toContain("2026-08-01")
    expect(frase).toContain("2026-08-31")
  })

  it("entrega hoje, ontem, amanhã e a semana prontos", () => {
    expect(frase).toContain("hoje = 2026-08-28")
    expect(frase).toContain("amanhã = 2026-08-29")
    expect(frase).toContain("ontem = 2026-08-27")
    expect(frase).toContain("2026-09-04")
  })

  it("no fim do mês, o 'amanhã' não cai no mês errado", () => {
    const virada = descreveAgora(Date.UTC(2026, 7, 31, 15, 0), BRASIL)
    expect(virada).toContain("hoje = 2026-08-31")
    expect(virada).toContain("amanhã = 2026-09-01")
  })

  it("sai inteira mesmo com instante ou fuso impossível", () => {
    expect(() => descreveAgora(Number.NaN, Number.NaN)).not.toThrow()
    expect(descreveAgora(Date.UTC(2026, 7, 28, 12, 0), Number.NaN)).toContain("2026-08-28")
  })
})

describe("dia da semana → data", () => {
  // Sábado, 19/09/2026, 21h no Brasil — o dia e a hora do relatório de testes
  // em que a IA mandou "na segunda" para quarta e jurou que 22/09 era quinta.
  const SABADO = paredeDoUsuario(Date.UTC(2026, 8, 20, 0, 0), BRASIL)

  it("acha a próxima ocorrência de cada dia", () => {
    expect(proximaOcorrencia(SABADO, 1)).toBe("2026-09-21") // segunda
    expect(proximaOcorrencia(SABADO, 2)).toBe("2026-09-22") // terça
    expect(proximaOcorrencia(SABADO, 3)).toBe("2026-09-23") // quarta
  })

  // "No domingo", num sábado, é amanhã. O relatório registrou o app mandando
  // para o domingo da semana seguinte.
  it("domingo, num sábado, é amanhã", () => {
    expect(proximaOcorrencia(SABADO, 0)).toBe("2026-09-20")
  })

  // Hoje conta: quem diz "no sábado" num sábado quer dizer hoje.
  it("o dia de hoje é a própria data, não daqui a sete dias", () => {
    expect(proximaOcorrencia(SABADO, 6)).toBe("2026-09-19")
  })

  it("dia da semana fora da faixa não quebra", () => {
    expect(proximaOcorrencia(SABADO, 7)).toBe(proximaOcorrencia(SABADO, 0))
    expect(proximaOcorrencia(SABADO, -1)).toBe(proximaOcorrencia(SABADO, 6))
  })

  it("lê o dia da semana de uma data solta", () => {
    expect(diaDaSemanaDaChave("2026-09-22")).toBe(2) // terça, não quinta
    expect(diaDaSemanaDaChave("2026-09-19")).toBe(6)
  })

  it("escreve dd/mm a partir da chave", () => {
    expect(diaMesDaChave("2026-09-19")).toBe("19/09")
    expect(diaMesDaChave("2026-10-01")).toBe("01/10")
  })
})

describe("o bloco de datas do prompt", () => {
  const texto = descreveAgora(Date.UTC(2026, 8, 20, 0, 0), BRASIL)

  it("entrega a data de cada dia da semana, já calculada", () => {
    expect(texto).toContain("segunda-feira = 2026-09-21")
    expect(texto).toContain("terça-feira = 2026-09-22")
  })

  // O erro exato do relatório: ela disse que 22/09/2026 cai numa quinta.
  it("22/09/2026 aparece como terça, não como quinta", () => {
    expect(texto).toContain("22/09 ter")
    expect(texto).not.toContain("22/09 qui")
  })

  // A lista dos próximos dias é uma linha só, e é de propósito: cada chamada
  // reenvia o prompt inteiro contra um teto de 8000 tokens por minuto.
  it("os próximos dias cabem numa linha", () => {
    const linha = texto.split(/\r?\n/).find((l) => l.startsWith("Os próximos dias:"))!
    expect(linha).toBeDefined()
    expect(linha).toContain("19/09 sáb")
    expect(linha).toContain("20/09 dom")
    expect(linha.split("·")).toHaveLength(14)
  })

  it("manda escrever a data, e diz por quê", () => {
    expect(texto).toMatch(/dd\/mm/)
    expect(texto).toMatch(/esconde a data trocada/)
  })

  // O relatório de 21/09: numa mesma mensagem o modelo escreveu "segunda-feira,
  // 10/10" e o app escreveu "sábado, 10/10" — 10/10 é sábado. A data gravava
  // certo; o nome do dia na frase dele é que confundia. Quem tem o dia certo é
  // o app, então o nome do dia sai da frase do modelo.
  it("proíbe o modelo de escrever o nome do dia da semana", () => {
    expect(texto).toMatch(/NÃO escreva o nome do dia da semana/)
  })

  it("cobre 14 dias, atravessando a virada do mês", () => {
    expect(texto).toContain("02/10")
  })

  // O relatório de 21/09 (segunda): "a partir da próxima segunda" virou domingo
  // 27/09 em vez de 28/09. A tabela dava "segunda = hoje" e o modelo tinha de
  // somar 7 sozinho — e errou. Agora a data da semana que vem vem pronta.
  describe("quando o dia pedido é hoje", () => {
    // Segunda, 21/09/2026, no Brasil.
    const segunda = descreveAgora(Date.UTC(2026, 8, 21, 12, 0), BRASIL)

    it("dá a data de hoje E a da próxima semana para o dia que é hoje", () => {
      const linha = segunda.split(/\r?\n/).find((l) => l.startsWith("- segunda-feira ="))!
      expect(linha).toContain("2026-09-21")
      expect(linha).toContain("é HOJE")
      // "próxima segunda"/"segunda que vem" = 28/09, nunca o domingo 27/09.
      expect(linha).toContain("2026-09-28")
      expect(linha).toContain("28/09")
      expect(linha).not.toContain("27/09")
    })

    it("o dia que não é hoje também traz o par, e não é marcado como HOJE", () => {
      const terca = segunda.split(/\r?\n/).find((l) => l.startsWith("- terça-feira ="))!
      expect(terca).toContain("2026-09-22")
      expect(terca).not.toContain("é HOJE")
      // Numa segunda, "terça que vem" é a da semana seguinte; "próxima terça"
      // continua sendo a de amanhã.
      expect(terca).toContain('2026-09-22 (22/09) ← "na terça", "próxima terça"')
      expect(terca).toContain('2026-09-29 (29/09) ← "terça que vem"')
    })
  })

  // O relatório de 22/09 (terça): "sexta que vem" virou 25/09 — a sexta DESTA
  // semana — em vez de 02/10. Não é o off-by-one de antes: é uma semana
  // inteira. A tabela dava uma data só por dia, e o modelo tinha de decidir
  // sozinho se "que vem" somava 7; decidiu que não.
  describe('"que vem" é a semana seguinte, não a próxima ocorrência', () => {
    // Terça, 22/09/2026, no Brasil — o dia do relatório.
    const terca = descreveAgora(Date.UTC(2026, 8, 22, 12, 0), BRASIL)
    const linha = (nome: string) => terca.split(/\r?\n/).find((l) => l.startsWith(`- ${nome} =`))!

    it("sexta = 25/09, mas sexta que vem = 02/10", () => {
      const sexta = linha("sexta-feira")
      expect(sexta).toContain("2026-09-25")
      expect(sexta).toContain('2026-10-02 (02/10) ← "sexta que vem"')
    })

    it("segunda já cai na semana que vem, então as leituras batem", () => {
      // Numa terça, a próxima segunda (28/09) JÁ é a da semana seguinte —
      // dizer outra data ali seria inventar um erro no sentido oposto.
      const seg = linha("segunda-feira")
      expect(seg).toContain("2026-09-28")
      expect(seg).toContain("(as três)")
    })

    it("o dia de hoje continua com hoje e com a semana seguinte", () => {
      const ter = linha("terça-feira")
      expect(ter).toContain("2026-09-22")
      expect(ter).toContain("é HOJE")
      expect(ter).toContain('2026-09-29 (29/09) ← "próxima terça", "terça que vem"')
    })

    it("o prompt cita a expressão ao lado de cada data", () => {
      // Dar a data certa sem dizer a QUAL frase ela responde só move a decisão
      // para o modelo — que é onde o erro nasce.
      expect(terca).toMatch(/a EXPRESSÃO ao lado da data/)
    })
  })

  // O ponto cego que a primeira correção quase criou. "Próxima sexta", numa
  // terça, é 25/09 — a desta semana; só "sexta que vem" pula para 02/10. O
  // "próxima segunda" que passava nos testes passava por COINCIDÊNCIA: para
  // segunda, numa terça, as três leituras dão a mesma data, então ele não
  // distinguia coluna nenhuma.
  describe('"próxima X" e "X que vem" são colunas diferentes', () => {
    const terca = descreveAgora(Date.UTC(2026, 8, 22, 12, 0), BRASIL)
    const linha = (nome: string) => terca.split(/\r?\n/).find((l) => l.startsWith(`- ${nome} =`))!

    it('numa terça, "próxima sexta" = 25/09 e "sexta que vem" = 02/10', () => {
      const sexta = linha("sexta-feira")
      // As duas datas e as duas frases estão na linha; o que amarra é a ORDEM:
      // a frase "próxima sexta" tem de estar do lado do 25/09.
      const [antes, depois] = sexta.split("·")
      expect(antes).toContain("2026-09-25")
      expect(antes).toContain('"próxima sexta"')
      expect(depois).toContain("2026-10-02")
      expect(depois).toContain('"sexta que vem"')
    })

    it('numa terça, "quinta que vem" = 01/10 e "próxima quinta" = 24/09', () => {
      const [antes, depois] = linha("quinta-feira").split("·")
      expect(antes).toContain("2026-09-24")
      expect(antes).toContain('"próxima quinta"')
      expect(depois).toContain("2026-10-01")
      expect(depois).toContain('"quinta que vem"')
    })

    it("quando as três leituras coincidem, a linha diz isso em vez de repetir data", () => {
      // Numa terça, a próxima segunda (28/09) já é a da semana seguinte.
      const seg = linha("segunda-feira")
      expect(seg).toContain("2026-09-28")
      expect(seg).toContain("(as três)")
      expect(seg).not.toContain("·")
    })

    it("a concordância do artigo e do próximo segue o dia", () => {
      // A tabela CITA a frase para o modelo procurar: "próxima domingo" seria
      // uma frase que ninguém escreve, e ele não acharia.
      expect(linha("domingo")).toContain('"no domingo"')
      expect(linha("domingo")).toContain('"próximo domingo"')
      expect(linha("sábado")).toContain('"próximo sábado"')
      expect(linha("segunda-feira")).toContain('"próxima segunda"')
    })

    it('"na sexta" fica com a data mais próxima, não com a da semana que vem', () => {
      expect(linha("sexta-feira").split("·")[0]).toContain('"na sexta"')
    })
  })
})

describe("proximaSemContarHoje", () => {
  const TERCA = paredeDoUsuario(Date.UTC(2026, 8, 22, 12, 0), BRASIL)

  it('é a próxima que vier, pulando hoje — o que "próxima X" quer dizer', () => {
    expect(proximaSemContarHoje(TERCA, 5)).toBe("2026-09-25") // próxima sexta
    expect(proximaSemContarHoje(TERCA, 4)).toBe("2026-09-24") // próxima quinta
    expect(proximaSemContarHoje(TERCA, 1)).toBe("2026-09-28") // próxima segunda
  })

  // O caso que o relatório de 21/09 pegou: numa segunda, "próxima segunda" é
  // daqui a 7 — nunca hoje, e nunca o domingo 27/09.
  it("o próprio dia de hoje vai para daqui a 7, nunca para hoje", () => {
    expect(proximaSemContarHoje(TERCA, 2)).toBe("2026-09-29")
    const SEGUNDA = paredeDoUsuario(Date.UTC(2026, 8, 21, 12, 0), BRASIL)
    expect(proximaSemContarHoje(SEGUNDA, 1)).toBe("2026-09-28")
  })

  // As três funções só coincidem no dia que é hoje; é isso que as torna três.
  it("difere de proximaOcorrencia só no dia de hoje", () => {
    for (let dia = 0; dia < 7; dia++) {
      const igual = proximaSemContarHoje(TERCA, dia) === proximaOcorrencia(TERCA, dia)
      expect(igual).toBe(dia !== TERCA.diaDaSemana)
    }
  })

  it("difere de naSemanaQueVem sempre que o dia ainda cabe nesta semana", () => {
    // Quarta, quinta, sexta e sábado ainda vêm nesta semana, a partir da terça.
    for (const dia of [3, 4, 5, 6]) {
      expect(proximaSemContarHoje(TERCA, dia)).not.toBe(naSemanaQueVem(TERCA, dia))
    }
    // No dia de hoje as duas somam 7 e batem.
    expect(proximaSemContarHoje(TERCA, 2)).toBe(naSemanaQueVem(TERCA, 2))
  })

  it("dia da semana fora da faixa não quebra", () => {
    expect(proximaSemContarHoje(TERCA, 7)).toBe(proximaSemContarHoje(TERCA, 0))
    expect(proximaSemContarHoje(TERCA, -1)).toBe(proximaSemContarHoje(TERCA, 6))
  })
})

describe("naSemanaQueVem", () => {
  // Terça, 22/09/2026, no Brasil.
  const TERCA = paredeDoUsuario(Date.UTC(2026, 8, 22, 12, 0), BRASIL)

  it("pula para a semana do calendário seguinte, não soma 7 do dia pedido", () => {
    expect(naSemanaQueVem(TERCA, 5)).toBe("2026-10-02") // sexta que vem
    expect(naSemanaQueVem(TERCA, 1)).toBe("2026-09-28") // segunda que vem
    expect(naSemanaQueVem(TERCA, 2)).toBe("2026-09-29") // terça que vem
    expect(naSemanaQueVem(TERCA, 0)).toBe("2026-09-27") // domingo que vem
  })

  it("nunca devolve data no passado nem antes da próxima ocorrência", () => {
    for (let dia = 0; dia < 7; dia++) {
      expect(naSemanaQueVem(TERCA, dia) >= proximaOcorrencia(TERCA, dia)).toBe(true)
    }
  })

  // Num sábado a semana está acabando: quase todo dia pedido já cai na seguinte.
  it("num sábado, as duas leituras coincidem para quase todo dia", () => {
    const SABADO = paredeDoUsuario(Date.UTC(2026, 8, 26, 12, 0), BRASIL)
    for (const dia of [0, 1, 2, 3, 4, 5]) {
      expect(naSemanaQueVem(SABADO, dia)).toBe(proximaOcorrencia(SABADO, dia))
    }
    // Menos o próprio sábado, que é hoje: "sábado que vem" é daqui a 7.
    expect(naSemanaQueVem(SABADO, 6)).toBe("2026-10-03")
    expect(proximaOcorrencia(SABADO, 6)).toBe("2026-09-26")
  })

  it("dia da semana fora da faixa não quebra", () => {
    expect(naSemanaQueVem(TERCA, 7)).toBe(naSemanaQueVem(TERCA, 0))
    expect(naSemanaQueVem(TERCA, -1)).toBe(naSemanaQueVem(TERCA, 6))
  })
})
