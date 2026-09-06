// Onde o painel de feedback abre, quando o botão que o abre não está na borda
// da tela.
//
// O painel cresce do ícone e é ancorado pela DIREITA nele — o que é certo no
// desktop e quebra no celular: o ícone fica no meio da fileira do cabeçalho
// (tem o tema e o avatar à direita dele), então 352px de painel a partir dali
// não cabem à esquerda. Medido num 390×844: a borda esquerda caía em **-66px**,
// e o pai tem `overflow-hidden`, então nem rolando dava para alcançar o começo
// do texto — o campo de escrever e o botão "Problema" ficavam cortados.
//
// A saída não é ancorar na janela: o cabeçalho tem `backdrop-blur`, e isso faz
// dele o bloco de contenção de qualquer filho `fixed` — `fixed` ali não escapa
// para a viewport, e a correção pareceria funcionar por acidente. Então o
// painel continua ancorado no ícone e só ESCORREGA para a direita o tanto que
// falta para caber.

/** A largura do painel onde ele cabe inteiro (22rem). */
export const LARGURA_PAINEL = 352

/** O respiro mínimo entre o painel e a borda da tela. */
export const MARGEM_TELA = 12

export interface CaixaAncorada {
  largura: number
  /** Quanto o painel escorrega para a direita, em px. Zero quando já cabe. */
  deslocamento: number
}

/**
 * A caixa do painel, a partir da borda direita do botão e da largura da tela.
 *
 * O deslocamento é escolhido para pousar a borda esquerda exatamente em
 * `MARGEM_TELA`. Como a largura nunca passa de `tela - 2 × margem`, a borda
 * direita cai sozinha dentro da margem do outro lado — não há um segundo
 * limite para impor, e há teste para isso.
 */
export function ancorarPainel(bordaDireitaDoBotao: number, larguraDaTela: number): CaixaAncorada {
  const cabe = Math.max(0, larguraDaTela - MARGEM_TELA * 2)
  const largura = Math.min(LARGURA_PAINEL, cabe)
  const bordaEsquerda = bordaDireitaDoBotao - largura
  return { largura, deslocamento: Math.max(0, MARGEM_TELA - bordaEsquerda) }
}
