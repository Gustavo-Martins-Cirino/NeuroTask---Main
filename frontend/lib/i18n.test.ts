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
    "configuracoes.assinar.ondeColar",
    "ia.semSuporteVoz",
    "foco.youtube.ajuda",
    "entrada.login.olheOSpam",
    "entrada.cadastro.naoChegou",
    "entrada.senhaNova.soOMaisRecente",
    "amigos.dica",
    "landing.heroTitulo",
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

// A ajuda da região promete o que FALTA traduzir, e essa lista encolheu a
// cada fatia até sumir. Ela envelheceu em silêncio duas vezes (o calendário e
// as notas já estavam traduzidos e continuavam listados), porque nada cobrava
// a atualização — daí o teste abaixo.
//
// Com o Escritório (14/09) a lista chegou a ZERO: todas as telas estão
// traduzidas, e a ajuda não promete mais nada pendente. Se um dia entrar tela
// nova sem tradução, a frase muda para nomeá-la — e aí volta a fazer sentido
// reescrever este describe no formato antigo (JA_TRADUZIDAS × o que falta).
describe("a ajuda da região envelhece sozinha", () => {
  const TODAS_AS_TELAS = (d: Dicionario) => [
    d.telas.inicio,
    d.telas.tarefas,
    d.telas.favoritos,
    d.telas.notas,
    d.telas.calendario,
    d.telas.configuracoes,
    d.telas.amigos,
    d.telas.neuroIa,
    d.telas.escritorio,
  ]

  it("nenhuma tela traduzida aparece na ajuda como se ainda faltasse", () => {
    for (const [nome, d] of IDIOMAS) {
      const ajuda = d.configuracoes.aparencia.regiaoAjuda.toLowerCase()
      for (const tela of TODAS_AS_TELAS(d)) {
        expect(ajuda, `${nome}: ${tela} já foi traduzida e ainda aparece na ajuda`)
          .not.toContain(tela.toLowerCase())
      }
    }
  })

  it("nada falta mais: a ajuda não promete tradução pendente", () => {
    for (const [nome, d] of IDIOMAS) {
      const ajuda = d.configuracoes.aparencia.regiaoAjuda.toLowerCase()
      expect(ajuda, `${nome}: a ajuda ainda fala de tradução em andamento`).not.toMatch(/tradu/)
    }
  })
})

describe("assinar a agenda no Google/Outlook", () => {
  const a = (d: Dicionario) => d.configuracoes.assinar

  it("os rótulos e a explicação mudam de idioma", () => {
    expect(a(en).explicacao).not.toBe(a(pt).explicacao)
    expect(a(en).copiar).not.toBe(a(pt).copiar)
    expect(a(en).gerar).not.toBe(a(pt).gerar)
    expect(a(en).toastCopiado).not.toBe(a(pt).toastCopiado)
  })

  it("o nome do .sql sobrevive à tradução nos três erros", () => {
    // É o que resolve a falha: sem o nome do arquivo a mensagem não serve.
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).erroSemTabela, nome).toContain("calendar_feed.sql")
      expect(a(d).erroPermissao, nome).toContain("calendar_feed.sql")
      expect(a(d).erroCacheSchema, nome).not.toBe("")
    }
  })

  // O feed é SÓ-LEITURA, e é isso que tira o medo de colar o link num serviço de
  // fora. A promessa não pode sumir na tradução.
  it("a explicação diz que ninguém edita a agenda pelo link", () => {
    expect(a(pt).explicacao.toLowerCase()).toContain("só-leitura")
    expect(a(en).explicacao.toLowerCase()).toContain("read-only")
  })

  it("gerar de novo avisa que o link antigo morre", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).gerarNovo.length, nome).toBeGreaterThan(a(d).gerar.length / 2)
      expect(a(d).gerarNovo, nome).not.toBe(a(d).gerar)
    }
  })
})

