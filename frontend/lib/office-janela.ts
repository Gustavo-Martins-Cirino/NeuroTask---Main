// Quando a sala do Escritório vira janela flutuante.
//
// A loja fica embaixo da sala, e a prévia de um item (passar o mouse, tocar)
// aparece NA SALA. Quem rolava até os itens de baixo empurrava o TOPO da sala
// para baixo do cabeçalho — e é no topo que ficam quadro, prateleira, janela,
// relógio. Encolher a sala para caber ao lado da loja já foi recusado (ela é a
// recompensa do app), então ela só flutua quando o topo some — como o mini
// player de vídeo — e volta ao lugar quando a pessoa sobe.
//
// A medida é quanto do topo da sala já passou por baixo do cabeçalho, e não
// quanto dela aparece: com uma categoria curta a página mal rola, a sala segue
// "meio visível" e mesmo assim a metade de cima, a que importava, sumiu.
//
// Histerese: flutua com mais de 25% do topo escondido e só volta abaixo de 12%.
// Sem a folga, parar a rolagem bem na fronteira faria a janela piscar.

export const FLUTUA_COM_TOPO_ESCONDIDO = 0.25
export const VOLTA_COM_TOPO_ESCONDIDO = 0.12

/**
 * @param topo        topo da sala na janela do navegador (px)
 * @param altura      altura da sala (px)
 * @param limite      onde começa a área útil: o fundo do cabeçalho fixo (px)
 * @param flutuando   se ela já está flutuando agora
 */
export function salaFlutua(topo: number, altura: number, limite: number, flutuando: boolean): boolean {
  if (!Number.isFinite(topo) || !Number.isFinite(altura) || !Number.isFinite(limite) || altura <= 0) return false
  const escondido = (limite - topo) / altura
  return flutuando ? escondido > VOLTA_COM_TOPO_ESCONDIDO : escondido > FLUTUA_COM_TOPO_ESCONDIDO
}
