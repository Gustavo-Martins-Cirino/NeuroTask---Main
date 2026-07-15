"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { OfficeScene } from "@/components/office-scene"
import { FriendsSection } from "@/components/friends-section"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Armchair, Coins, Check, Loader2, Sparkles, Eye } from "lucide-react"
import { toast } from "sonner"
import {
  CATALOG, CATEGORY_LABELS, EXCLUSIVE_CATEGORIES,
  fetchShopState, buyItem, setEquipped, equipExclusive,
  type ShopCategory, type ShopItem,
} from "@/lib/shop"
import { XP_UPDATED_EVENT } from "@/lib/gamification"
import { fetchOfficeStats, type OfficeStats } from "@/lib/office-stats"

const CATEGORY_ORDER: ShopCategory[] = ["decor", "setup", "cadeira", "parede", "piso"]

export default function OfficePage() {
  const [loading, setLoading] = useState(true)
  const [coins, setCoins] = useState(0)
  const [owned, setOwned] = useState<Map<string, boolean>>(new Map())
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [filter, setFilter] = useState<ShopCategory | "all">("all")

  const [stats, setStats] = useState<OfficeStats | undefined>(undefined)

  const load = () => {
    fetchOfficeStats().then(setStats)
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

  const items = filter === "all" ? CATALOG : CATALOG.filter((i) => i.category === filter)
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
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {/* Cena */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
          >
            {loading ? (
              <div className="flex aspect-[400/260] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <OfficeScene equipped={sceneSet} stats={stats} className="block w-full" />
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
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                {ownedCount === 0
                  ? "Seu cantinho começa simples — decore-o com a sua produtividade."
                  : `${ownedCount} ${ownedCount === 1 ? "item conquistado" : "itens conquistados"}`}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                1 moeda a cada 5 XP · conclua tarefas 💪
              </p>
            </div>
          </motion.div>

          {/* Loja */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Loja</h2>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {(["all", ...CATEGORY_ORDER] as const).map((c) => (
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
                    {c === "all" ? "Tudo" : CATEGORY_LABELS[c]}
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

          {/* Amigos: busca, pedidos, ocupado/livre e visitas */}
          <FriendsSection />
        </div>
      </div>
    </div>
  )
}