describe("amigos — convidar para um compromisso", () => {
  const c = (d: Dicionario) => d.amigos.convite

  it("os rótulos mudam de idioma", () => {
    expect(c(en).sugerir).not.toBe(c(pt).sugerir)
    expect(c(en).enviar).not.toBe(c(pt).enviar)
    expect(c(en).aviso).not.toBe(c(pt).aviso)
    expect(c(en).tituloPlaceholder).not.toBe(c(pt).tituloPlaceholder)
  })

  it("o nome de quem se convida entra no título", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(c(d).titulo("Ana"), nome).toContain("Ana")
      // Sem nome público o app passa o @usuário, e a arroba tem de sobreviver.
      expect(c(d).titulo("@ana"), nome).toContain("@ana")
    }
  })

  it("o @usuário aparece no aviso de convite enviado", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(c(d).toastEnviado("gustavo"), nome).toContain("@gustavo")
    }
  })

  it("a duração escolhida entra na frase de nenhuma janela livre", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(c(d).semJanela(45), nome).toContain("45")
      expect(c(d).semJanela(45), nome).not.toBe(c(d).semJanela(90))
    }
  })

  // "Das 14:00 às 15:00" e "From 14:00 to 15:00" — a construção é diferente, e
  // é por isso que são duas chaves em vez de uma frase montada no JSX.
  it("o par das/às não é a mesma palavra, e nenhuma das duas vem vazia", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(c(d).das.trim(), nome).not.toBe("")
      expect(c(d).as.trim(), nome).not.toBe("")
      expect(c(d).das, nome).not.toBe(c(d).as)
    }
  })
})

describe("amigos — a seção inteira", () => {
  const a = (d: Dicionario) => d.amigos

  it("os rótulos da tela mudam de idioma", () => {
    expect(a(en).buscaPlaceholder).not.toBe(a(pt).buscaPlaceholder)
    expect(a(en).sugeridos).not.toBe(a(pt).sugeridos)
    expect(a(en).vazio).not.toBe(a(pt).vazio)
    expect(a(en).escolherUsuario.titulo).not.toBe(a(pt).escolherUsuario.titulo)
    expect(a(en).privacidade.ocupadoLivre).not.toBe(a(pt).privacidade.ocupadoLivre)
  })

  // A dica do interruptor diz o que os amigos veem — e o que NÃO veem. As duas
  // metades são frases diferentes, e trocá-las inverte a promessa de privacidade.
  it("a dica de privacidade distingue ver de NÃO ver, e nomeia o campo", () => {
    for (const [nome, d] of IDIOMAS) {
      const campo = a(d).privacidade.nivel
      const sim = a(d).privacidade.dica(true, campo)
      const nao = a(d).privacidade.dica(false, campo)
      expect(sim, nome).toContain(campo)
      expect(nao, nome).toContain(campo)
      expect(sim, nome).not.toBe(nao)
    }
  })

  it("o @usuário entra em cada aviso que fala de uma pessoa", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).escolherUsuario.toastPronto("ana"), nome).toContain("@ana")
      expect(a(d).toastPedidoEnviado("ana"), nome).toContain("@ana")
      expect(a(d).toastAmizadeAceita("ana"), nome).toContain("@ana")
    }
  })

  it("o nome do amigo entra no título da agenda e da visita", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).agendaDoDia.titulo("Ana"), nome).toContain("Ana")
      expect(a(d).visita.titulo("Ana"), nome).toContain("Ana")
      // Sem nome público o app passa o @usuário.
      expect(a(d).visita.titulo("@ana"), nome).toContain("@ana")
    }
  })

  it("singular e plural dos itens do escritório visitado são diferentes", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).visita.itens(1), nome).not.toBe(a(d).visita.itens(2))
      expect(a(d).visita.itens(9), nome).toContain("9")
    }
  })

  // "de @ana" e "para @ana" dizem quem convidou quem. Iguais, o cartão do
  // convite deixa de dizer a única coisa que ele precisa dizer.
  it("de e para não são a mesma palavra", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).convitesRecebidos.de, nome).not.toBe(a(d).convitesRecebidos.para)
      expect(a(d).convitesRecebidos.de.trim(), nome).not.toBe("")
    }
  })

  // O mesmo para ocupado/livre: é o estado do amigo na lista.
  it("ocupado e livre não são a mesma palavra", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).ocupado, nome).not.toBe(a(d).livre)
      expect(a(d).privado, nome).not.toBe(a(d).livre)
    }
  })

  // A agenda pública e o diálogo do amigo dizem a mesma ideia em registros
  // diferentes (rótulo de linha × comemoração). São chaves separadas de
  // propósito, e o teste registra isso — não é descuido.
  it("o dia livre do diálogo comemora; o da agenda pública é só rótulo", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(a(d).agendaDoDia.livreODiaTodo, nome).not.toBe(d.agenda.livreODiaTodo)
      expect(a(d).agendaDoDia.livreODiaTodo, nome).toContain("🎉")
      expect(d.agenda.livreODiaTodo, nome).not.toContain("🎉")
    }
  })

  // "Lvl" é abreviação, como "Dashboard": igual nos dois idiomas de propósito.
  it("Lvl não se traduz, e o número entra", () => {
    expect(pt.amigos.visita.nivel(7)).toBe(en.amigos.visita.nivel(7))
    expect(pt.amigos.visita.nivel(7)).toContain("7")
  })
})

