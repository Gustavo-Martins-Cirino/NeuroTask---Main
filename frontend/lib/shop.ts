import { createClient } from "@/lib/supabase/client"

// Loja cosmética do Escritório (Fase 3). Os PREÇOS autoritativos moram no
// banco (shop_items) e a compra é a RPC buy_item — aqui fica só o catálogo
// visual (nome/emoji/slot) e os helpers de estado.
//
// As "skins" saíram da loja: o personagem da cena é procedural, então elas só
// trocavam a cor da camisa — coisa que o editor de avatar faz de graça. Vender
// isso (ainda mais a "premium", que não mudava nada) não se sustentava. Os ids
// continuam no banco, inofensivos; só não aparecem mais.

// `movel` nasceu porque `decor` era um saco onde cabia tudo — planta, quadro,
// relógio, pet, troféu, LED e uma estante. Móvel é o que muda a PLANTA da sala:
// ocupa chão, tem silhueta e você desviaria dele para andar. Pendurar um quadro
// é outra coisa, e misturar as duas na mesma lista fazia a loja parecer um
// depósito.
//
// Tirado o móvel, `decor` ainda ficou com TREZE itens — de longe a maior lista,
// e a única sem um nome que diga o que tem dentro. Ela virou três, pelo que a
// coisa É (que é como quem compra procura):
//
// · `vida`    — o que respira: plantas e bichos.
// · `luz`     — o que acende: luminária, fita de LED, letreiro de neon.
// · `enfeite` — o que se pendura ou se apoia: quadro, janela, relógio,
//               prateleira, tapete, troféu.
//
// Nenhuma delas é exclusiva (ver EXCLUSIVE_CATEGORIES), igual `decor` era: dá
// para ter as três plantas e os dois bichos ao mesmo tempo.
export type ShopCategory =
  | "vida" | "luz" | "enfeite" | "movel" | "cadeira" | "setup" | "parede" | "piso" | "chapeu" | "oculos"

/**
 * O id de cada item — e também a CHAVE dele em `Dicionario.escritorio.loja.itens`.
 * Sendo união e não `string`, o dicionário só compila se nomear TODOS: item
 * novo sem entrada no dicionário vira erro de compilação, não uma vitrine
 * com um card sem nome.
 */
export type ShopItemId =
  | "oculos-grau" | "oculos-escuros" | "chapeu-bone" | "chapeu-social" | "chapeu-gorro" | "chapeu-capuz"
  | "chapeu-coroa" | "chapeu-aureola" | "planta-pequena" | "luminaria" | "quadro-montanhas" | "tapete"
  | "planta-grande" | "estante" | "mesa-centro" | "sofa" | "poltrona" | "quadro-neon" | "janela-cidade"
  | "pet-gato" | "pet-cachorro" | "trofeu" | "cadeira-ergonomica" | "cadeira-gamer" | "relogio"
  | "prateleira" | "led-rgb" | "setup-notebook" | "setup-duplo" | "setup-ultrawide" | "parede-azul"
  | "parede-verde" | "parede-rosa" | "parede-cinza" | "parede-preta" | "parede-papel" | "parede-terracota"
  | "parede-mostarda" | "parede-oliva" | "parede-cimento" | "parede-tijolinho" | "parede-ripada"
  | "piso-madeira" | "piso-carpete" | "piso-madeira-escura" | "piso-porcelanato" | "piso-cimento"

export interface ShopItem {
  id: ShopItemId
  price: number
  category: ShopCategory
  emoji: string
}

// Slots exclusivos: equipar um desequipa os irmãos (vida, luz e enfeite são livres).
// Chapéu e óculos são slots SEPARADOS de propósito — dá para usar os dois
// juntos, e dentro de cada um só cabe uma peça (nada de dois chapéus).
export const EXCLUSIVE_CATEGORIES: ShopCategory[] = ["cadeira", "setup", "parede", "piso", "chapeu", "oculos"]

