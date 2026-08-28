"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Header } from "@/components/header"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { useMascaraRolagem } from "@/hooks/use-mascara-rolagem"
import { RichTextEditor } from "@/components/rich-text-editor"
import type { Note } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, Plus, Trash2, Loader2, Check, Star, Palette, Ban } from "lucide-react"
import { toast } from "sonner"
import { CORES_DE_NOTA, corDeNota, fundoDaNota, tarjaDaNota } from "@/lib/nota-cor"
import { colunaFaltante } from "@/lib/feedback"

type SaveState = "idle" | "saving" | "saved"

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [paletaAberta, setPaletaAberta] = useState(false)
  const paletaRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const mascaraLista = useMascaraRolagem(listaRef)
  const supabase = createClient()

  const active = notes.find((n) => n.id === activeId) ?? null

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false })
    if (data) {
      setNotes(data)
      setActiveId((cur) => cur ?? data[0]?.id ?? null)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Atualiza em tempo real, mas ignora mudanças na nota que está aberta
  // (para não sobrescrever o que você está digitando)
  useRealtime("notes", (payload) => {
    const changedId = payload.new?.id ?? payload.old?.id
    if (changedId && changedId === activeId) return
    fetchNotes()
  })

  const createNote = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "", content: "" })
      .select("*")
      .single()
    if (data) {
      setNotes((prev) => [data, ...prev])
      setActiveId(data.id)
    }
  }

  const deleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id)
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }

  // Fechar a paleta: Esc e clique fora, o mesmo par do botão de feedback.
  useEffect(() => {
    if (!paletaAberta) return
    const onTecla = (e: KeyboardEvent) => { if (e.key === "Escape") setPaletaAberta(false) }
    const onFora = (e: PointerEvent) => {
      if (!paletaRef.current?.contains(e.target as Node)) setPaletaAberta(false)
    }
    window.addEventListener("keydown", onTecla)
    document.addEventListener("pointerdown", onFora, true)
    return () => {
      window.removeEventListener("keydown", onTecla)
      document.removeEventListener("pointerdown", onFora, true)
    }
  }, [paletaAberta])

  // A cor pinta na hora e grava depois. Se a coluna não existir (SQL não
  // rodado), a cor VOLTA — melhor do que uma etiqueta que some sozinha no
  // próximo carregamento sem ninguém saber por quê.
  const pintarNota = async (id: string, cor: string | null) => {
    const antes = notes.find((n) => n.id === id)?.color ?? null
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color: cor } : n)))
    setPaletaAberta(false)
    const { error } = await supabase.from("notes").update({ color: cor }).eq("id", id)
    if (!error) return
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color: antes } : n)))
    toast.error(
      colunaFaltante(error)
        ? "A tabela de notas ainda não tem a coluna de cor. Rode supabase/notas_cor.sql no Supabase."
        : "Não consegui salvar a cor agora."
    )
  }

  const toggleFavorite = async (note: Note) => {
    const next = !note.is_favorite
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, is_favorite: next } : n)))
    await supabase.from("notes").update({ is_favorite: next }).eq("id", note.id)
  }

  // Atualiza local na hora e agenda o save (debounce)
  const patchActive = (patch: Partial<Pick<Note, "title" | "content">>) => {
    if (!active) return
    const id = active.id
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n))
    )
    setSaveState("saving")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await supabase.from("notes").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id)
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1500)
    }, 600)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Notas" icon={<FileText className="h-4 w-4" />} />

      <div className="flex flex-1 flex-col gap-4 px-3 py-4 md:flex-row md:px-6">
        {/* Lista */}
        <aside className="flex w-full shrink-0 flex-col gap-2 md:w-64">
          <button
            onClick={createNote}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            Nova nota
          </button>

          <div ref={listaRef} style={mascaraLista} className="scrollbar-thin max-h-48 flex-1 space-y-1 overflow-y-auto md:max-h-none">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhuma nota ainda. Clique em <b>Nova nota</b> para começar a escrever.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {notes.map((n) => (
                  <motion.button
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => setActiveId(n.id)}
                    // O véu vai no `style` e não numa classe: a cor sai de uma
                    // tabela de dados, e Tailwind não gera classe para valor que
                    // ele não vê no código.
                    style={{ background: activeId === n.id ? undefined : fundoDaNota(n.color) }}
                    className={cn(
                      "group relative flex w-full flex-col overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors",
                      activeId === n.id
                        ? "border-primary/40 bg-accent"
                        : "border-border/40 hover:border-border hover:bg-accent/50"
                    )}
                  >
                    {/* A tarja é o que se acha de relance numa lista — o véu
                        sozinho é discreto demais para servir de etiqueta. */}
                    {tarjaDaNota(n.color) && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ background: tarjaDaNota(n.color) }}
                      />
                    )}
                    <span className="truncate text-sm font-medium">
                      {n.title.trim() || "Sem título"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {stripHtml(n.content) || "Vazia"}
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </aside>

        {/* Editor */}
        {/* A cor também aparece aqui, mas só como um fio no topo: um véu sobre a
            área de escrita é onde a cor deixaria de ser etiqueta e começaria a
            disputar com o texto. */}
        <main
          className="relative flex min-h-[55vh] flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/30 md:min-h-0"
        >
          {active && tarjaDaNota(active.color) && (
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: tarjaDaNota(active.color) }}
            />
          )}
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col"
            >
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AnimatePresence mode="wait">
                    {saveState === "saving" && (
                      <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
                      </motion.span>
                    )}
                    {saveState === "saved" && (
                      <motion.span key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-emerald-500">
                        <Check className="h-3 w-3" /> Salvo
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-1">
                  {/* Painel flutuante de cor (inspirações/notas-cores.jsx). Da
                      referência veio a cor; a imagem ficou de fora — nota com
                      imagem de fundo é outra feature, e mais cara. */}
                  <div ref={paletaRef} className="relative">
                    <button
                      onClick={() => setPaletaAberta((v) => !v)}
                      aria-label="Cor da nota"
                      aria-expanded={paletaAberta}
                      className="flex items-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {corDeNota(active.color) ? (
                        <span
                          className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10"
                          style={{ background: tarjaDaNota(active.color) }}
                        />
                      ) : (
                        <Palette className="h-4 w-4" />
                      )}
                    </button>
                    <AnimatePresence>
                      {paletaAberta && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.14 }}
                          className="absolute right-0 top-full z-30 mt-1 flex items-center gap-1.5 rounded-xl border border-border/60 bg-popover p-2 shadow-xl"
                        >
                          <button
                            onClick={() => pintarNota(active.id, null)}
                            title="Sem cor"
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground",
                              !corDeNota(active.color) && "ring-2 ring-primary ring-offset-1 ring-offset-popover"
                            )}
                          >
                            <Ban className="h-3 w-3" />
                          </button>
                          {CORES_DE_NOTA.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => pintarNota(active.id, c.id)}
                              title={c.nome}
                              style={{ background: c.cor }}
                              className={cn(
                                "h-6 w-6 rounded-full transition-transform hover:scale-110",
                                active.color === c.id && "ring-2 ring-primary ring-offset-1 ring-offset-popover"
                              )}
                            >
                              <span className="sr-only">{c.nome}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={() => toggleFavorite(active)}
                    aria-label={active.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    className={cn("rounded-lg p-2 transition-colors", active.is_favorite ? "text-amber-400" : "text-muted-foreground hover:text-amber-400")}
                  >
                    <Star className={cn("h-4 w-4", active.is_favorite && "fill-current")} />
                  </button>
                  <button
                    onClick={() => deleteNote(active.id)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <input
                value={active.title}
                onChange={(e) => patchActive({ title: e.target.value })}
                placeholder="Título"
                className="bg-transparent px-5 pt-1 text-2xl font-bold outline-none placeholder:text-muted-foreground/40"
              />
              <RichTextEditor
                key={active.id}
                value={active.content}
                onChange={(html) => patchActive({ content: html })}
                placeholder="Comece a escrever..."
              />
            </motion.div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Selecione uma nota ou crie uma nova.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
