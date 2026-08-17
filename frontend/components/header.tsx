"use client"

import { cn } from "@/lib/utils"
import { Moon, Sun, LogOut, User } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AvatarIniciais } from "@/components/avatar-iniciais"
import { XpBar } from "@/components/xp-bar"
import { FeedbackButton } from "@/components/feedback-button"
import { createClient } from "@/lib/supabase/client"
import { fetchRetrato, RETRATO_UPDATED_EVENT, type Retrato } from "@/lib/avatar"
import { fetchGamification, computeGamification, XP_UPDATED_EVENT, type Gamification, type XpUpdateDetail } from "@/lib/gamification"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface HeaderProps {
  title: string
  icon?: React.ReactNode
  children?: React.ReactNode
}

export function Header({ title, icon, children }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ email?: string; name?: string; foto?: string | null } | null>(null)
  const [boneco, setBoneco] = useState<Retrato | null>(null)
  const [gamification, setGamification] = useState<Gamification>(() => computeGamification(0))

  useEffect(() => {
    const lerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // A foto enviada em Configurações vem primeiro: ela foi escolhida a
        // dedo, e a do provedor veio junto com o login sem ninguém pedir.
        // Depois dela, a do provedor — cada um usa um nome de campo, daí a
        // cadeia: o Google manda `avatar_url` e `picture`, o GitHub manda
        // `avatar_url`.
        const meta = user.user_metadata ?? {}
        setUser({
          email: user.email,
          name: meta.full_name || meta.name || user.email?.split("@")[0],
          foto: meta.foto_perfil || meta.avatar_url || meta.picture || null,
        })
      }
    }

    // Sem `catch`, um banco sem o coins_shop.sql (a tabela user_items) derrubaria
    // o header inteiro por causa do retrato — que é o detalhe menos importante
    // dele. Falhou, ficam as iniciais.
    const lerBoneco = () => fetchRetrato().then(setBoneco).catch(() => setBoneco(null))

    // As duas telas que mudam o retrato ficam longe daqui — o editor de avatar
    // no Escritório e a foto de perfil em Configurações — e o header não é
    // remontado enquanto se fica nelas. Recarrega os dois degraus junto: o
    // evento não diz qual mudou, e nem precisa.
    const recarregar = () => {
      lerUsuario()
      lerBoneco()
    }
    recarregar()

    window.addEventListener(RETRATO_UPDATED_EVENT, recarregar)
    return () => window.removeEventListener(RETRATO_UPDATED_EVENT, recarregar)
  }, [supabase.auth])

  useEffect(() => {
    fetchGamification().then(setGamification)

    const onXpUpdate = (e: Event) => {
      const detail = (e as CustomEvent<XpUpdateDetail>).detail
      if (!detail) {
        fetchGamification().then(setGamification)
        return
      }

      setGamification((prev) => {
        if (detail.gamification.level > prev.level) {
          toast.success(`Subiu para o nível ${detail.gamification.level}! 🎉`, {
            description: "Continue assim, você está mandando bem.",
          })
        } else if (detail.amount > 0) {
          toast.success(`+${detail.amount} XP`)
        }
        return detail.gamification
      })
    }
    window.addEventListener(XP_UPDATED_EVENT, onXpUpdate)
    return () => window.removeEventListener(XP_UPDATED_EVENT, onXpUpdate)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 bg-background/70 px-3 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {icon && (
          <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
            {icon}
          </span>
        )}
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">{title}</h1>
        {children}
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <XpBar
          level={gamification.level}
          currentXp={gamification.currentXp}
          xpForNextLevel={gamification.xpForNextLevel}
        />

        <div className="h-6 w-px bg-border/60" />

        <FeedbackButton />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative rounded-full"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* size="icon" + p-0: sem isso o botão herda o `px-4` do tamanho
                padrão, sobra 8px de área interna e o avatar entra espremido —
                era o que deixava as iniciais ovais. */}
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl p-0">
              {/* Era um <AvatarImage src="/avatar.png">, arquivo que nunca
                  existiu: dava 404 a cada carregamento e caía num fallback de
                  uma letra só, igual para metade das pessoas. */}
              <AvatarIniciais nome={user?.name} foto={user?.foto} boneco={boneco} className="h-9 w-9 text-xs" title={user?.name || "Avatar"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex items-center gap-2 p-2">
              <AvatarIniciais nome={user?.name} foto={user?.foto} boneco={boneco} className="h-8 w-8 text-xs" />
              <div className="flex flex-col">
                <p className="text-sm font-medium">{user?.name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/app/settings")}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
