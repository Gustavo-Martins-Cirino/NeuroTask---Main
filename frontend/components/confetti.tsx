"use client"

import { motion } from "framer-motion"

const COLORS = ["#6366f1", "#22c55e", "#eab308", "#ec4899", "#06b6d4", "#f97316"]
const PIECES = 16

export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      {Array.from({ length: PIECES }).map((_, i) => {
        const angle = (i / PIECES) * Math.PI * 2
        const dist = 36 + Math.random() * 28
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: 0.4,
              rotate: Math.random() * 360,
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute h-1.5 w-1.5 rounded-[2px]"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
        )
      })}
    </div>
  )
}
