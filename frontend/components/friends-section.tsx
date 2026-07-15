"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OfficeScene } from "@/components/office-scene"
import {
  Users, Search, UserPlus, Check, X, Loader2, Eye, Clock3, AtSign,
} from "lucide-react"
import {
  fetchMyProfile, claimUsername, normalizeUsername, updatePrivacy,
  searchUsers, sendFriendRequest, fetchMyFriends, acceptFriendRequest,
  removeFriendship, fetchFriendOffice, fetchSuggestedUsers,
  type MyProfile, type UserSearchResult, type FriendEntry, type FriendOffice,
} from "@/lib/friends"
import { normalizeAvatar } from "@/lib/avatar"

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold uppercase text-primary">
      {name.charAt(0)}
    </span>
  )
}

function StatusDot({ busy }: { busy: boolean | null }) {
  if (busy === null) {
    return <span className="text-[11px] text-muted-foreground/60">privado</span>
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium">
      <span className={cn("h-2 w-2 rounded-full", busy ? "bg-red-500" : "bg-emerald-500")} />
      <span className={busy ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}>
        {busy ? "Ocupado" : "Livre"}
      </span>
    </span>
  )
}

export function FriendsSection() {
  const [profile, setProfile] = useState<MyProfile | null | undefined>(undefined)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [claimName, setClaimName] = useState("")
  const [claiming, setClaiming] = useState(false)
  const [visit, setVisit] = useState<FriendOffice | null>(null)
  const [visitLoading, setVisitLoading] = useState<string | null>(null)
  const [suggested, setSuggested] = useState<UserSearchResult[]>([])

  const refreshFriends = () => {
    fetchMyFriends().then(setFriends)
    fetchSuggestedUsers().then(setSuggested)
  }

  useEffect(() => {
    fetchMyProfile().then((p) => {
      setProfile(p)
      if (p) refreshFriends()
    })
    // Sugestão de @: prefixo do e-mail
    createClient().auth.getUser().then(({ data }) => {
      const prefix = data.user?.email?.split("@")[0] ?? ""
      setClaimName((cur) => cur || normalizeUsername(prefix))
    })
  }, [])

  // Busca com debounce
  useEffect(() => {
    if (!profile || query.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      setResults(await searchUsers(query))
      setSearching(false)
    }, 350)
    return () => clearTimeout(t)
  }, [query, profile])

  const handleClaim = async () => {
    setClaiming(true)
    const { profile: p, error } = await claimUsername(claimName, null)
    setClaiming(false)
    if (error) {
      toast.error(error)
      return
    }
    setProfile(p!)
    refreshFriends()
    toast.success(`Pronto, @${p!.username}! Agora seus amigos podem te encontrar.`)
  }

  const handleAdd = async (u: UserSearchResult) => {
    const { result, error } = await sendFriendRequest(u.user_id)
    if (error) {
      toast.error(error)
      return
    }
    toast.success(result === "accepted" ? `Vocês agora são amigos! 🎉` : `Pedido enviado para @${u.username}`)
    setQuery("")
    setResults([])
    setSuggested((prev) => prev.filter((s) => s.user_id !== u.user_id))
    refreshFriends()
  }

  const handleAccept = async (f: FriendEntry) => {
    await acceptFriendRequest(f.friendship_id)
    toast.success(`Você e @${f.username} agora são amigos! 🎉`)
    refreshFriends()
  }

  const handleRemove = async (f: FriendEntry) => {
    await removeFriendship(f.friendship_id)
    refreshFriends()
  }

  const handleVisit = async (f: FriendEntry) => {
    setVisitLoading(f.friend_id)
    const { office, error } = await fetchFriendOffice(f.friend_id)
    setVisitLoading(null)
    if (error) {
      toast.error(error)
      return
    }
    setVisit(office!)
  }

  const togglePrivacy = (field: "share_status" | "share_office" | "share_level" | "discoverable") => {
    if (!profile) return
    const next = !profile[field]
    setProfile({ ...profile, [field]: next })
    updatePrivacy(field, next)
  }

  const pendingIn = friends.filter((f) => f.state === "pending_in")
  const pendingOut = friends.filter((f) => f.state === "pending_out")
  const accepted = friends.filter((f) => f.state === "accepted")

  if (profile === undefined) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Amigos</h2>
        {profile && <span className="text-xs text-muted-foreground">@{profile.username}</span>}
        {profile && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {([
              ["share_status", "Ocupado/livre"],
              ["share_office", "Escritório"],
              ["share_level", "Nível"],
              ["discoverable", "Perfil aberto"],
            ] as const).map(([field, label]) => (
              <button
                key={field}
                type="button"
                onClick={() => togglePrivacy(field)}
                title={`Amigos ${profile[field] ? "veem" : "NÃO veem"}: ${label}`}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  profile[field]
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground/60 line-through"
                )}
              >
                {profile[field] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!profile ? (
        /* Escolher @usuário */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5 rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <AtSign className="h-4 w-4 text-primary" />
            </span>
            Escolha seu @usuário
          </p>
          <p className="text-xs text-muted-foreground">
            É como seus amigos vão te achar na busca. Letras minúsculas, números e _ (3–20).
          </p>
          <div className="flex items-center gap-2">
            <div className="flex h-9 flex-1 items-center gap-1 rounded-lg border border-border/50 bg-background px-2.5">
              <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={claimName}
                onChange={(e) => setClaimName(normalizeUsername(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") handleClaim() }}
                placeholder="seu_usuario"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming || claimName.length < 3}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
            >
              {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Criar
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Busca */}
          <div className="relative">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card px-3">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por @usuário ou nome…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {results.length > 0 && (
              <div className="absolute inset-x-0 top-10 z-20 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg">
                {results.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => handleAdd(u)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <Initial name={u.display_name || u.username} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.display_name ?? `@${u.username}`}</span>
                      {u.display_name && <span className="block text-xs text-muted-foreground">@{u.username}</span>}
                    </span>
                    <UserPlus className="h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sugeridos (perfis abertos fora das suas amizades) */}
          {suggested.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Sugeridos para você</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {suggested.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-3 py-2">
                    <Initial name={u.display_name || u.username} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.display_name ?? `@${u.username}`}</span>
                      <span className="block text-xs text-muted-foreground">@{u.username}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdd(u)}
                      className="flex h-7 items-center gap-1 rounded-lg bg-primary/10 px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      <UserPlus className="h-3 w-3" />
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pedidos recebidos */}
          {pendingIn.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-primary">Pedidos de amizade</p>
              {pendingIn.map((f) => (
                <div key={f.friendship_id} className="flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
                  <Initial name={f.display_name || f.username} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {f.display_name ?? `@${f.username}`}
                    <span className="ml-1.5 text-xs text-muted-foreground">@{f.username}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAccept(f)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85"
                    title="Aceitar"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(f)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-colors hover:bg-accent"
                    title="Recusar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Amigos */}
          {accepted.length > 0 && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {accepted.map((f) => (
                <div key={f.friendship_id} className="group flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-3 py-2">
                  <Initial name={f.display_name || f.username} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{f.display_name ?? `@${f.username}`}</span>
                    <StatusDot busy={f.busy} />
                  </span>
                  {f.can_visit && (
                    <button
                      type="button"
                      onClick={() => handleVisit(f)}
                      disabled={visitLoading === f.friend_id}
                      className="flex h-7 items-center gap-1 rounded-lg bg-primary/10 px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      {visitLoading === f.friend_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                      Visitar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(f)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/50 opacity-0 transition-all hover:bg-accent hover:text-destructive group-hover:opacity-100"
                    title="Desfazer amizade"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pedidos enviados */}
          {pendingOut.length > 0 && (
            <div className="space-y-1.5">
              {pendingOut.map((f) => (
                <div key={f.friendship_id} className="flex items-center gap-2.5 rounded-xl border border-border/40 px-3 py-2 opacity-75">
                  <Initial name={f.display_name || f.username} />
                  <span className="min-w-0 flex-1 truncate text-sm">@{f.username}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" /> aguardando
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(f)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-accent"
                    title="Cancelar pedido"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {friends.length === 0 && suggested.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-xs text-muted-foreground">
              Busque um amigo pelo @ para começar — dá pra ver se ele está livre e visitar o escritório dele. 👀
            </p>
          )}
        </>
      )}

      {/* Visita ao escritório do amigo */}
      <Dialog open={!!visit} onOpenChange={(o) => { if (!o) setVisit(null) }}>
        <DialogContent className="sm:max-w-[560px]">
          {visit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Escritório de {visit.display_name ?? `@${visit.username}`}
                  {visit.level != null && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                      Lvl {visit.level}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-hidden rounded-xl border border-border/50">
                <OfficeScene
                  equipped={new Set(visit.items)}
                  avatar={visit.avatar ? normalizeAvatar(visit.avatar) : null}
                  className="block w-full"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {visit.items.length} {visit.items.length === 1 ? "item conquistado" : "itens conquistados"} — e o seu, como está? 😉
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
