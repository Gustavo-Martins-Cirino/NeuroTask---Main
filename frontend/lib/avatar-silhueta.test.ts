import { describe, it, expect } from "vitest"
import {
  SILHUETAS, caminhoDaGolaLevantada, caminhoDoCapuz, caminhoDoQuadrilSentado, caminhoDoTronco,
  controleQuePassaPor, silhuetaComRoupa,
  pontoDaQuadratica, silhuetaDe,
  troncoTresD, FOLGA_DO_OMBRO, TRONCO_Z_BASE, TRONCO_Z_TOPO,
} from "./avatar-silhueta"

const { m, f } = SILHUETAS

describe("as duas silhuetas são diferentes de FORMA, não de tamanho", () => {
  it("o masculino é um V: o ombro é o ponto mais largo", () => {
    expect(m.peitoL).toBeGreaterThan(m.quadrilL)
  })

  it("o feminino é ampulheta: o quadril alcança ou passa o ombro", () => {
    expect(f.quadrilL).toBeGreaterThanOrEqual(f.peitoL)
  })

  it("a cintura feminina aperta de verdade; a masculina quase não existe", () => {
    // É o aperto que faz a forma ser lida como forma. Sem um piso aqui, os dois
    // voltam a ser o mesmo desenho em duas larguras.
    expect(f.cinturaL / f.quadrilL).toBeLessThan(0.75)
    expect(m.cinturaL / m.peitoL).toBeGreaterThan(0.85)
  })

  it("escalar um no outro NÃO dá o outro — era exatamente a queixa", () => {
    // Se as duas fossem o mesmo desenho em tamanhos diferentes, as três razões
    // (ombro/quadril, cintura/quadril, ombro/cintura) seriam iguais.
    const razoes = (s: typeof m) => [s.peitoL / s.quadrilL, s.cinturaL / s.quadrilL, s.peitoL / s.cinturaL]
    const rm = razoes(m)
    const rf = razoes(f)
    for (let i = 0; i < rm.length; i++) {
      expect(Math.abs(rm[i] - rf[i])).toBeGreaterThan(0.15)
    }
  })

  it("o ombro feminino é mais estreito e um pouco mais baixo", () => {
    expect(f.ombroL).toBeLessThan(m.ombroL)
    expect(f.ombroY).toBeGreaterThan(m.ombroY) // y cresce para baixo
  })

  it("o pescoço acompanha o ombro", () => {
    expect(f.pescocoL).toBeLessThan(m.pescocoL)
  })

  it("as medidas sobem do ombro ao quadril, sem cruzar", () => {
    for (const s of [m, f]) {
      expect(s.ombroY).toBeLessThan(s.peitoY)
      expect(s.peitoY).toBeLessThan(s.cinturaY)
      expect(s.cinturaY).toBeLessThan(s.quadrilY)
      expect(s.ombroL).toBeLessThan(s.peitoL) // o ombro é mais estreito que a axila
    }
  })
})

describe("silhuetaDe", () => {
  it("qualquer coisa que não seja 'f' é o corpo masculino", () => {
    expect(silhuetaDe("f")).toBe(f)
    for (const v of ["m", "", null, undefined, 42]) expect(silhuetaDe(v)).toBe(m)
  })
})

describe("controleQuePassaPor", () => {
  it("a curva passa PELA cintura, não perto dela", () => {
    // Usar a cintura como ponto de controle direto deixaria o aperto pela
    // metade, e a forma voltaria a ser um V de lado reto.
    const p0 = 13, p2 = 10.6, meio = 7.9
    const c = controleQuePassaPor(p0, p2, meio)
    expect(pontoDaQuadratica(p0, c, p2, 0.5)).toBeCloseTo(meio, 10)
  })

  it("sem aperto, o controle fica no meio do caminho", () => {
    const c = controleQuePassaPor(10, 10, 10)
    expect(c).toBeCloseTo(10, 10)
  })
})

