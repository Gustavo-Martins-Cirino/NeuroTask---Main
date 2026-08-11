"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { Header } from "@/components/header"
import { AvatarEditor } from "@/components/avatar-editor"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Armchair, Coins, Check, Loader2, Sparkles, Eye, Pencil, Palette, Camera } from "lucide-react"
import { useOfficeBg, setOfficeBg } from "@/hooks/use-office-bg"
import { OFFICE_BG_OPTIONS, resolveOfficeBg } from "@/lib/office-bg"
import { composeSnapshot, shareOrDownload, snapshotFilename } from "@/lib/office-snapshot"
import { useOfficeCelebration } from "@/hooks/use-office-celebration"

// R3F usa WebGL: só no cliente (ssr:false), carregado sob demanda no 3D.
const OfficeScene3D = dynamic(
  () => import("@/components/office-scene-3d").then((m) => m.OfficeScene3D),
  { ssr: false, loading: () => <div className="flex aspect-[480/340] items-center justify-center text-sm text-muted-foreground">Carregando 3D…</div> }
)
import { toast } from "sonner"
import {
  CATALOG, CATEGORY_LABELS, EXCLUSIVE_CATEGORIES,
  fetchShopState, buyItem, setEquipped, equipExclusive,
  type ShopCategory, type ShopItem,
} from "@/lib/shop"
import { XP_UPDATED_EVENT, fetchGamification } from "@/lib/gamification"
import { fetchOfficeStats, type OfficeStats } from "@/lib/office-stats"
import { fetchAvatar, saveAvatar, DEFAULT_AVATAR, type AvatarConfig } from "@/lib/avatar"
import { acessoriosEquipados } from "@/lib/avatar-accessories"

const CATEGORY_ORDER: ShopCategory[] = ["decor", "setup", "cadeira", "parede", "piso", "chapeu", "oculos"]

