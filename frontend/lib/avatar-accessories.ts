// Acessórios vestíveis da loja (chapéu e óculos). Slots independentes: dá para
// usar os dois juntos; dentro de cada slot, só uma peça por vez.
//
// O mapeamento "id da loja → peça" mora aqui porque agora tem DOIS desenhos: o
// personagem 3D da cena (lib/office-model) e o bonequinho 2D do editor
// (components/avatar-figure). Duplicar a tabela seria garantir que um dia um
// chapéu novo aparecesse só em um dos dois.

export type Chapeu = "bone" | "social" | "coroa"
export type Oculos = "grau" | "escuros"

export interface AvatarAccessories {
  chapeu?: Chapeu
  oculos?: Oculos
}

// A ordem define quem ganha se, por algum acidente de dados, dois itens do
// mesmo slot estiverem equipados ao mesmo tempo.
const CHAPEUS: [string, Chapeu][] = [
  ["chapeu-bone", "bone"],
  ["chapeu-social", "social"],
  ["chapeu-coroa", "coroa"],
]

const OCULOS: [string, Oculos][] = [
  ["oculos-grau", "grau"],
  ["oculos-escuros", "escuros"],
]

export function acessoriosEquipados(equipped?: Iterable<string> | null): AvatarAccessories {
  if (!equipped) return {}
  const set = equipped instanceof Set ? (equipped as Set<string>) : new Set(equipped)
  const a: AvatarAccessories = {}
  const chapeu = CHAPEUS.find(([id]) => set.has(id))
  if (chapeu) a.chapeu = chapeu[1]
  const oculos = OCULOS.find(([id]) => set.has(id))
  if (oculos) a.oculos = oculos[1]
  return a
}