describe("caminhoDoTronco", () => {
  const numeros = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

  it("sai um path fechado e sem NaN", () => {
    for (const s of [m, f]) {
      const d = caminhoDoTronco(s)
      expect(d.endsWith("Z")).toBe(true)
      expect(d).not.toContain("NaN")
      expect(numeros(d).every(Number.isFinite)).toBe(true)
    }
  })

  it("é simétrico no eixo do corpo", () => {
    // O centro do bonequinho é x = 1: o tronco não pode nascer torto.
    const d = caminhoDoTronco(m, 1)
    expect(d).toContain(`${1 - m.peitoL} `)
    expect(d).toContain(`${1 + m.peitoL} `)
  })

  it("respeita o centro que receber", () => {
    expect(caminhoDoTronco(m, 0)).not.toBe(caminhoDoTronco(m, 1))
  })
})

describe("caminhoDoQuadrilSentado", () => {
  it("nasce da mesma largura do tronco, senão a emenda aparece", () => {
    const d = caminhoDoQuadrilSentado(f, 1)
    expect(d).toContain(`${1 - f.quadrilL} `)
    expect(d).toContain(`${1 + f.quadrilL} `)
  })

  it("o quadril feminino é mais largo que o masculino também sentado", () => {
    expect(f.quadrilL).toBeGreaterThan(m.quadrilL)
  })
})

describe("a roupa muda a silhueta, não só a cor", () => {
  it("a camiseta é a régua: ela não mexe em nada", () => {
    // É contra ela que as outras três se leem. Se ela também engordasse, não
    // haveria base de comparação.
    expect(silhuetaComRoupa(m, "camiseta")).toEqual(m)
  })

  it("o terno tem o ombro mais largo das quatro — é a ombreira", () => {
    const ombros = (["camiseta", "moletom", "jaqueta", "terno"] as const)
      .map((r) => silhuetaComRoupa(m, r).ombroL)
    expect(Math.max(...ombros)).toBe(silhuetaComRoupa(m, "terno").ombroL)
  })

  it("o moletom some com a cintura — peça larga faz isso com quem a veste", () => {
    const largo = silhuetaComRoupa(f, "moletom")
    const justo = silhuetaComRoupa(f, "camiseta")
    expect(largo.cinturaL / largo.quadrilL).toBeGreaterThan(justo.cinturaL / justo.quadrilL)
  })

  it("a jaqueta encorpa o tronco e para na barra: o quadril quase não muda", () => {
    const j = silhuetaComRoupa(m, "jaqueta")
    expect(j.peitoL - m.peitoL).toBeGreaterThan(j.quadrilL - m.quadrilL)
  })

  it("as quatro dão contornos DIFERENTES, no mesmo corpo", () => {
    // O defeito antigo: as quatro eram o mesmo tronco com um detalhe fino por
    // dentro, que some no tamanho em que o boneco é desenhado.
    const paths = new Set(
      (["camiseta", "moletom", "jaqueta", "terno"] as const)
        .map((r) => caminhoDoTronco(silhuetaComRoupa(m, r)))
    )
    expect(paths.size).toBe(4)
  })

  it("roupa desconhecida cai na camiseta em vez de quebrar", () => {
    for (const v of [null, undefined, "toga", 42]) {
      expect(silhuetaComRoupa(m, v)).toEqual(m)
    }
  })

  it("nenhuma roupa inverte a silhueta do corpo", () => {
    // Engordar não pode transformar o V masculino em ampulheta nem o contrário.
    for (const r of ["camiseta", "moletom", "jaqueta", "terno"] as const) {
      expect(silhuetaComRoupa(m, r).peitoL).toBeGreaterThan(silhuetaComRoupa(m, r).quadrilL)
      expect(silhuetaComRoupa(f, r).quadrilL).toBeGreaterThan(silhuetaComRoupa(f, r).cinturaL)
    }
  })
})

describe("capuz e gola", () => {
  it("o capuz passa da linha do ombro — por dentro ele sumiria", () => {
    const d = caminhoDoCapuz(m, 1)
    const xs = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((x) => Number(x[1]))
    expect(Math.max(...xs)).toBeGreaterThan(1 + m.ombroL)
    expect(Math.min(...xs)).toBeLessThan(1 - m.ombroL)
  })

  it("o capuz sobe acima do ombro, que é onde o olho pega o contorno", () => {
    const d = caminhoDoCapuz(m, 1)
    const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((x) => Number(x[2]))
    expect(Math.min(...ys)).toBeLessThan(m.ombroY)
  })

  it("a gola da jaqueta são dois cantos, e os dois passam do ombro para cima", () => {
    const d = caminhoDaGolaLevantada(m, 1)
    expect((d.match(/M /g) ?? []).length).toBe(2)
    const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((x) => Number(x[2]))
    expect(Math.min(...ys)).toBeLessThan(m.ombroY)
  })

  it("os dois saem sem NaN em qualquer corpo", () => {
    for (const s of [m, f]) {
      expect(caminhoDoCapuz(s)).not.toContain("NaN")
      expect(caminhoDaGolaLevantada(s)).not.toContain("NaN")
    }
  })
})