describe("Modo Foco", () => {
  it("os nomes de ambiente, de seção e de som mudam de idioma", () => {
    expect(en.foco.ambientes.light).not.toBe(pt.foco.ambientes.light)
    expect(en.foco.mixer.secoes.music).not.toBe(pt.foco.mixer.secoes.music)
    expect(en.foco.mixer.faixas.rain).not.toBe(pt.foco.mixer.faixas.rain)
  })

  // Gênero musical que o português já diz em inglês não se traduz: "Lo-fi" em
  // português é "Lo-fi". É o erro oposto ao de cima, e o mais fácil de cometer
  // numa varredura — como "Neuro IA" e "Dashboard".
  it("gênero que já é inglês fica igual nos dois", () => {
    expect(en.foco.mixer.faixas.lofi).toBe(pt.foco.mixer.faixas.lofi)
    expect(en.foco.mixer.faixas.chillhop).toBe(pt.foco.mixer.faixas.chillhop)
  })

  it("o nome da faixa entra no rótulo do leitor de tela", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(d.foco.mixer.ativar("Chuva"), nome).toContain("Chuva")
      expect(d.foco.mixer.desativar("Chuva"), nome).toContain("Chuva")
      expect(d.foco.mixer.volumeDe("Chuva"), nome).toContain("Chuva")
      expect(d.foco.restantes("12:30"), nome).toContain("12:30")
    }
  })
})

describe("antes de entrar", () => {
  it("login, cadastro e senha mudam de idioma", () => {
    expect(en.entrada.entrar).not.toBe(pt.entrada.entrar)
    expect(en.entrada.login.erros.credenciaisInvalidas).not.toBe(pt.entrada.login.erros.credenciaisInvalidas)
    expect(en.entrada.senhaNova.erros.senhasDiferentes).not.toBe(pt.entrada.senhaNova.erros.senhasDiferentes)
  })

  // As frases com o e-mail dentro são FUNÇÕES, então a varredura de ênfase
  // acima não as alcança. Cobrado aqui: o e-mail entra, e as marcas vêm em par.
  it("as frases com e-mail o levam, com a ênfase em par", () => {
    for (const [nome, d] of IDIOMAS) {
      for (const frase of [d.entrada.cadastro.enviamosConfirmacao("ana@x.com"), d.entrada.senhaNova.seExistirConta("ana@x.com")]) {
        expect(frase, nome).toContain("ana@x.com")
        expect((frase.split("§").length - 1) % 2, `${nome}: marca sobrando`).toBe(0)
      }
    }
  })

  it("o provedor e a contagem entram no texto", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(d.entrada.social.entrarCom("GitHub"), nome).toContain("GitHub")
      expect(d.entrada.social.criarContaCom("Google"), nome).toContain("Google")
      expect(d.entrada.social.erroProvedor("Apple"), nome).toContain("Apple")
      expect(d.entrada.cadastro.reenviadoAguarde(42), nome).toContain("42")
    }
  })
})

describe("o que sobrava dentro das telas", () => {
  it("muda de idioma", () => {
    expect(en.inicio.comecePorAqui.titulo).not.toBe(pt.inicio.comecePorAqui.titulo)
    expect(en.amigos.dica).not.toBe(pt.amigos.dica)
    expect(en.configuracoes.sugestoesDaRotina).not.toBe(pt.configuracoes.sugestoesDaRotina)
    expect(en.escritorio.semWebgl.texto).not.toBe(pt.escritorio.semWebgl.texto)
  })

  // A dica cita botões pelo nome. Se o rótulo do chip mudar no dicionário e a
  // dica não, ela passa a mandar a pessoa procurar um botão que não existe.
  it("a dica de Amigos cita o chip pelo nome que ele tem em cada idioma", () => {
    for (const [nome, d] of IDIOMAS) {
      const chip = (nome === "pt" ? "Agenda" : "Schedule")
      expect(d.amigos.dica, nome).toContain(chip)
    }
  })
})