// Metadados visuais por id — preço aqui é só exibição; o cobrado é o do banco.
// Nome e descrição NÃO moram aqui: módulo puro não fala idioma, e vivem em
// Dicionario.escritorio.loja (itens e categorias), pela mesma chave `id`.
export const CATALOG: ShopItem[] = [
  { id: "oculos-grau", price: 35, category: "oculos", emoji: "👓" },
  { id: "oculos-escuros", price: 70, category: "oculos", emoji: "🕶️" },
  { id: "chapeu-bone", price: 45, category: "chapeu", emoji: "🧢" },
  { id: "chapeu-social", price: 90, category: "chapeu", emoji: "🎩" },
  { id: "chapeu-gorro", price: 60, category: "chapeu", emoji: "🧶" },
  { id: "chapeu-capuz", price: 130, category: "chapeu", emoji: "🥷" },
  { id: "chapeu-coroa", price: 220, category: "chapeu", emoji: "👑" },
  { id: "chapeu-aureola", price: 260, category: "chapeu", emoji: "😇" },
  { id: "planta-pequena", price: 20, category: "vida", emoji: "🪴" },
  { id: "luminaria", price: 30, category: "luz", emoji: "💡" },
  { id: "quadro-montanhas", price: 40, category: "enfeite", emoji: "🖼️" },
  { id: "tapete", price: 50, category: "enfeite", emoji: "🟫" },
  { id: "planta-grande", price: 60, category: "vida", emoji: "🌿" },
  { id: "estante", price: 80, category: "movel", emoji: "📚" },
  { id: "mesa-centro", price: 70, category: "movel", emoji: "🪵" },
  { id: "sofa", price: 170, category: "movel", emoji: "🛋️" },
  { id: "poltrona", price: 120, category: "movel", emoji: "🪑" },
  { id: "quadro-neon", price: 90, category: "luz", emoji: "🔆" },
  { id: "janela-cidade", price: 100, category: "enfeite", emoji: "🌆" },
  { id: "pet-gato", price: 120, category: "vida", emoji: "🐈" },
  { id: "pet-cachorro", price: 120, category: "vida", emoji: "🐕" },
  { id: "trofeu", price: 150, category: "enfeite", emoji: "🏆" },
  { id: "cadeira-ergonomica", price: 60, category: "cadeira", emoji: "🪑" },
  { id: "cadeira-gamer", price: 130, category: "cadeira", emoji: "🎮" },
  { id: "relogio", price: 45, category: "enfeite", emoji: "🕙" },
  { id: "prateleira", price: 75, category: "enfeite", emoji: "🪟" },
  { id: "led-rgb", price: 140, category: "luz", emoji: "🌈" },
  { id: "setup-notebook", price: 90, category: "setup", emoji: "💻" },
  { id: "setup-duplo", price: 110, category: "setup", emoji: "🖥️" },
  { id: "setup-ultrawide", price: 200, category: "setup", emoji: "📺" },
  { id: "parede-azul", price: 40, category: "parede", emoji: "🔵" },
  { id: "parede-verde", price: 40, category: "parede", emoji: "🟢" },
  { id: "parede-rosa", price: 40, category: "parede", emoji: "🩷" },
  { id: "parede-cinza", price: 40, category: "parede", emoji: "⚪" },
  { id: "parede-preta", price: 55, category: "parede", emoji: "⚫" },
  { id: "parede-papel", price: 70, category: "parede", emoji: "📜" },
  { id: "parede-terracota", price: 40, category: "parede", emoji: "🟠" },
  { id: "parede-mostarda", price: 40, category: "parede", emoji: "🟡" },
  { id: "parede-oliva", price: 40, category: "parede", emoji: "🫒" },
  { id: "parede-cimento", price: 110, category: "parede", emoji: "🪨" },
  { id: "parede-tijolinho", price: 130, category: "parede", emoji: "🧱" },
  { id: "parede-ripada", price: 150, category: "parede", emoji: "🪵" },
  { id: "piso-madeira", price: 30, category: "piso", emoji: "🪵" },
  { id: "piso-carpete", price: 30, category: "piso", emoji: "🧶" },
  { id: "piso-madeira-escura", price: 55, category: "piso", emoji: "🟫" },
  { id: "piso-porcelanato", price: 90, category: "piso", emoji: "⬜" },
  { id: "piso-cimento", price: 110, category: "piso", emoji: "🪨" },
]

