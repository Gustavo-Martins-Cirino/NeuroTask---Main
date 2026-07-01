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
  Sparkles,
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

  return (
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      animate={{ width: expanded ? 232 : 72 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed left-4 top-1/2 z-50 -translate-y-1/2"
    >
      <nav className="flex flex-col gap-1 rounded-2xl border border-border/50 bg-card/80 p-2 shadow-lg backdrop-blur-xl">
        <div className="mb-2 flex h-10 items-center gap-3 overflow-hidden rounded-xl px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
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
  )
}
