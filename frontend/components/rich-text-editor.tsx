"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Bold, Italic, Underline, List, ListOrdered, Heading, Highlighter } from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#ec4899"]
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"]
const SIZES = [
  { label: "P", size: "2", cls: "text-xs" },
  { label: "M", size: "3", cls: "text-sm" },
  { label: "G", size: "5", cls: "text-base" },
]

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [colorOpen, setColorOpen] = useState(false)
  const [highlightOpen, setHighlightOpen] = useState(false)

  // Define o conteúdo inicial uma vez (não-controlado, evita pulo de cursor)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML)
  }

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    emit()
  }

  const highlight = (color: string) => {
    ref.current?.focus()
    document.execCommand("styleWithCSS", false, "true")
    document.execCommand("hiliteColor", false, color)
    document.execCommand("styleWithCSS", false, "false")
    emit()
    setHighlightOpen(false)
  }

  const Btn = ({ onClick, active, children, label }: { onClick: () => void; active?: boolean; children: React.ReactNode; label: string }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", active && "text-foreground")}
    >
      {children}
    </button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/40 px-3 py-2">
        <Btn onClick={() => exec("bold")} label="Negrito"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("italic")} label="Itálico"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("underline")} label="Sublinhado"><Underline className="h-4 w-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border/60" />

        {SIZES.map((s) => (
          <button
            key={s.size}
            type="button"
            title={`Tamanho ${s.label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("fontSize", s.size)}
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", s.cls)}
          >
            A
          </button>
        ))}
        <Btn onClick={() => exec("formatBlock", "<h2>")} label="Título"><Heading className="h-4 w-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border/60" />

        {/* Cor do texto */}
        <div className="relative">
          <button
            type="button"
            title="Cor do texto"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setColorOpen((o) => !o)}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span className="text-sm font-bold">A</span>
            <span className="h-1 w-4 rounded-full bg-gradient-to-r from-rose-500 via-emerald-500 to-indigo-500" />
          </button>
          {colorOpen && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 top-9 z-20 flex gap-1 rounded-xl border border-border/50 bg-popover p-2 shadow-lg"
            >
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { exec("foreColor", c); setColorOpen(false) }}
                  className="h-5 w-5 rounded-full border border-border/40 transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          )}
        </div>

        <span className="mx-1 h-5 w-px bg-border/60" />

        <Btn onClick={() => exec("insertUnorderedList")} label="Lista"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("insertOrderedList")} label="Lista numerada"><ListOrdered className="h-4 w-4" /></Btn>

        {/* Marca-texto */}
        <div className="relative">
          <button
            type="button"
            title="Marca-texto"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setHighlightOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Highlighter className="h-4 w-4" />
          </button>
          {highlightOpen && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 top-9 z-20 flex items-center gap-1 rounded-xl border border-border/50 bg-popover p-2 shadow-lg"
            >
              {HIGHLIGHTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => highlight(c)}
                  className="h-5 w-5 rounded-md border border-border/40 transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  aria-label={`Destaque ${c}`}
                />
              ))}
              <span className="mx-0.5 h-5 w-px bg-border/60" />
              <button
                type="button"
                onClick={() => highlight("transparent")}
                title="Remover destaque"
                className="flex h-5 w-5 items-center justify-center rounded-md border border-border/40 text-[10px] text-muted-foreground transition-transform hover:scale-110"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Área editável */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        data-placeholder={placeholder}
        className="note-editor scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed"
      />
    </div>
  )
}