export interface OwnedItem {
  item_id: string
  equipped: boolean
}

export interface ShopState {
  coins: number
  owned: OwnedItem[]
}

export async function fetchShopState(): Promise<ShopState> {
  const supabase = createClient()
  const [statsR, itemsR] = await Promise.all([
    supabase.from("user_stats").select("coins").maybeSingle(),
    supabase.from("user_items").select("item_id, equipped"),
  ])
  return {
    coins: statsR.data?.coins ?? 0,
    owned: itemsR.data ?? [],
  }
}

// O catálogo da loja está espalhado em vários SQLs (coins_shop.sql nasceu antes
// dos pets 3D e dos acessórios). Mandar rodar só o coins_shop.sql fazia quem já
// o tinha rodado dar de cara com a mesma mensagem — o caso do beagle, que mora
// no office_3d.sql. Por isso a dica aponta o arquivo por item.
const SQL_DO_ITEM: Record<string, string> = {
  "pet-cachorro": "office_3d.sql",
  sofa: "office_v7.sql",
  poltrona: "office_v7.sql",
  "mesa-centro": "office_v7.sql",
  "chapeu-bone": "avatar_acessorios.sql",
  "chapeu-social": "avatar_acessorios.sql",
  "chapeu-coroa": "avatar_acessorios.sql",
  "chapeu-gorro": "avatar_acessorios.sql",
  "chapeu-capuz": "avatar_acessorios.sql",
  "chapeu-aureola": "avatar_acessorios.sql",
  "oculos-grau": "avatar_acessorios.sql",
  "oculos-escuros": "avatar_acessorios.sql",
}

export type BuyErrorCode = "SALDO_INSUFICIENTE" | "JA_COMPRADO" | "ITEM_INEXISTENTE"

export interface BuyResult {
  coins?: number
  errorCode?: BuyErrorCode
  /** Só com errorCode ITEM_INEXISTENTE: o .sql que falta rodar. */
  arquivoSql?: string
  /** Nenhum código bateu — a tela decide o que fazer com o texto cru do servidor. */
  errorBruto?: string
}

// Devolve CÓDIGO, não texto: quem traduz é a tela, que tem o dicionário — este
// módulo só sabe ler a mensagem do Postgres e separar "o quê" de "por quê".
export async function buyItem(itemId: string): Promise<BuyResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("buy_item", { p_item_id: itemId })
  if (error) {
    const code = (["SALDO_INSUFICIENTE", "JA_COMPRADO", "ITEM_INEXISTENTE"] as const)
      .find((k) => error.message.includes(k))
    if (code === "ITEM_INEXISTENTE") return { errorCode: code, arquivoSql: SQL_DO_ITEM[itemId] ?? "coins_shop.sql" }
    if (code) return { errorCode: code }
    return { errorBruto: error.message }
  }
  return { coins: typeof data === "number" ? data : 0 }
}

export async function setEquipped(itemId: string, equipped: boolean): Promise<void> {
  const supabase = createClient()
  await supabase.from("user_items").update({ equipped }).eq("item_id", itemId)
}

// Equipa um item de slot exclusivo desligando os irmãos da mesma categoria.
export async function equipExclusive(itemId: string, ownedIds: string[]): Promise<void> {
  const item = CATALOG.find((i) => i.id === itemId)
  if (!item) return
  const supabase = createClient()
  if (EXCLUSIVE_CATEGORIES.includes(item.category)) {
    const siblings = CATALOG.filter((i) => i.category === item.category && i.id !== itemId && ownedIds.includes(i.id)).map((i) => i.id)
    if (siblings.length > 0) {
      await supabase.from("user_items").update({ equipped: false }).in("item_id", siblings)
    }
  }
  await supabase.from("user_items").update({ equipped: true }).eq("item_id", itemId)
}