describe("dashboard: a enquete e Seus números", () => {
  // A resposta é gravada em português pela POSIÇÃO da opção escolhida. Se o
  // inglês tiver outra quantidade de opções, quem responde em inglês grava a
  // resposta errada no painel do dono — e ninguém veria.
  it("as opções da enquete casam por posição nos dois idiomas", () => {
    for (const [id, p] of Object.entries(pt.inicio.enquete.perguntas)) {
      const e = en.inicio.enquete.perguntas[id as keyof typeof pt.inicio.enquete.perguntas]
      expect(e.opcoes.length, id).toBe(p.opcoes.length)
    }
  })

  it("toda pergunta cabe num toque: texto, de 2 a 4 opções, sem repetir", () => {
    for (const [nome, d] of IDIOMAS) {
      for (const [id, p] of Object.entries(d.inicio.enquete.perguntas)) {
        expect(p.texto.length, `${nome}: ${id}`).toBeGreaterThan(10)
        expect(p.opcoes.length, `${nome}: ${id}`).toBeGreaterThanOrEqual(2)
        // Mais que quatro e a pessoa passa a LER a enquete em vez de responder.
        expect(p.opcoes.length, `${nome}: ${id}`).toBeLessThanOrEqual(4)
        expect(new Set(p.opcoes).size, `${nome}: ${id}`).toBe(p.opcoes.length)
      }
    }
  })

  // Era "Você aparece mais na sábado — 3 das últimas 4": artigo e concordância fixos.
  it("em português o artigo e a concordância seguem o dia", () => {
    expect(pt.inicio.seusNumeros.apareceMais(0, 3, 4)).toContain("na segunda")
    expect(pt.inicio.seusNumeros.apareceMais(0, 3, 4)).toContain("das últimas 4")
    expect(pt.inicio.seusNumeros.apareceMais(5, 3, 4)).toContain("no sábado")
    expect(pt.inicio.seusNumeros.apareceMais(6, 3, 4)).toContain("dos últimos 4")
  })

  it("da 1h e da 0h são singulares; das 10h e das 12 PM, plurais", () => {
    expect(pt.inicio.seusNumeros.rendeMais("1h")).toContain("da 1h")
    expect(pt.inicio.seusNumeros.rendeMais("0h")).toContain("da 0h")
    expect(pt.inicio.seusNumeros.rendeMais("1 PM")).toContain("da 1 PM")
    expect(pt.inicio.seusNumeros.rendeMais("10h")).toContain("das 10h")
    expect(pt.inicio.seusNumeros.rendeMais("12 PM")).toContain("das 12 PM")
  })

  it("sete dias, segunda primeiro, nos dois idiomas", () => {
    for (const [nome, d] of IDIOMAS) expect(d.inicio.seusNumeros.diasCurtos, nome).toHaveLength(7)
    expect(pt.inicio.seusNumeros.diasCurtos[0]).toBe("Seg")
    expect(en.inicio.seusNumeros.diasCurtos[0]).toBe("Mon")
  })

  it("singular e plural mudam nos números", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(d.inicio.seusNumeros.tarefas(1), nome).not.toBe(d.inicio.seusNumeros.tarefas(2).replace("2", "1"))
      expect(d.inicio.seusNumeros.vezes(1, 1), nome).not.toBe(d.inicio.seusNumeros.vezes(1, 2).replace("2", "1"))
    }
  })
})

describe("as telas de erro", () => {
  it("mudam de idioma", () => {
    expect(en.erro.publico.titulo).not.toBe(pt.erro.publico.titulo)
    expect(en.erro.app.texto).not.toBe(pt.erro.app.texto)
    expect(en.erro.naoEncontrada.titulo).not.toBe(pt.erro.naoEncontrada.titulo)
    expect(en.erro.tentarDeNovo).not.toBe(pt.erro.tentarDeNovo)
  })

  // A régua destas telas: a culpa é do app, não de quem está lendo. Se a frase
  // virar "você fez algo errado", o conserto é o texto, não o teste.
  it("não culpam quem está lendo", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(d.erro.publico.texto.toLowerCase(), nome).toMatch(/nosso|ours/)
      expect(d.erro.app.texto.toLowerCase(), nome).toMatch(/nosso|ours/)
    }
  })
})

describe("o que fala fora de uma tela", () => {
  it("os avisos de check-in mudam de idioma", () => {
    expect(en.moldura.checkin.conseguiu).not.toBe(pt.moldura.checkin.conseguiu)
    expect(en.moldura.checkin.conclui).not.toBe(pt.moldura.checkin.conclui)
    expect(en.moldura.checkin.reagendado("X")).not.toBe(pt.moldura.checkin.reagendado("X"))
    expect(en.moldura.checkin.lembreteDoSistema).not.toBe(pt.moldura.checkin.lembreteDoSistema)
  })

  // O título do bloco é de quem escreveu: ele aparece igual nos dois idiomas, e
  // só a moldura da frase muda.
  it("o título do bloco entra inteiro na frase, nos dois idiomas", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(d.moldura.checkin.registrado("Ler o artigo"), nome).toContain("Ler o artigo")
    }
  })

  it("o selo da imagem do Escritório leva o nível e muda de idioma", () => {
    expect(pt.escritorio.seloDaImagem(7)).toContain("7")
    expect(en.escritorio.seloDaImagem(7)).toContain("7")
    expect(en.escritorio.seloDaImagem(7)).not.toBe(pt.escritorio.seloDaImagem(7))
  })

  it("o nome de reserva do evento sem SUMMARY muda de idioma", () => {
    expect(en.configuracoes.importarExportar.dialogo.semTitulo).not.toBe(
      pt.configuracoes.importarExportar.dialogo.semTitulo
    )
  })
})

