// Skins do personagem do Escritório. Uma skin define QUAL modelo 3D (modelUrl)
// e, para o manequim, a COR (tint) do personagem sentado. As variações de
// manequim reaproveitam o mesmo .fbx (só muda o tint) — baratas/grátis; o
// humano texturizado (.glb) é a skin premium. O modelo é dado por usuário, o
// que já deixa o gancho pronto para skins de amigos (cada um com o seu).
//
// Sem dependência de shop.ts (evita ciclo): shop.ts é que importa SKINS e as
// injeta no CATALOG da loja. Os campos id/name/price/category/emoji/desc são
// compatíveis com ShopItem; modelUrl/tint/premium são o extra desta camada.

export const SEATED_FBX = "/models/seated-character.fbx"
export const HUMAN_GLB = "/models/human.glb"

export interface Skin {
  id: string
  name: string
  emoji: string
  price: number
  desc: string
  category: "skin"
  /** Modelo 3D a renderizar (dirige FbxBody vs GlbBody por extensão). */
  modelUrl: string
  /** Cor do manequim (só afeta materiais SEM textura). undefined = original. */
  tint?: string
  /** Só cosmético na loja (selo "Premium"). */
  premium?: boolean
}

export const SKINS: Skin[] = [
  { id: "skin-manequim", name: "Manequim", emoji: "🧍", price: 0, category: "skin", modelUrl: SEATED_FBX, desc: "O clássico — de graça" },
  { id: "skin-manequim-azul", name: "Manequim azul", emoji: "🔵", price: 20, category: "skin", modelUrl: SEATED_FBX, tint: "#3b6fd4", desc: "Azul foco" },
  { id: "skin-manequim-verde", name: "Manequim verde", emoji: "🟢", price: 20, category: "skin", modelUrl: SEATED_FBX, tint: "#3fa66a", desc: "Verde calmo" },
  { id: "skin-manequim-rosa", name: "Manequim rosa", emoji: "🩷", price: 20, category: "skin", modelUrl: SEATED_FBX, tint: "#e06aa0", desc: "Rosa acolhedor" },
  { id: "skin-manequim-roxo", name: "Manequim roxo", emoji: "🟣", price: 20, category: "skin", modelUrl: SEATED_FBX, tint: "#8a5cf0", desc: "Roxo criativo" },
  { id: "skin-humano", name: "Humano realista", emoji: "🧑‍💻", price: 120, category: "skin", modelUrl: HUMAN_GLB, premium: true, desc: "Você, de verdade — premium" },
]

export const DEFAULT_SKIN: Skin = SKINS.find((s) => s.id === "skin-manequim")!

// Resolve a skin equipada a partir do conjunto de ids (owned/prévia). O
// manequim padrão é o fallback quando nada de skin está equipado.
export function resolveSkin(equipped: Set<string> | undefined): Skin {
  if (equipped) for (const s of SKINS) if (s.id !== DEFAULT_SKIN.id && equipped.has(s.id)) return s
  return DEFAULT_SKIN
}
