import { describe, it, expect } from "vitest"
import {
  pt, en, dicionario, idiomaDaRegiao, idiomaDoFormato, idiomaDoNavegador,
  textoDaRepeticao, iniciaisDaSemana, LOCALE, type Dicionario,
} from "./i18n"
import { RECURRENCE_OPTIONS } from "./task-recurrence"
import { CORES_DE_NOTA } from "./nota-cor"
import { VISOES } from "./calendario-visao"

// A falta de uma CHAVE já não compila (é o que a interface Dicionario compra).
// O que a interface não pega, e estes testes pegam: dicionário que compila mas
// devolve texto vazio, plural que não muda, e a frase que ficou igual nos dois
// idiomas — o jeito mais fácil de "traduzir" sem traduzir.

const IDIOMAS: [string, Dicionario][] = [["pt", pt], ["en", en]]

describe("dicionários — nenhum texto vazio", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: toda frase tem conteúdo`, () => {
      expect(d.agenda.titulo("Ana").trim()).not.toBe("")
      expect(d.agenda.titulo(null).trim()).not.toBe("")
      expect(d.agenda.periodo(14).trim()).not.toBe("")
      expect(d.agenda.fuso("America/Sao_Paulo").trim()).not.toBe("")
      expect(d.agenda.rodape("Ana").trim()).not.toBe("")
      expect(d.agenda.carregando.trim()).not.toBe("")
      expect(d.agenda.hoje.trim()).not.toBe("")
      expect(d.agenda.livreODiaTodo.trim()).not.toBe("")
      expect(d.agenda.donoAnonimo.trim()).not.toBe("")
    })
  }
})

describe("dicionários — o que varia realmente varia", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: o nome entra no título e no rodapé`, () => {
      expect(d.agenda.titulo("Gustavo")).toContain("Gustavo")
      expect(d.agenda.rodape("Gustavo")).toContain("Gustavo")
    })

    it(`${nome}: sem nome, o título não vira frase quebrada`, () => {
      const t = d.agenda.titulo(null)
      expect(t).not.toContain("null")
      expect(t).not.toContain("undefined")
      expect(t.trim()).toBe(t) // nem sobra espaço de onde o nome sairia
    })

    it(`${nome}: singular e plural são diferentes`, () => {
      expect(d.agenda.periodo(1)).not.toBe(d.agenda.periodo(2))
      expect(d.agenda.periodo(1)).toContain("1")
      expect(d.agenda.periodo(30)).toContain("30")
    })

    it(`${nome}: o fuso aparece na frase`, () => {
      expect(d.agenda.fuso("Europe/Lisbon")).toContain("Europe/Lisbon")
    })
  }

  it("os dois idiomas não devolvem o mesmo texto (tradução de fachada)", () => {
    expect(en.agenda.livreODiaTodo).not.toBe(pt.agenda.livreODiaTodo)
    expect(en.agenda.carregando).not.toBe(pt.agenda.carregando)
    expect(en.agenda.titulo("Ana")).not.toBe(pt.agenda.titulo("Ana"))
    expect(en.agenda.periodo(7)).not.toBe(pt.agenda.periodo(7))
  })
})

// Varredura genérica: vale para o dicionário INTEIRO e continua valendo à
// medida que ele cresce, sem ninguém precisar lembrar de somar um teste por
// chave nova. É o contrário dos testes específicos abaixo, que existem para as
// regras que uma varredura não enxerga (nome próprio, plural, ordem).
function folhas(obj: unknown, caminho = ""): [string, unknown][] {
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      folhas(v, caminho ? `${caminho}.${k}` : k)
    )
  }
  return [[caminho, obj]]
}

