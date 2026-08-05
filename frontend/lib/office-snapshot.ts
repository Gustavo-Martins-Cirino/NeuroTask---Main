// Snapshot compartilhável do Escritório: tira uma "foto" da cena 3D e monta uma
// imagem pronta pra postar. Tudo no cliente — captura o canvas do R3F (precisa
// de preserveDrawingBuffer), compõe sobre o fundo escolhido, aplica a vinheta e
// carimba um selo discreto. Sem servidor/armazenamento: baixa ou usa o Web Share
// nativo. A parte pura (nome do arquivo) tem teste; o resto é canvas 2D.

const pad2 = (n: number) => String(n).padStart(2, "0")

export function snapshotFilename(date = new Date()): string {
  const d = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  return `neurotask-escritorio-${d}.png`
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawBadge(ctx: CanvasRenderingContext2D, w: number, h: number, nivel: number) {
  const margin = Math.round(w * 0.022)
  const fs = Math.max(13, Math.round(w * 0.026))
  const padX = Math.round(fs * 0.7)
  const text = `NeuroTask · Nível ${nivel}`
  ctx.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`
  const tw = ctx.measureText(text).width
  const bw = tw + padX * 2
  const bh = Math.round(fs * 1.9)
  const x = w - bw - margin
  const y = h - bh - margin
  ctx.fillStyle = "rgba(15,12,10,0.46)"
  roundRectPath(ctx, x, y, bw, bh, bh / 2)
  ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.96)"
  ctx.textBaseline = "middle"
  ctx.textAlign = "left"
  ctx.fillText(text, x + padX, y + bh / 2 + 1)
}

// Compõe a imagem final a partir do canvas da cena (transparente onde não há
// sala) sobre o fundo sólido, com vinheta e selo. Devolve um PNG.
export async function composeSnapshot(
  source: HTMLCanvasElement,
  opts: { bg: string; nivel: number }
): Promise<Blob | null> {
  const w = source.width
  const h = source.height
  if (!w || !h) return null
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (!ctx) return null

  ctx.fillStyle = opts.bg
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(source, 0, 0, w, h)

  // Vinheta igual à da tela — foca o olhar no centro.
  const vg = ctx.createRadialGradient(w * 0.5, h * 0.34, Math.min(w, h) * 0.2, w * 0.5, h * 0.34, Math.max(w, h) * 0.72)
  vg.addColorStop(0, "rgba(0,0,0,0)")
  vg.addColorStop(1, "rgba(24,18,12,0.22)")
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)

  drawBadge(ctx, w, h, opts.nivel)

  return await new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), "image/png"))
}

export type ShareOutcome = "shared" | "downloaded" | "cancelled"

// Compartilha o PNG (Web Share nativo, celular) ou baixa (desktop / sem share).
export async function shareOrDownload(blob: Blob, filename: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: "image/png" })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Meu escritório no NeuroTask 🏢" })
      return "shared"
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled"
      // Qualquer outra falha do share cai no download.
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return "downloaded"
}
