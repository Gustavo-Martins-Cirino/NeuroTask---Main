import { createClient } from "@/lib/supabase/client"

// Loja cosmética do Escritório (Fase 3). Os PREÇOS autoritativos moram no
// banco (shop_items) e a compra é a RPC buy_item — aqui fica só o catálogo
// visual (nome/emoji/slot) e os helpers de estado.
//
// As "skins" saíram da loja: o personagem da cena é procedural, então elas só
// trocavam a cor da camisa — coisa que o editor de avatar faz de graça. Vender
// isso (ainda mais a "premium", que não mudava nada) não se sustentava. Os ids
// continuam no banco, inofensivos; só não aparecem mais.

export type ShopCategory = "decor" | "cadeira" | "setup" | "parede" | "piso" | "chapeu" | "oculos"

export interface ShopItem {
  id: string
  name: string
  price: number
  category: ShopCategory
  emoji: string
  desc: string
}

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  chapeu: "Chapéus",
  oculos: "Óculos",
  decor: "Decoração",
  cadeira: "Cadeira",
  setup: "Setup",
  parede: "Parede",
  piso: "Piso",
}

// Slots exclusivos: equipar um desequipa os irmãos (decor é livre).
// Chapéu e óculos são slots SEPARADOS de propósito — dá para usar os dois
// juntos, e dentro de cada um só cabe uma peça (nada de dois chapéus).
export const EXCLUSIVE_CATEGORIES: ShopCategory[] = ["cadeira", "setup", "parede", "piso", "chapeu", "oculos"]

// Metadados visuais por id — preço aqui é só exibição; o cobrado é o do banco.
export const CATALOG: ShopItem[] = [
  { id: "oculos-grau", name: "Óculos de grau", price: 35, category: "oculos", emoji: "👓", desc: "Ar de quem lê muito" },
  { id: "oculos-escuros", name: "Óculos escuros", price: 70, category: "oculos", emoji: "🕶️", desc: "Foco em modo estiloso" },
  { id: "chapeu-bone", name: "Boné", price: 45, category: "chapeu", emoji: "🧢", desc: "Clássico de todo dia" },
  { id: "chapeu-social", name: "Chapéu social", price: 90, category: "chapeu", emoji: "🎩", desc: "Elegância no home office" },
  { id: "chapeu-coroa", name: "Coroa dourada", price: 220, category: "chapeu", emoji: "👑", desc: "Para quem reina na rotina" },
  { id: "planta-pequena", name: "Plantinha", price: 20, category: "decor", emoji: "🪴", desc: "Um toque de vida na mesa" },
  { id: "luminaria", name: "Luminária", price: 30, category: "decor", emoji: "💡", desc: "Luz quentinha de canto" },
  { id: "quadro-montanhas", name: "Quadro · Montanhas", price: 40, category: "decor", emoji: "🖼️", desc: "Paisagem pra respirar" },
  { id: "tapete", name: "Tapete", price: 50, category: "decor", emoji: "🟫", desc: "Conforto sob os pés" },
  { id: "planta-grande", name: "Planta grande", price: 60, category: "decor", emoji: "🌿", desc: "Uma costela-de-adão no canto" },
  { id: "estante", name: "Estante de livros", price: 80, category: "decor", emoji: "📚", desc: "Sua biblioteca pessoal" },
  { id: "quadro-neon", name: "Neon \"focus\"", price: 90, category: "decor", emoji: "🔆", desc: "Letreiro neon na parede" },
  { id: "janela-cidade", name: "Janela · Cidade", price: 100, category: "decor", emoji: "🌆", desc: "Vista para a cidade" },
  { id: "pet-gato", name: "Gato de estimação", price: 120, category: "decor", emoji: "🐈", desc: "Companhia de produtividade" },
  { id: "pet-cachorro", name: "Cachorro (Beagle)", price: 120, category: "decor", emoji: "🐕", desc: "Um beagle 3D que se mexe no tapete" },
  { id: "trofeu", name: "Troféu dourado", price: 150, category: "decor", emoji: "🏆", desc: "Prova de que você chegou longe" },
  { id: "cadeira-ergonomica", name: "Cadeira ergonômica", price: 60, category: "cadeira", emoji: "🪑", desc: "Adeus, dor nas costas" },
  { id: "cadeira-gamer", name: "Cadeira gamer", price: 130, category: "cadeira", emoji: "🎮", desc: "Vermelha e imponente" },
  { id: "setup-duplo", name: "Setup · 2 monitores", price: 110, category: "setup", emoji: "🖥️", desc: "Produtividade em dobro" },
  { id: "setup-ultrawide", name: "Setup · Ultrawide", price: 200, category: "setup", emoji: "📺", desc: "O monitor dos sonhos" },
  { id: "parede-azul", name: "Parede azul", price: 40, category: "parede", emoji: "🔵", desc: "Tom sereno de foco" },
  { id: "parede-verde", name: "Parede verde", price: 40, category: "parede", emoji: "🟢", desc: "Verde floresta calmante" },
  { id: "parede-rosa", name: "Parede rosa", price: 40, category: "parede", emoji: "🩷", desc: "Rosa suave e acolhedor" },
  { id: "piso-madeira", name: "Piso de madeira", price: 30, category: "piso", emoji: "🪵", desc: "Taco clássico" },
  { id: "piso-carpete", name: "Carpete", price: 30, category: "piso", emoji: "🧶", desc: "Piso macio azulado" },
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
  "chapeu-bone": "avatar_acessorios.sql",
  "chapeu-social": "avatar_acessorios.sql",
  "chapeu-coroa": "avatar_acessorios.sql",
  "oculos-grau": "avatar_acessorios.sql",
  "oculos-escuros": "avatar_acessorios.sql",
}

const BUY_ERRORS: Record<string, string> = {
  SALDO_INSUFICIENTE: "Moedas insuficientes — conclua mais tarefas! 💪",
  JA_COMPRADO: "Você já tem esse item.",
}

function erroDeCompra(code: string, itemId: string): string | undefined {
  if (BUY_ERRORS[code]) return BUY_ERRORS[code]
  if (code === "ITEM_INEXISTENTE") {
    return `Este item ainda não existe no banco. Rode supabase/${SQL_DO_ITEM[itemId] ?? "coins_shop.sql"} no Supabase.`
  }
  return undefined
}

export async function buyItem(itemId: string): Promise<{ coins?: number; error?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("buy_item", { p_item_id: itemId })
  if (error) {
    const code = ["SALDO_INSUFICIENTE", "JA_COMPRADO", "ITEM_INEXISTENTE"].find((k) => error.message.includes(k))
    return { error: (code && erroDeCompra(code, itemId)) || error.message }
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