describe("dicionário inteiro", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: nenhum texto vazio em lugar nenhum`, () => {
      for (const [chave, valor] of folhas(d)) {
        if (typeof valor === "string") {
          expect(valor.trim(), `${chave} está vazio`).not.toBe("")
        }
      }
    })
  }

  it("pt e en têm exatamente as mesmas chaves", () => {
    // O TypeScript já garante isso — mas só enquanto ninguém escrever `as any`.
    const chaves = (d: Dicionario) => folhas(d).map(([k]) => k).sort()
    expect(chaves(en)).toEqual(chaves(pt))
  })

  // O § só faz sentido onde o componente chama `enfatizar`. A varredura não
  // enxerga isso, então as frases fixas que legitimamente o usam ficam nomeadas
  // aqui — e a lista é curta de propósito: cada entrada é uma promessa de que
  // AQUELE texto passa por `enfatizar` na tela.
  //
  // As frases com ênfase que também levam um NOME (as sugestões de rotina) não
  // entram: sendo funções, a varredura já não as alcança.
  const COM_ENFASE = new Set([
    "notas.vazio",
    "configuracoes.importarExportar.dialogo.ondeAchar",
  ])

  it("nenhuma marca de ênfase sobra num texto fixo", () => {
    for (const [, d] of IDIOMAS) {
      for (const [chave, valor] of folhas(d)) {
        if (typeof valor === "string" && !COM_ENFASE.has(chave)) {
          expect(valor, `${chave} tem § fora de uma frase com ênfase`).not.toContain("§")
        }
      }
    }
  })

  // O par é o que importa: marca ímpar não quebra a tela (o texto sai inteiro,
  // sem negrito), mas é sempre um erro de digitação — e some sem ninguém ver.
  it("onde há ênfase, as marcas vêm aos pares", () => {
    for (const [nome, d] of IDIOMAS) {
      for (const chave of COM_ENFASE) {
        const valor = folhas(d).find(([k]) => k === chave)?.[1]
        expect(typeof valor, `${nome}: ${chave} sumiu do dicionário`).toBe("string")
        const marcas = (valor as string).split("§").length - 1
        expect(marcas, `${nome}: ${chave} tem ${marcas} marcas`).toBeGreaterThan(0)
        expect(marcas % 2, `${nome}: ${chave} tem marca sobrando`).toBe(0)
      }
    }
  })
})

describe("nomes das telas", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: nenhuma tela sem nome`, () => {
      for (const [chave, texto] of Object.entries(d.telas)) {
        expect(texto.trim(), `telas.${chave} vazio`).not.toBe("")
      }
    })
  }

  it("as telas mudam de idioma", () => {
    expect(en.telas.tarefas).not.toBe(pt.telas.tarefas)
    expect(en.telas.escritorio).not.toBe(pt.telas.escritorio)
    expect(en.telas.configuracoes).not.toBe(pt.telas.configuracoes)
    expect(en.telas.inicio).not.toBe(pt.telas.inicio)
  })

  // O teste espelhado do de cima: nome próprio traduzido é erro, não zelo.
  it("nome de produto NÃO se traduz", () => {
    expect(en.telas.neuroIa).toBe("Neuro IA")
    expect(pt.telas.neuroIa).toBe("Neuro IA")
  })

  it("\"Dashboard\" já era inglês, e segue igual nos dois", () => {
    expect(en.telas.inicioNav).toBe(pt.telas.inicioNav)
  })

  // O app chama o mesmo lugar de dois nomes (dock x título). A tradução expôs
  // isso; o teste registra que é conhecido, para não parecer descuido depois.
  it("o dashboard tem dois nomes de propósito", () => {
    expect(pt.telas.inicio).not.toBe(pt.telas.inicioNav)
  })
})

describe("de onde vem o idioma", () => {
  it("região manda no app", () => {
    expect(idiomaDaRegiao("BR")).toBe("pt")
    expect(idiomaDaRegiao("US")).toBe("en")
  })

  it("o formato de hora chega ao idioma sem dado novo guardado", () => {
    expect(idiomaDoFormato("24h")).toBe("pt")
    expect(idiomaDoFormato("12h")).toBe("en")
  })

  it("dicionario() devolve o certo para cada idioma", () => {
    expect(dicionario("pt")).toBe(pt)
    expect(dicionario("en")).toBe(en)
  })
})