describe("a landing", () => {
  it("muda de idioma inteira", () => {
    expect(en.landing.heroSubtitulo).not.toBe(pt.landing.heroSubtitulo)
    expect(en.landing.privacidadeTexto).not.toBe(pt.landing.privacidadeTexto)
    for (const id of Object.keys(pt.landing.recursos) as (keyof typeof pt.landing.recursos)[]) {
      expect(en.landing.recursos[id].titulo, id).not.toBe(pt.landing.recursos[id].titulo)
      expect(en.landing.recursos[id].texto, id).not.toBe(pt.landing.recursos[id].texto)
    }
  })

  // "NeuroTask" e "Neuro IA" são nome próprio: o produto não muda de nome em
  // inglês. Só o "IA" vira "AI", porque ali é a sigla, não o nome.
  it("o nome do produto não é traduzido", () => {
    expect(en.landing.heroSubtitulo).toContain("NeuroTask")
    expect(pt.landing.heroSubtitulo).toContain("NeuroTask")
    expect(pt.landing.recursos.ia.titulo).toBe("Neuro IA")
    expect(en.landing.recursos.ia.titulo).toBe("Neuro AI")
  })

  // Os seis cartões existem porque os seis recursos existem. Se alguém tirar um
  // do app, este teste não avisa — mas se tirar do dicionário, a tela quebraria
  // calada, e aqui ela quebra antes.
  it("são seis recursos, nos dois idiomas", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(Object.keys(d.landing.recursos), nome).toHaveLength(6)
    }
  })
})

// O caso perigoso do relatório de 22/09: um lote de 10 em que só 2 entraram, e
// a prosa dizia "Já salvei o que você pediu — está tudo aqui embaixo… não
// precisa reenviar". O texto desencorajava o reenvio justamente quando faltavam
// 8. O servidor sabe QUANTOS itens gravou; não sabe quantos foram pedidos —
// então a frase não pode prometer inteireza.
describe("o aviso de limite depois de já ter gravado", () => {
  const frase = (d: Dicionario, n: number) => d.ia.erros.salvouAntesDoLimite(n)

  it("diz o número do que entrou, e ele muda", () => {
    for (const [nome, d] of IDIOMAS) {
      expect(frase(d, 2), nome).toContain("2")
      expect(frase(d, 10), nome).toContain("10")
      expect(frase(d, 1), nome).not.toBe(frase(d, 2))
    }
  })

  it("singular e plural do item", () => {
    expect(frase(pt, 1)).toContain("1 item")
    expect(frase(pt, 3)).toContain("3 itens")
    expect(frase(en, 1)).toContain("1 item")
    expect(frase(en, 3)).toContain("3 items")
  })

  // As duas frases que o relatório provou serem perigosas.
  it("NÃO promete que salvou tudo, nem manda não reenviar", () => {
    for (const [nome, d] of IDIOMAS) {
      const t = frase(d, 2).toLowerCase()
      expect(t, `${nome}: não pode prometer inteireza`).not.toMatch(/está tudo|it's all|it is all/)
      expect(t, `${nome}: não pode desencorajar o reenvio`).not.toMatch(/não precisa reenviar|no need to resend/)
    }
  })

  // O que ela PRECISA dizer: parou no meio, e o reenvio é parcial — pedir tudo
  // de novo duplicaria o que já entrou.
  it("avisa que parou no meio e pede só o que faltou", () => {
    expect(frase(pt, 2).toLowerCase()).toContain("parei no meio")
    expect(frase(pt, 2).toLowerCase()).toContain("só o que faltou")
    expect(frase(pt, 2).toLowerCase()).toContain("duplicaria")
    expect(frase(en, 2).toLowerCase()).toContain("stopped partway")
    expect(frase(en, 2).toLowerCase()).toContain("duplicate")
  })

  it("os dois idiomas não devolvem o mesmo texto", () => {
    expect(frase(en, 2)).not.toBe(frase(pt, 2))
  })
})