export default function OfficePage() {
  const [loading, setLoading] = useState(true)
  const [coins, setCoins] = useState(0)
  const [owned, setOwned] = useState<Map<string, boolean>>(new Map())
  const [busyItem, setBusyItem] = useState<string | null>(null)
  // Sem aba "Tudo": com o catálogo deste tamanho, a lista única virava um
  // paredão sem informação. Uma categoria por vez.
  const [filter, setFilter] = useState<ShopCategory>("decor")

  const [stats, setStats] = useState<OfficeStats | undefined>(undefined)
  const [avatarCfg, setAvatarCfg] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [nivel, setNivel] = useState(1)
  const officeBg = useOfficeBg()
  const { resolvedTheme } = useTheme()
  const sceneWrapRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  // A sala comemora quando trabalho real rende XP — inclusive o que foi
  // concluído em outra tela pouco antes de abrir o Escritório.
  const celebrateNonce = useOfficeCelebration(!loading)

  // "Tira uma foto" do escritório: captura o canvas do R3F, compõe com o fundo
  // atual + selo e baixa/compartilha. Sem servidor.
  const handleShare = async () => {
    const canvas = sceneWrapRef.current?.querySelector("canvas")
    if (!canvas) {
      toast.error("Abra o escritório em 3D para gerar a imagem.")
      return
    }
    setSharing(true)
    try {
      const bg = resolveOfficeBg(officeBg, resolvedTheme === "dark")
      const blob = await composeSnapshot(canvas as HTMLCanvasElement, { bg, nivel })
      if (!blob) throw new Error("sem imagem")
      const outcome = await shareOrDownload(blob, snapshotFilename())
      if (outcome === "downloaded") toast.success("Imagem do escritório baixada! 📸")
      else if (outcome === "shared") toast.success("Escritório compartilhado! 📸")
    } catch {
      toast.error("Não consegui gerar a imagem.")
    } finally {
      setSharing(false)
    }
  }

  const load = () => {
    fetchOfficeStats().then(setStats)
    fetchAvatar().then(setAvatarCfg)
    fetchGamification().then((g) => setNivel(g.level))
    return fetchShopState().then((s) => {
      setCoins(s.coins)
      setOwned(new Map(s.owned.map((o) => [o.item_id, o.equipped])))
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
    const onXp = () => load()
    window.addEventListener(XP_UPDATED_EVENT, onXp)
    return () => window.removeEventListener(XP_UPDATED_EVENT, onXp)
  }, [])

  const equippedSet = useMemo(() => {
    const s = new Set<string>()
    for (const [id, eq] of owned) if (eq) s.add(id)
    return s
  }, [owned])

  // Prévia ao passar o mouse (ou segurar o dedo) num item da loja:
  // renderiza a cena como se ele estivesse equipado
  const [previewId, setPreviewId] = useState<string | null>(null)
  const previewItem = previewId ? CATALOG.find((i) => i.id === previewId) : null

  const sceneSet = useMemo(() => {
    if (!previewItem || equippedSet.has(previewItem.id)) return equippedSet
    const s = new Set(equippedSet)
    if (EXCLUSIVE_CATEGORIES.includes(previewItem.category)) {
      for (const other of CATALOG) {
        if (other.category === previewItem.category) s.delete(other.id)
      }
    }
    s.add(previewItem.id)
    return s
  }, [equippedSet, previewItem])

  const handleBuy = async (item: ShopItem) => {
    setBusyItem(item.id)
    const { coins: newCoins, error } = await buyItem(item.id)
    if (error) {
      toast.error(error)
      setBusyItem(null)
      return
    }
    setCoins(newCoins ?? 0)
    const ownedIds = [...owned.keys(), item.id]
    if (EXCLUSIVE_CATEGORIES.includes(item.category)) {
      await equipExclusive(item.id, ownedIds)
      setOwned((prev) => {
        const next = new Map(prev)
        for (const other of CATALOG) {
          if (other.category === item.category && next.has(other.id)) next.set(other.id, false)
        }
        next.set(item.id, true)
        return next
      })
    } else {
      setOwned((prev) => new Map(prev).set(item.id, true))
    }
    setBusyItem(null)
    toast.success(`${item.emoji} ${item.name} é seu! Já está no escritório.`)
  }

  const handleToggle = async (item: ShopItem) => {
    const isEquipped = owned.get(item.id) === true
    setBusyItem(item.id)
    if (isEquipped) {
      setOwned((prev) => new Map(prev).set(item.id, false))
      await setEquipped(item.id, false)
    } else if (EXCLUSIVE_CATEGORIES.includes(item.category)) {
      setOwned((prev) => {
        const next = new Map(prev)
        for (const other of CATALOG) {
          if (other.category === item.category && next.has(other.id)) next.set(other.id, false)
        }
        next.set(item.id, true)
        return next
      })
      await equipExclusive(item.id, [...owned.keys()])
    } else {
      setOwned((prev) => new Map(prev).set(item.id, true))
      await setEquipped(item.id, true)
    }
    setBusyItem(null)
  }

  const items = CATALOG.filter((i) => i.category === filter)
  const ownedCount = owned.size

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Escritório" icon={<Armchair className="h-4 w-4" />}>
        <span className="ml-2 flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Coins className="h-3.5 w-3.5" />
          <span className="tabular-nums">{coins}</span>
        </span>
      </Header>

      <div className="flex-1 px-4 py-6 md:px-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {/* Cena */}
          <motion.div
            ref={sceneWrapRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
          >
            {loading ? (
              <div className="flex aspect-[480/340] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <OfficeScene3D
                avatar={avatarCfg}
                working={stats?.working}
                equipped={sceneSet}
                nivel={nivel}
                bgColor={officeBg}
                celebrateNonce={celebrateNonce}
                onAvatarClick={() => setAvatarOpen(true)}
                className="block w-full"
              />
            )}
            {!loading && (
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                title="Salvar / compartilhar imagem do escritório"
                aria-label="Salvar ou compartilhar imagem do escritório"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60 disabled:opacity-60"
              >
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            )}
            <AnimatePresence>
              {previewItem && !equippedSet.has(previewItem.id) && (
                <motion.span
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Prévia · {previewItem.name}
                </motion.span>
              )}
            </AnimatePresence>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/50 px-4 py-2.5">
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {ownedCount === 0
                  ? "Seu cantinho começa simples — decore-o com a sua produtividade."
                  : `${ownedCount} ${ownedCount === 1 ? "item conquistado" : "itens conquistados"}`}
              </p>
              {/* Cor de fundo do escritório (preferência do dispositivo) */}
              <div className="flex shrink-0 items-center gap-1.5" title="Cor de fundo">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex items-center gap-1">
                  {OFFICE_BG_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOfficeBg(o.id)}
                      title={o.label}
                      aria-label={`Fundo: ${o.label}`}
                      aria-pressed={officeBg === o.id}
                      className={cn(
                        "h-5 w-5 rounded-full border transition-transform hover:scale-110",
                        officeBg === o.id ? "border-primary ring-2 ring-primary/40" : "border-border/60"
                      )}
                      style={{ background: o.swatch }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Pencil className="h-3 w-3" />
                Editar avatar
              </button>
            </div>
          </motion.div>

          {/* Loja */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Loja</h2>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {CATEGORY_ORDER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFilter(c)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      filter === c
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item, i) => {
                const isOwned = owned.has(item.id)
                const isEquipped = owned.get(item.id) === true
                const canAfford = coins >= item.price
                const busy = busyItem === item.id
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onPointerEnter={() => setPreviewId(item.id)}
                    onPointerLeave={() => setPreviewId((cur) => (cur === item.id ? null : cur))}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-3 transition-colors",
                      isEquipped ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-2xl leading-none">{item.emoji}</span>
                      {isOwned ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {isEquipped ? "No escritório" : "Guardado"}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold tabular-nums",
                            canAfford ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                          )}
                        >
                          <Coins className="h-3 w-3" />
                          {item.price}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{item.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy || loading || (!isOwned && !canAfford)}
                      onClick={() => (isOwned ? handleToggle(item) : handleBuy(item))}
                      className={cn(
                        "mt-auto flex h-7 items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-45",
                        isOwned
                          ? isEquipped
                            ? "border border-border/50 text-muted-foreground hover:bg-accent"
                            : "bg-primary/10 text-primary hover:bg-primary/15"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isOwned ? (
                        isEquipped ? (
                          "Guardar"
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" /> Equipar
                          </>
                        )
                      ) : canAfford ? (
                        "Comprar"
                      ) : (
                        "Moedas insuficientes"
                      )}
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <AvatarEditor
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        value={avatarCfg}
        accessories={acessoriosEquipados(equippedSet)}
        onSave={(cfg) => {
          setAvatarCfg(cfg)
          setAvatarOpen(false)
          saveAvatar(cfg)
          toast.success("Avatar atualizado! ✨")
        }}
      />
    </div>
  )
}
