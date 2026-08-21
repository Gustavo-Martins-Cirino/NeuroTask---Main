import { createClient } from "@/lib/supabase/client"
import { type AvatarModo } from "@/lib/avatar-modo"
import { acessoriosEquipados, type AvatarAccessories } from "@/lib/avatar-accessories"
import {
  recorteQuadrado, caminhoDaFoto, urlComCarimbo, explicaErroUpload, LADO_FOTO, QUALIDADE_JPEG,
} from "@/lib/foto-perfil"

// Avatar editável do Escritório (paper-doll 2D). A configuração mora em
// user_stats.avatar (jsonb) e aparece para amigos via friend_office
// (portão share_office).

export type HairStyle = "curto" | "franja" | "cacheado" | "longo" | "coque" | "raspado"
export type Outfit = "camiseta" | "moletom" | "terno" | "jaqueta"
export type BodyType = "m" | "f"

export interface AvatarConfig {
  body: BodyType
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

export const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "m", label: "Masculino" },
  { value: "f", label: "Feminino" },
]

export const DEFAULT_AVATAR: AvatarConfig = {
  body: "m",
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
    body: a.body === "f" ? "f" : "m",
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

// O retrato do header muda em duas telas que não são o header: o editor de
// avatar (Escritório) e a foto de perfil (Configurações). Um evento só para as
// duas — o header não sabe nem precisa saber qual dos degraus mudou.
export const RETRATO_UPDATED_EVENT = "neurotask:retrato-updated"

const avisaRetratoMudou = () => window.dispatchEvent(new CustomEvent(RETRATO_UPDATED_EVENT))

export async function saveAvatar(cfg: AvatarConfig): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("user_stats").upsert({ user_id: user.id, avatar: cfg }, { onConflict: "user_id" })
  avisaRetratoMudou()
}

/** O bonequinho pronto para desenhar, com o que estiver equipado na loja. */
export interface Retrato {
  config: AvatarConfig
  accessories: AvatarAccessories
}

// `null` quer dizer "nunca montou um", e é por isso que esta função existe ao
// lado de fetchAvatar: aquela devolve o DEFAULT_AVATAR quando a coluna está
// vazia, que é o certo para o editor (ele precisa de algo para editar) e o
// errado para o header — sem a diferença, todo mundo ganharia o mesmo boneco
// genérico no lugar das próprias iniciais.
export async function fetchRetrato(): Promise<Retrato | null> {
  const supabase = createClient()
  const [{ data: stats }, { data: items }] = await Promise.all([
    supabase.from("user_stats").select("avatar").maybeSingle(),
    supabase.from("user_items").select("item_id").eq("equipped", true),
  ])
  if (!stats?.avatar) return null
  return {
    config: normalizeAvatar(stats.avatar),
    accessories: acessoriosEquipados(items?.map((i) => i.item_id as string)),
  }
}

// ---------------------------------------------------------------------------
// Foto de perfil — o degrau de cima do retrato. As contas ficam em
// lib/foto-perfil.ts; aqui mora o que toca o navegador e o Supabase.
// ---------------------------------------------------------------------------

const BUCKET_FOTOS = "avatars"

// O arquivo escolhido vira um JPEG quadrado de 256px ANTES de sair do
// navegador. Não é só economia de banda: subir o original deixaria a decisão do
// enquadramento para o CSS, e `object-cover` num círculo corta pelo centro do
// arquivo — o mesmo centro, mas de uma imagem que pode ter 4000px de altura de
// paisagem em volta do rosto. Recortando aqui, o que se vê é o que foi salvo.
async function paraJpegQuadrado(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  try {
    const { sx, sy, lado } = recorteQuadrado(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = LADO_FOTO
    canvas.height = LADO_FOTO
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Este navegador não conseguiu preparar a imagem.")
    ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG)
    )
    if (!blob) throw new Error("Não foi possível converter a imagem.")
    return blob
  } finally {
    // Sem isto a imagem decodificada fica na memória até o coletor passar — e
    // uma foto de celular decodificada são dezenas de MB.
    bitmap.close()
  }
}

/** Sobe a foto e devolve a URL já carimbada, pronta para exibir. */
export async function enviarFotoPerfil(arquivo: File): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Faça login novamente para trocar a foto.")

  const jpeg = await paraJpegQuadrado(arquivo)
  const caminho = caminhoDaFoto(user.id)

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(caminho, jpeg, { contentType: "image/jpeg", upsert: true })
  if (erroUpload) {
    // O original em inglês fica no console para depurar; a pessoa recebe a
    // versão que diz o que fazer (quase sempre: rodar o foto_perfil.sql).
    console.error("Falha ao subir a foto de perfil:", erroUpload)
    throw new Error(explicaErroUpload(erroUpload))
  }

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho)
  // O carimbo é gravado junto do endereço, e não posto na hora de exibir: o
  // header lê o user_metadata e não teria como saber de que upload a URL veio.
  const url = urlComCarimbo(data.publicUrl, Date.now())

  // Chave própria, e não `avatar_url`: o Supabase mescla os dados do provedor no
  // user_metadata a cada login social, e gravar em `avatar_url` faria o próximo
  // "entrar com Google" apagar a foto escolhida aqui.
  const { error: erroMeta } = await supabase.auth.updateUser({ data: { foto_perfil: url } })
  if (erroMeta) throw erroMeta

  avisaRetratoMudou()
  return url
}

export async function removerFotoPerfil(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // A ordem importa: limpar o endereço primeiro. Se a remoção do arquivo falhar,
  // sobra um JPEG órfão de 30 KB no bucket — invisível e inofensivo. Na ordem
  // inversa, uma falha deixaria o app apontando para um arquivo que não existe
  // mais, e aí a tela mostra imagem quebrada.
  const { error } = await supabase.auth.updateUser({ data: { foto_perfil: null } })
  if (error) throw error
  await supabase.storage.from(BUCKET_FOTOS).remove([caminhoDaFoto(user.id)])

  avisaRetratoMudou()
}

/**
 * Grava qual retrato a pessoa escolheu usar.
 *
 * Vai no user_metadata, junto de `foto_perfil`: é o mesmo dado (como eu apareço)
 * e o header já lê dali, então a escolha chega junto com a foto numa consulta
 * só. Chave própria pelo mesmo motivo da foto — o login social mescla os dados
 * do provedor no metadata, e uma chave conhecida dele seria sobrescrita.
 */
export async function salvarAvatarModo(modo: AvatarModo): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ data: { avatar_modo: modo } })
  if (error) throw error
  avisaRetratoMudou()
}
