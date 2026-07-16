"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/date-picker"
import { sendMeetingInvite } from "@/lib/invites"
import { toast } from "sonner"
import { CalendarPlus, Loader2, Video, MapPin } from "lucide-react"

interface InviteDialogProps {
  friend: { friend_id: string; username: string; display_name: string | null } | null
  onClose: () => void
  onSent: () => void
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function nextHour(): string {
  const d = new Date(Date.now() + 3_600_000)
  return `${String(d.getHours()).padStart(2, "0")}:00`
}

function plusHour(hm: string): string {
  const [h, m] = hm.split(":").map(Number)
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function InviteDialog({ friend, onClose, onSent }: InviteDialogProps) {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState(nextHour())
  const [end, setEnd] = useState(plusHour(nextHour()))
  const [url, setUrl] = useState("")
  const [location, setLocation] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (friend) {
      setTitle("")
      setDate(todayISO())
      const s = nextHour()
      setStart(s)
      setEnd(plusHour(s))
      setUrl("")
      setLocation("")
    }
  }, [friend])

  const handleSend = async () => {
    if (!friend) return
    const startsAt = new Date(`${date}T${start}:00`)
    let endsAt = new Date(`${date}T${end}:00`)
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 3_600_000) // cruza meia-noite
    setLoading(true)
    const { error } = await sendMeetingInvite({
      toUserId: friend.friend_id,
      title: title.trim(),
      startsAt,
      endsAt,
      meetingUrl: url.trim() || undefined,
      location: location.trim() || undefined,
    })
    setLoading(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success(`Convite enviado para @${friend.username}! Quando aceitar, entra na agenda dos dois.`)
    onSent()
    onClose()
  }

  return (
    <Dialog open={!!friend} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            Convidar {friend?.display_name ?? `@${friend?.username}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título — ex.: Reunião de alinhamento"
            className="h-10"
          />

          <DatePicker value={date} onChange={setDate} />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Das</span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-9 rounded-lg border border-border/50 bg-transparent px-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
            <span className="text-xs text-muted-foreground">às</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-9 rounded-lg border border-border/50 bg-transparent px-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link — Meet, Zoom… (opcional)"
              className="h-9 text-sm"
              inputMode="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local — sala, endereço… (opcional)"
              className="h-9 text-sm"
            />
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Quando o convite for aceito, o compromisso entra automaticamente no calendário de vocês dois.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSend} disabled={loading || !title.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