describe("idiomaDoNavegador — quem abre um link público", () => {
  it("respeita português quando o navegador pede", () => {
    expect(idiomaDoNavegador(["pt-BR", "en-US"])).toBe("pt")
    expect(idiomaDoNavegador(["pt"])).toBe("pt")
    expect(idiomaDoNavegador(["PT-br"])).toBe("pt")
  })

  it("respeita inglês", () => {
    expect(idiomaDoNavegador(["en-GB"])).toBe("en")
  })

  it("segue a ORDEM de preferência do navegador", () => {
    expect(idiomaDoNavegador(["en-US", "pt-BR"])).toBe("en")
    expect(idiomaDoNavegador(["pt-BR", "en-US"])).toBe("pt")
  })

  it("idioma que não falamos cai em INGLÊS, não em português", () => {
    // Insistir em português com quem já não fala português é o palpite pior.
    expect(idiomaDoNavegador(["fr-FR"])).toBe("en")
    expect(idiomaDoNavegador(["ja", "ko"])).toBe("en")
  })

  it("acha o suportado mesmo depois de um não suportado", () => {
    expect(idiomaDoNavegador(["fr-FR", "pt-BR"])).toBe("pt")
  })

  it("entrada ausente ou vazia não quebra", () => {
    expect(idiomaDoNavegador(undefined)).toBe("en")
    expect(idiomaDoNavegador([])).toBe("en")
  })
})


