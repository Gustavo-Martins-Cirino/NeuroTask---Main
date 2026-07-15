import { createClient } from "@/lib/supabase/client"

// Avatar editável do Escritório (paper-doll 2D). A configuração mora em
// user_stats.avatar (jsonb) e aparece para amigos via friend_office
// (portão share_office).

export type HairStyle = "curto" | "franja" | "cacheado" | "longo" | "coque" | "raspado"
export type Outfit = "camiseta" | "moletom" | "terno" | "jaqueta"

export interface AvatarConfig {
  skin: string
  hairStyle: HairStyle
  hairColor: string
  outfit: Outfit
  outfitColor: string
  headphones: boolean
}

export const SKIN_TONES = ["#f4cfa8", "#e0a97e", "#c98a5e", "#9c6b43", "#6e4a2e"]
export const HAIR_COLORS = ["#2f2a26", "#4a3a2c", "#8a5a2c", "#c9973c", "#b8b8c0", "#8a3a5a"]
export const OUTFIT_COLORS = ["#3f6f8f", "#4a5568", "#7a4a8f", "#3f8f5f", "#b5563a", "#22252d"]

export const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: "curto", label: "Curto" },
  { value: "franja", label: "Franja" },
  { value: "cacheado", label: "Cacheado" },
  { value: "longo", label: "Longo" },
  { value: "coque", label: "Coque" },
  { value: "raspado", label: "Raspado" },
]

export const OUTFITS: { value: Outfit; label: string }[] = [
  { value: "camiseta", label: "Camiseta" },
  { value: "moletom", label: "Moletom" },
  { value: "jaqueta", label: "Jaqueta" },
  { value: "terno", label: "Terno" },
]

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "#e0a97e",
  hairStyle: "curto",
  hairColor: "#4a3a2c",
  outfit: "camiseta",
  outfitColor: "#3f6f8f",
  headphones: true,
}

export function normalizeAvatar(raw: unknown): AvatarConfig {
  const a = (raw ?? {}) as Partial<AvatarConfig>
  return {
    skin: typeof a.skin === "string" ? a.skin : DEFAULT_AVATAR.skin,
    hairStyle: HAIR_STYLES.some((h) => h.value === a.hairStyle) ? (a.hairStyle as HairStyle) : DEFAULT_AVATAR.hairStyle,
    hairColor: typeof a.hairColor === "string" ? a.hairColor : DEFAULT_AVATAR.hairColor,
    outfit: OUTFITS.some((o) => o.value === a.outfit) ? (a.outfit as Outfit) : DEFAULT_AVATAR.outfit,
    outfitColor: typeof a.outfitColor === "string" ? a.outfitColor : DEFAULT_AVATAR.outfitColor,
    headphones: a.headphones !== false,
  }
}

export async function fetchAvatar(): Promise<AvatarConfig> {
  const supabase = createClient()
  const { data } = await supabase.from("user_stats").select("avatar").maybeSingle()
  return normalizeAvatar(data?.avatar)
}

export async function saveAvatar(cfg: AvatarConfig): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("user_stats").upsert({ user_id: user.id, avatar: cfg }, { onConflict: "user_id" })
}