describe("troncoTresD — o boneco 3D da sala lê a mesma silhueta", () => {
  const m = troncoTresD("m")
  const f = troncoTresD("f")
  const [quadrilM, cinturaM, peitoM, ombroM] = m.niveis
  const [quadrilF, cinturaF, peitoF, ombroF] = f.niveis

  it("o peito masculino é EXATAMENTE o tronco que a sala já tinha", () => {
    // A âncora do encaixe. Se este número andar, a cabeça, a cadeira e o
    // alcance do braço até o teclado andam junto — e nada disso foi pedido.
    expect(peitoM.meiaLargura).toBeCloseTo(0.16, 6)
    expect(peitoM.meioFundo).toBeCloseTo(0.12, 6)
  })

  it("a bola do ombro encosta no tronco nos dois corpos", () => {
    // Ela não pode flutuar ao lado de um peito mais estreito.
    expect(m.xDoOmbro - peitoM.meiaLargura).toBeCloseTo(FOLGA_DO_OMBRO, 6)
    expect(f.xDoOmbro - peitoF.meiaLargura).toBeCloseTo(FOLGA_DO_OMBRO, 6)
    expect(m.xDoOmbro).toBeCloseTo(0.175, 6)
  })

  it("masculino é V: o peito é o ponto mais largo, e passa o quadril", () => {
    expect(peitoM.meiaLargura).toBeGreaterThan(quadrilM.meiaLargura)
    expect(peitoM.meiaLargura).toBeGreaterThan(cinturaM.meiaLargura)
  })

  it("feminino é ampulheta: o quadril alcança o peito e a cintura aperta", () => {
    expect(quadrilF.meiaLargura).toBeGreaterThan(peitoF.meiaLargura)
    expect(cinturaF.meiaLargura).toBeLessThan(quadrilF.meiaLargura * 0.8)
  })

  it("o que separa os dois são RAZÕES, não tamanho", () => {
    // Se fossem o mesmo desenho em duas escalas, estas três seriam iguais.
    // É a queixa do Gustavo sobre o 2D, cobrada agora também no 3D.
    const razoes = (t: typeof m) => {
      const [q, c, p] = t.niveis
      return [p.meiaLargura / q.meiaLargura, c.meiaLargura / q.meiaLargura, p.meiaLargura / c.meiaLargura]
    }
    const rm = razoes(m), rf = razoes(f)
    for (let i = 0; i < 3; i++) expect(Math.abs(rm[i] - rf[i])).toBeGreaterThan(0.1)
  })

  it("o tronco não muda de envelope: os dois vão do mesmo chão ao mesmo teto", () => {
    for (const t of [m, f]) {
      expect(t.niveis[0].z).toBeCloseTo(TRONCO_Z_BASE, 6)
      expect(t.niveis[3].z).toBeCloseTo(TRONCO_Z_TOPO, 6)
    }
  })

  it("os níveis sobem em ordem, sem inversão", () => {
    for (const t of [m, f]) {
      for (let i = 1; i < 4; i++) expect(t.niveis[i].z).toBeGreaterThan(t.niveis[i - 1].z)
    }
  })

  it("o fundo acompanha a largura — tronco que afina só de frente vira tábua", () => {
    for (const n of [...m.niveis, ...f.niveis]) {
      expect(n.meioFundo / n.meiaLargura).toBeCloseTo(0.12 / 0.16, 6)
    }
  })

  it("a linha do ombro do corpo feminino é mais baixa que a do masculino", () => {
    // A terceira relação da silhueta: ombro quadrado e alto contra estreito e
    // um pouco mais baixo. Sai da reescala das alturas, não de um número solto.
    expect(peitoF.z).toBeLessThan(peitoM.z)
  })
})
