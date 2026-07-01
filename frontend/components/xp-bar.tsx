"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface XpBarProps {
  level?: number
  currentXp?: number
  xpForNextLevel?: number
  className?: string
}

export function XpBar({
  level = 1,
  currentXp = 0,
  xpForNextLevel = 100,
  className,
}: XpBarProps) {
  const progress = Math.min(100, Math.max(0, (currentXp / xpForNextLevel) * 100))

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-2">
        <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">
          {level}
        </div>
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
          Lvl {level}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.1 }}
          />
        </div>
        <span className="hidden text-xs tabular-nums text-muted-foreground md:inline">
          {currentXp}/{xpForNextLevel} XP
        </span>
      </div>
    </div>
  )
}
