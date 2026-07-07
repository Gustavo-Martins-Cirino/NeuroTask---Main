"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Calendar,
  CheckSquare,
  Bot,
  Settings,
  LayoutDashboard,
  Star,
  FileText,
  Brain,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useFocus } from "@/components/focus"

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/app",
  },
  {
    icon: Calendar,
    label: "Calendário",
    href: "/app/calendar",
  },
  {
    icon: CheckSquare,
    label: "Tarefas",
    href: "/app/tasks",
  },
  {
    icon: Star,
    label: "Favoritos",
    href: "/app/favorites",
  },
  {
    icon: FileText,
    label: "Notas",
    href: "/app/notes",
  },
  {
    icon: Bot,
    label: "Neuro IA",
    href: "/app/ai",
  },
]

const bottomItems = [
  {
    icon: Settings,
    label: "Configurações",
    href: "/app/settings",
  },
]

const labelMotion = {
  initial: { opacity: 0, width: 0 },
  animate: { opacity: 1, width: "auto" },
  exit: { opacity: 0, width: 0 },
  transition: { duration: 0.18, ease: "easeOut" as const },
}

export function Dock() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const { openFocus } = useFocus()

  const allItems = [...navItems, ...bottomItems]

  const renderItem = (item: (typeof allItems)[number]) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/app" && pathname.startsWith(item.href))

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex h-10 items-center gap-3 overflow-hidden rounded-xl px-3 transition-colors duration-200",
          "hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="dock-active-pill"
            className="absolute inset-0 rounded-xl bg-accent shadow-sm"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <item.icon className="relative z-10 h-5 w-5 shrink-0" />
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.span
              key="label"
              {...labelMotion}
              className="relative z-10 whitespace-nowrap text-sm font-medium"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    )
  }

  const renderMobileItem = (item: (typeof allItems)[number]) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/app" && pathname.startsWith(item.href))
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        className={cn(
          "relative flex h-14 flex-1 items-center justify-center transition-colors",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {isActive && (
          <motion.span
            layoutId="dock-active-dot"
            className="absolute top-1.5 h-1 w-6 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <item.icon className="h-5 w-5" />
      </Link>
    )
  }

  return (
    <>
    {/* Barra inferior (mobile) */}
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-border/50 bg-card/90 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {navItems.map(renderMobileItem)}
      <button
        onClick={() => openFocus()}
        aria-label="Modo Foco"
        className="flex h-14 flex-1 items-center justify-center text-muted-foreground transition-colors"
      >
        <Zap className="h-5 w-5" />
      </button>
      {bottomItems.map(renderMobileItem)}
    </nav>

    {/* Dock lateral (desktop) */}
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      animate={{ width: expanded ? 232 : 72 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed left-4 top-1/2 z-50 hidden -translate-y-1/2 md:block"
    >
      <nav className="flex flex-col gap-1 rounded-2xl border border-border/50 bg-card/80 p-2 shadow-lg backdrop-blur-xl">
        <div className="mb-2 flex h-10 items-center gap-3 overflow-hidden rounded-xl px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.span
                key="brand"
                {...labelMotion}
                className="whitespace-nowrap text-lg font-bold text-foreground"
              >
                NeuroTask
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-1 h-px bg-border/50" />

        {navItems.map(renderItem)}

        {/* Modo Foco */}
        <button
          onClick={() => openFocus()}
          className="relative flex h-10 items-center gap-3 overflow-hidden rounded-xl px-3 text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <Zap className="relative z-10 h-5 w-5 shrink-0" />
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.span key="focus-label" {...labelMotion} className="relative z-10 whitespace-nowrap text-sm font-medium">
                Modo Foco
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="flex-1" />
        <div className="mx-1 h-px bg-border/50" />

        {bottomItems.map(renderItem)}
      </nav>
    </motion.aside>
    </>
  )
}
