import { type AvatarConfig } from "@/lib/avatar"

// Bonequinho 2D (paper-doll) sentado, de lado, virado para a esquerda
// (direção da mesa na cena isométrica). Origem local = quadril, sobre o
// assento. Usado na cena do Escritório e no editor de avatar.

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) - amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) - amt))
  const b = Math.max(0, Math.min(255, (n & 255) - amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

export function AvatarFigure({ config, working = false }: { config: AvatarConfig; working?: boolean }) {
  const { skin, hairStyle, hairColor, outfit, outfitColor, headphones } = config
  const pants = outfit === "terno" ? darken(outfitColor, 18) : "#3b5378"
  const sleeve = outfit === "camiseta" ? skin : outfitColor
  const hx = 2 // centro da cabeça (x)
  const hy = -40

  return (
    <g>
      {/* perna de trás */}
      <polyline points="4,-2 -12,2 -12,20" fill="none" stroke={darken(pants, 16)} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="-14" cy="21" rx="6" ry="3.4" fill="#26262e" />
      {/* perna da frente */}
      <polyline points="0,-4 -17,0 -17,19" fill="none" stroke={pants} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="-19.5" cy="20" rx="6" ry="3.4" fill="#2c2c33" />

      {/* tronco */}
      <rect x="-10" y="-32" width="22" height="32" rx="8" fill={outfitColor} />
      {outfit === "moletom" && <ellipse cx="10" cy="-27" rx="5" ry="7" fill={darken(outfitColor, 20)} />}
      {outfit === "jaqueta" && (
        <g>
          <line x1="-4" y1="-30" x2="-4" y2="-2" stroke={darken(outfitColor, 28)} strokeWidth="2" />
          <polygon points="-8,-31 -2,-31 -6,-25" fill={darken(outfitColor, 24)} />
          <polygon points="0,-31 6,-31 2,-25" fill={darken(outfitColor, 24)} />
        </g>
      )}
      {outfit === "terno" && (
        <g>
          <polygon points="-8,-31 0,-31 -4,-20" fill="#f4f1ea" />
          <line x1="-4" y1="-27" x2="-4" y2="-16" stroke="#a33b3b" strokeWidth="2.6" />
          <polygon points="-9,-31 -3,-24 -9,-18" fill={darken(outfitColor, 24)} />
          <polygon points="1,-31 -3,-24 1,-18" fill={darken(outfitColor, 24)} />
        </g>
      )}

      {/* braços */}
      {working ? (
        <g>
          <g className="nt-arm-l nt-o">
            <line x1="-3" y1="-26" x2="-19" y2="-31" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
            <line x1="-19" y1="-31" x2="-33" y2="-35" stroke={skin} strokeWidth="4.5" strokeLinecap="round" />
          </g>
          <g className="nt-arm-r nt-o">
            <line x1="1" y1="-24" x2="-14" y2="-28" stroke={darken(sleeve, 12)} strokeWidth="5" strokeLinecap="round" />
            <line x1="-14" y1="-28" x2="-28" y2="-32" stroke={darken(skin, 10)} strokeWidth="4.5" strokeLinecap="round" />
          </g>
        </g>
      ) : (
        <g>
          <line x1="-4" y1="-26" x2="-12" y2="-8" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
          <line x1="-12" y1="-8" x2="-14" y2="-4" stroke={skin} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}

      {/* cabeça */}
      <circle cx={hx} cy={hy} r="10" fill={skin} />
      <circle cx={hx + 6} cy={hy + 1} r="1.8" fill={darken(skin, 24)} />

      {/* cabelo */}
      {hairStyle === "raspado" && (
        <path d={`M ${hx - 9} ${hy - 3} a 10 10 0 0 1 19 -1.5 l -2 2 a 8.5 8.5 0 0 0 -15.5 1 z`} fill={hairColor} opacity="0.85" />
      )}
      {(hairStyle === "curto" || hairStyle === "franja" || hairStyle === "longo" || hairStyle === "coque") && (
        <path d={`M ${hx - 10} ${hy} a 10 10 0 0 1 20 -1 q 2 4 1 7 q -3 2 -5 0 q 3 -7 -12 -8 q -3 0 -4 2 z`} fill={hairColor} />
      )}
      {hairStyle === "franja" && (
        <path d={`M ${hx - 10} ${hy} q -2 4 0 7 q 2 -4 1 -7 z`} fill={hairColor} />
      )}
      {hairStyle === "cacheado" && (
        <g fill={hairColor}>
          <circle cx={hx - 6} cy={hy - 7} r="5" />
          <circle cx={hx + 1} cy={hy - 10} r="5.5" />
          <circle cx={hx + 8} cy={hy - 6} r="5" />
          <circle cx={hx + 10} cy={hy + 1} r="4" />
        </g>
      )}
      {hairStyle === "longo" && (
        <path d={`M ${hx + 6} ${hy - 6} q 8 4 7 16 q -1 10 -3 14 q -5 1 -7 -2 q 3 -10 -1 -20 z`} fill={hairColor} />
      )}
      {hairStyle === "coque" && <circle cx={hx + 9} cy={hy - 9} r="4.2" fill={hairColor} />}

      {/* fones */}
      {headphones && (
        <g>
          <path d={`M ${hx - 10} ${hy - 1} a 10 10 0 0 1 20 -0.5`} fill="none" stroke="#2f2f38" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx={hx + 8} cy={hy + 2} rx="3.4" ry="4.4" fill="#2f2f38" />
        </g>
      )}
    </g>
  )
}