describe("tarefas — as repetições", () => {
  // A regressão que este bloco existe para pegar: alguém acrescenta uma opção
  // em RECURRENCE_OPTIONS e esquece de nomeá-la no dicionário. O TypeScript não
  // pega, porque a chave nova continua sendo uma ChaveRepeticaoFixa válida.
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: toda opção do formulário tem nome`, () => {
      for (const o of RECURRENCE_OPTIONS) {
        const texto = d.tarefas.repeticao[o.chave]
        expect(typeof texto, `${o.value} sem nome`).toBe("string")
        expect(texto.trim()).not.toBe("")
      }
    })

    it(`${nome}: "a cada N dias" pluraliza`, () => {
      expect(d.tarefas.repeticao.aCadaNDias(1)).not.toBe(d.tarefas.repeticao.aCadaNDias(2))
      expect(d.tarefas.repeticao.aCadaNDias(3)).toContain("3")
    })

    it(`${nome}: textoDaRepeticao cobre as duas formas`, () => {
      expect(textoDaRepeticao(d, { chave: "diariamente" })).toBe(d.tarefas.repeticao.diariamente)
      expect(textoDaRepeticao(d, { chave: "aCadaNDias", dias: 5 })).toContain("5")
    })

    // Sem o `?? 1` isto viraria "a cada undefined dias" na tela.
    it(`${nome}: "a cada N dias" sem número não vira frase quebrada`, () => {
      const t = textoDaRepeticao(d, { chave: "aCadaNDias" })
      expect(t).not.toContain("undefined")
      expect(t).not.toContain("NaN")
    })
  }

  it("as repetições mudam de idioma", () => {
    expect(en.tarefas.repeticao.diariamente).not.toBe(pt.tarefas.repeticao.diariamente)
    expect(en.tarefas.repeticao.aCadaNDias(3)).not.toBe(pt.tarefas.repeticao.aCadaNDias(3))
  })
})

describe("tarefas — o resto da tela", () => {
  for (const [nome, d] of IDIOMAS) {
    it(`${nome}: os prazos do cartão pluralizam`, () => {
      // "dia(s)" era o texto antigo — a fuga que evita escolher o plural.
      expect(d.tarefas.cartao.faltamDias(1)).not.toContain("(")
      expect(d.tarefas.cartao.faltamDias(1)).not.toBe(d.tarefas.cartao.faltamDias(2))
    })

    it(`${nome}: as frases com número carregam o número`, () => {
      expect(d.tarefas.concluidas(7)).toContain("7")
      expect(d.tarefas.toastSemXpDetalhe(15)).toContain("15")
      expect(d.tarefas.dialogo.emNDias(4)).toContain("4")
      expect(d.tarefas.dialogo.semDataVale("09:30")).toContain("09:30")
      expect(d.favoritos.tarefas(3)).toContain("3")
    })

    // O toast diz "Repete: diariamente" — a minúscula é decisão do idioma, e o
    // que ele NÃO pode fazer é engolir o rótulo.
    it(`${nome}: o toast de repetição mostra o rótulo recebido`, () => {
      expect(d.tarefas.toastRepete(d.tarefas.repeticao.semanalmente).toLowerCase()).toContain(
        d.tarefas.repeticao.semanalmente.toLowerCase()
      )
    })
  }

  it("as duas telas mudam de idioma", () => {
    expect(en.tarefas.vazio).not.toBe(pt.tarefas.vazio)
    expect(en.tarefas.escopos.hoje).not.toBe(pt.tarefas.escopos.hoje)
    expect(en.tarefas.prioridades.urgent).not.toBe(pt.tarefas.prioridades.urgent)
    expect(en.favoritos.vazio).not.toBe(pt.favoritos.vazio)
  })

  // A mensagem de erro diz QUAL arquivo rodar; é a metade que resolve o
  // problema, e traduzir o nome do arquivo o tornaria impossível de achar.
  it("o nome do .sql sobrevive à tradução", () => {
    expect(en.tarefas.erroSemTabelaListas).toContain("task_lists.sql")
    expect(pt.tarefas.erroSemTabelaListas).toContain("task_lists.sql")
  })
})

describe("iniciaisDaSemana", () => {
  it("são sete, começando no domingo", () => {
    expect(iniciaisDaSemana(LOCALE.pt)).toHaveLength(7)
    expect(iniciaisDaSemana(LOCALE.en)).toHaveLength(7)
  })

  // O que a lista escrita à mão dizia — e continua certo em português.
  it("português devolve as mesmas letras da lista antiga", () => {
    expect(iniciaisDaSemana(LOCALE.pt)).toEqual(["D", "S", "T", "Q", "Q", "S", "S"])
  })

  it("inglês NÃO devolve as letras do português", () => {
    expect(iniciaisDaSemana(LOCALE.en)).toEqual(["S", "M", "T", "W", "T", "F", "S"])
  })

  it("nenhuma inicial vem vazia", () => {
    for (const locale of Object.values(LOCALE)) {
      for (const inicial of iniciaisDaSemana(locale)) {
        expect(inicial.trim()).not.toBe("")
      }
    }
  })
})


describe("notas", () => {
  for (const [nome, d] of IDIOMAS) {
    // O mesmo risco das opções de repetição: cor nova em CORES_DE_NOTA sem nome
    // no dicionário vira um botão redondo sem rótulo nenhum — e como o botão é
    // só a cor, ninguém percebe olhando.
    it(`${nome}: toda cor da paleta tem nome`, () => {
      for (const c of CORES_DE_NOTA) {
        const texto = d.notas.cores[c.id]
        expect(texto, `cor ${c.id} sem nome`).toBeTruthy()
        expect(texto.trim()).not.toBe("")
      }
    })

    // "Sem cor" e "Padrão" não são cores: são a ausência de uma. Confundi-las
    // com um nome de cor é o erro fácil aqui.
    it(`${nome}: a ausência de cor tem nome próprio`, () => {
      const nomesDeCor = Object.values(d.notas.cores)
      expect(nomesDeCor).not.toContain(d.notas.semCor)
      expect(nomesDeCor).not.toContain(d.notas.editor.corPadrao)
      expect(d.notas.editor.semFundo).not.toBe(d.notas.editor.corPadrao)
    })

    it(`${nome}: o tamanho da letra entra na dica`, () => {
      const p = d.notas.editor.tamanhos.pequeno
      expect(d.notas.editor.tamanhoDica(p)).toContain(p)
    })

    it(`${nome}: as três letras de tamanho são diferentes entre si`, () => {
      const t = d.notas.editor.tamanhos
      expect(new Set([t.pequeno, t.medio, t.grande]).size).toBe(3)
    })
  }

  // P/M/G é português; S/M/L é inglês. Letra solta parece neutra e não é — foi
  // o mesmo descuido das iniciais dos dias da semana.
  it("as letras de tamanho mudam de idioma", () => {
    expect(en.notas.editor.tamanhos.pequeno).toBe("S")
    expect(pt.notas.editor.tamanhos.pequeno).toBe("P")
    expect(en.notas.editor.tamanhos.grande).not.toBe(pt.notas.editor.tamanhos.grande)
  })

  it("a tela de notas muda de idioma", () => {
    expect(en.notas.nova).not.toBe(pt.notas.nova)
    expect(en.notas.selecione).not.toBe(pt.notas.selecione)
    expect(en.notas.cores.ambar).not.toBe(pt.notas.cores.ambar)
    expect(en.notas.editor.negrito).not.toBe(pt.notas.editor.negrito)
  })

  // O atalho é do teclado, não do idioma: Ctrl+Z é Ctrl+Z em qualquer lugar.
  it("o atalho sobrevive à tradução", () => {
    expect(en.notas.editor.desfazer).toContain("Ctrl+Z")
    expect(pt.notas.editor.desfazer).toContain("Ctrl+Z")
  })

  it("o nome do .sql sobrevive à tradução", () => {
    expect(en.notas.erroSemColunaCor).toContain("notas_cor.sql")
    expect(pt.notas.erroSemColunaCor).toContain("notas_cor.sql")
  })

  // A frase vazia cita o botão pelo nome. Se um dos dois mudar sem o outro, a
  // tela manda clicar num botão que não existe.
  it("a tela vazia manda clicar no botão que existe", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(d.notas.vazio, `${nome}`).toContain(d.notas.nova)
    }
  })
})

describe("calendário", () => {
  it("as quatro visões têm nome, e os nomes mudam de idioma", () => {
    for (const v of VISOES) {
      expect(pt.calendario.visoes[v]).not.toBe("")
      expect(en.calendario.visoes[v]).not.toBe("")
      expect(pt.calendario.visoes[v]).not.toBe(en.calendario.visoes[v])
    }
  })

  it("a semana tem sete iniciais, e a primeira é domingo nos dois", () => {
    // A grade indexa por `getDay()`, em que 0 é domingo. Uma lista de seis, ou
    // começando na segunda, desloca a semana inteira em silêncio.
    for (const [, d] of IDIOMAS) expect(d.calendario.diasDaSemana).toHaveLength(7)
    expect(pt.calendario.diasDaSemana[0]).toBe("DOM")
    expect(en.calendario.diasDaSemana[0]).toBe("SUN")
  })

  it("a vírgula decimal não viaja: 2,5h em português e 2.5h em inglês", () => {
    expect(pt.calendario.avisos.horas(2.5)).toBe("2,5h")
    expect(en.calendario.avisos.horas(2.5)).toBe("2.5h")
  })

  it("as horas arredondam em uma casa, sem dízima na tela", () => {
    for (const [, d] of IDIOMAS) {
      expect(d.calendario.avisos.horas(7.499999)).toMatch(/^7[.,]5h$/)
      expect(d.calendario.avisos.horas(8)).toBe("8h")
    }
  })

  it("todo aviso põe na frase os valores que recebeu", () => {
    // Sem isto, um aviso pode "traduzir" perdendo o número ou o título — e ele
    // vira um alerta genérico que não diz de que bloco está falando.
    for (const [, d] of IDIOMAS) {
      const a = d.calendario.avisos
      expect(a.telaAntesDeDormir("Estudar", "23:30")).toContain("Estudar")
      expect(a.telaAntesDeDormir("Estudar", "23:30")).toContain("23:30")

      const curto = a.sonoCurto("00:30", "08:00", "7,5h", "8h")
      for (const p of ["00:30", "08:00", "7,5h", "8h"]) expect(curto).toContain(p)

      const vao = a.vaoAntesDoSono("Estudar", "22:00", "Dormir", "00:30", "2,5h", "8h")
      for (const p of ["Estudar", "22:00", "Dormir", "00:30", "2,5h", "8h"]) expect(vao).toContain(p)
    }
  })

  it("a repetição do BLOCO fala a mesma língua que a da TAREFA", () => {
    // As duas listas são separadas de propósito (domínios diferentes: o bloco
    // tem "dias úteis", a tarefa tem "mensalmente" e "a cada N dias"). O que
    // NÃO pode divergir é a palavra: as três chaves em comum saem do mesmo
    // lugar, senão metade do app diz "Semanalmente" e a outra "Weekly".
    for (const [, d] of IDIOMAS) {
      for (const chave of ["naoRepete", "diariamente", "semanalmente"] as const) {
        expect(d.tarefas.repeticao[chave]).not.toBe("")
      }
      // E a que só existe no bloco tem nome próprio.
      expect(d.calendario.bloco.diasUteis).not.toBe("")
      expect(d.calendario.bloco.diasUteis).not.toBe(d.tarefas.repeticao.semanalmente)
    }
  })
})

describe("importar e exportar agenda", () => {
  const io = (d: Dicionario) => d.configuracoes.importarExportar

  it("as duas opções e o diálogo mudam de idioma", () => {
    expect(io(en).importar).not.toBe(io(pt).importar)
    expect(io(en).exportar).not.toBe(io(pt).exportar)
    expect(io(en).importarDescricao).not.toBe(io(pt).importarDescricao)
    expect(io(en).dialogo.titulo).not.toBe(io(pt).dialogo.titulo)
    expect(io(en).dialogo.escolherArquivo).not.toBe(io(pt).dialogo.escolherArquivo)
  })

  it("singular e plural são diferentes, e o número entra na frase", () => {
    for (const [nome, d] of IDIOMAS) {
      const t = io(d)
      expect(t.toastExportado(1), nome).not.toBe(t.toastExportado(2))
      expect(t.toastExportado(7), nome).toContain("7")
      expect(t.dialogo.toastImportado(1), nome).not.toBe(t.dialogo.toastImportado(2))
      expect(t.dialogo.toastImportado(3), nome).toContain("3")
      expect(t.dialogo.importarN(5), nome).toContain("5")
    }
  })

  // O resumo tem uma parte que só aparece quando há duplicados. Concatenar isso
  // no JSX era o que travava a ordem das palavras do português.
  it("o resumo só fala de duplicados quando há duplicados", () => {
    for (const [nome, d] of IDIOMAS) {
      const t = io(d).dialogo
      expect(t.resumo(12, 0), nome).toContain("12")
      expect(t.resumo(12, 0), nome).not.toContain("3")
      const com = t.resumo(12, 3)
      expect(com, nome).toContain("3")
      expect(com.length, nome).toBeGreaterThan(t.resumo(12, 0).length)
    }
  })

  it("a extensão .ics sobrevive à tradução", () => {
    // É nome de formato, não palavra: quem procura o arquivo procura ".ics".
    for (const [nome, d] of IDIOMAS) {
      expect(io(d).dialogo.escolherArquivo, nome).toContain(".ics")
      expect(io(d).dialogo.titulo, nome).toContain(".ics")
      expect(io(d).toastExportado(1), nome).toContain(".ics")
    }
  })

  it("o chip de repetição é curto — o rótulo do bloco não caberia nele", () => {
    for (const [nome, d] of IDIOMAS) {
      const chip = io(d).dialogo.repeticaoDiasUteis
      expect(chip, nome).not.toBe("")
      expect(chip.length, nome).toBeLessThan(d.calendario.bloco.diasUteis.length)
    }
  })
})

// A ajuda da região promete o que FALTA traduzir, e essa lista encolhe a cada
// fatia. Ela envelheceu em silêncio duas vezes (o calendário e as notas já
// estavam traduzidos e continuavam listados), porque nada cobrava a atualização.
// Agora cobra: ao entregar uma área, acrescente-a aqui e o teste exige que ela
// saia da frase.
describe("a ajuda da região envelhece sozinha", () => {
  const JA_TRADUZIDAS = (d: Dicionario) => [
    d.telas.inicio,
    d.telas.tarefas,
    d.telas.favoritos,
    d.telas.notas,
    d.telas.calendario,
    d.telas.configuracoes,
  ]

  it("nenhuma tela já traduzida continua na lista do que falta", () => {
    for (const [nome, d] of IDIOMAS) {
      const ajuda = d.configuracoes.aparencia.regiaoAjuda.toLowerCase()
      for (const tela of JA_TRADUZIDAS(d)) {
        expect(ajuda, `${nome}: ${tela} já foi traduzida e ainda aparece na ajuda`)
          .not.toContain(tela.toLowerCase())
      }
    }
  })

  it("as que faltam continuam nomeadas — a frase não pode virar promessa vazia", () => {
    for (const [nome, d] of IDIOMAS) {
      const ajuda = d.configuracoes.aparencia.regiaoAjuda.toLowerCase()
      for (const tela of [d.telas.amigos, d.telas.escritorio, d.telas.neuroIa]) {
        expect(ajuda, `${nome}: ${tela} falta traduzir e não está na ajuda`)
          .toContain(tela.toLowerCase())
      }
    }
  })
})
