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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { XpBar } from "@/components/xp-bar"
import { createClient } from "@/lib/supabase/client"
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
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)
  const [gamification, setGamification] = useState<Gamification>(() => computeGamification(0))

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          email: user.email,
          name: user.user_metadata?.name || user.email?.split("@")[0],
        })
      }
    }
    getUser()
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-background/70 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
        )}
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        {children}
      </div>

      <div className="flex items-center gap-4">
        <XpBar
          level={gamification.level}
          currentXp={gamification.currentXp}
          xpForNextLevel={gamification.xpForNextLevel}
        />

        <div className="h-6 w-px bg-border/60" />

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
            <Button variant="ghost" className="relative h-10 w-10 rounded-xl">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/avatar.png" alt={user?.name || "Avatar"} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
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
