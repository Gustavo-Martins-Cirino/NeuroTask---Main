// Faixa de nível: o nome do degrau e UMA cor de destaque.
//
// A primeira versão disto era uma faixa de mesh gradient ocupando o topo do
// Dashboard. Ficou chamativa demais e brigava com o resto da tela — o laranja
// de "Veterano" não conversava com nada em volta, e qualquer outra cor teria o
// mesmo problema, porque o app tem uma paleta própria (oklch, hue azulado).
//
// Agora a diferenciação existe, mas em ÁREA PEQUENA: um ponto colorido num selo
// que, no resto, usa os tokens do tema. Cor como acento, não como fundo.

export interface Faixa {
  nome: string
  /** Cor do ponto. Croma contido de propósito: convive com a paleta do app. */
  cor: string
}

const FAIXAS: { min: number; faixa: Faixa }[] = [
  { min: 1, faixa: { nome: "Começando", cor: "#8b93a7" } },
  { min: 3, faixa: { nome: "Em ritmo", cor: "#5b8fc9" } },
  { min: 5, faixa: { nome: "Constante", cor: "#4f9e8f" } },
  { min: 8, faixa: { nome: "Avançado", cor: "#8b7bc4" } },
  { min: 12, faixa: { nome: "Veterano", cor: "#c2915a" } },
  { min: 18, faixa: { nome: "Lendário", cor: "#c47ba0" } },
]

export function faixaDoNivel(nivel: number): Faixa {
  const n = Number.isFinite(nivel) ? nivel : 1
  let atual = FAIXAS[0].faixa
  for (const f of FAIXAS) if (n >= f.min) atual = f.faixa
  return atual
}
