import { type AvatarConfig } from "@/lib/avatar"
import { type AvatarAccessories } from "@/lib/avatar-accessories"
import { cn } from "@/lib/utils"

// Bonequinho 2D (paper-doll) sentado DE COSTAS (¾ traseiro), olhando para
// a mesa/monitores da cena isométrica (direção frente = cima-esquerda na
// tela). Sem rosto — vemos cabelo, costas e as pernas indo PARA FRENTE.
// Origem local = quadril, sobre o assento. Usado na cena e no editor.

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) - amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) - amt))
  const b = Math.max(0, Math.min(255, (n & 255) - amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

// Paleta dos acessórios — os mesmos tons do personagem 3D (lib/office-model),
// para o boné do editor não ser de outro azul que o boné da cena.
const BONE = "#29599e"
// Feltro um pouco mais claro que o do 3D (0.18,0.16,0.19): lá a luz separa o
// chapéu do cabelo, aqui é tudo chapado — no tom original virava uma mancha só.
const FELTRO = "#3b3542"
const FITA = "#8c2333"
const OURO = "#edbf3d"

// Acessórios da loja no bonequinho DE COSTAS. Chapéu se vê inteiro; do óculos
// sobra o que passa da silhueta da cabeça: as hastes correndo até a orelha e a
// pontinha do aro de cada lado. É o teto desta vista — ela não tem rosto.
function Acessorios({ acess, hx, hy }: { acess: AvatarAccessories; hx: number; hy: number }) {
  return (
    <>
      {acess.oculos && (() => {
        const escuros = acess.oculos === "escuros"
        const aro = escuros ? "#14141a" : "#4d3120"
        const lente = escuros ? "#0d0f17" : "#addbf0"
        // Fica ACIMA da linha das orelhas de propósito: a haste do óculos passa
        // por cima delas na vida real e, no desenho, é o único jeito de não
        // sumir atrás das conchas do fone (que ficam em hy+2).
        return (
          <g>
            {[-1, 1].map((s) => (
              <g key={s}>
                {/* haste correndo por cima do cabelo, em direção à orelha */}
                <path
                  d={`M ${hx + s * 10.4} ${hy - 5.2} q ${s * -0.6} 2.6 ${s * -2} 4.2`}
                  fill="none" stroke={aro} strokeWidth="1.8" strokeLinecap="round"
                />
                {/* borda do aro escapando da silhueta da cabeça */}
                <ellipse cx={hx + s * 11.3} cy={hy - 5.2} rx="1.9" ry="3.4" fill={aro} />
                <ellipse cx={hx + s * 11.6} cy={hy - 5.2} rx="0.9" ry="2.1" fill={lente} opacity={escuros ? 1 : 0.75} />
              </g>
            ))}
          </g>
        )
      })()}

      {acess.chapeu === "bone" && (
        <g>
          {/* a aba aponta para a frente: de costas só as pontas aparecem */}
          <ellipse cx={hx} cy={hy - 3.4} rx="14" ry="4.4" fill={darken(BONE, 26)} />
          <path d={`M ${hx - 10.4} ${hy - 1} a 10.4 10.4 0 0 1 20.8 0 z`} fill={BONE} />
          <rect x={hx - 10.4} y={hy - 3.4} width="20.8" height="2.6" rx="1.1" fill={darken(BONE, 12)} />
          {/* o vão da regulagem, atrás — é o que diz "estou vendo por trás" */}
          <path d={`M ${hx - 2.6} ${hy - 0.9} v -3.2 h 5.2 v 3.2 z`} fill={darken(BONE, 34)} />
          <circle cx={hx} cy={hy - 10.8} r="1.5" fill={darken(BONE, 16)} />
        </g>
      )}

      {acess.chapeu === "social" && (
        <g>
          {/* aba: a face de baixo mais escura dá espessura e destaca do cabelo */}
          <ellipse cx={hx} cy={hy - 2.2} rx="15.4" ry="5" fill={darken(FELTRO, 22)} />
          <ellipse cx={hx} cy={hy - 3.4} rx="15.4" ry="5" fill={darken(FELTRO, -16)} />
          <path
            d={`M ${hx - 7.4} ${hy - 4} L ${hx - 7} ${hy - 13} Q ${hx - 6.8} ${hy - 15} ${hx} ${hy - 15} Q ${hx + 6.8} ${hy - 15} ${hx + 7} ${hy - 13} L ${hx + 7.4} ${hy - 4} Z`}
            fill={FELTRO}
          />
          <path d={`M ${hx - 7.5} ${hy - 8.2} h 15 v 3.6 h -15 z`} fill={FITA} />
        </g>
      )}

      {acess.chapeu === "coroa" && (
        <g fill={OURO}>
          {/* aro acompanhando a curva da cabeça (o centro afunda: vemos de cima-trás) */}
          <path d={`M ${hx - 9.7} ${hy - 5.4} q 9.7 6.4 19.4 0 v 3.4 q -9.7 6.4 -19.4 0 z`} />
          {[0, 1, 2, 3, 4].map((i) => {
            const t = 0.1 + i * 0.2
            const x = hx - 9.7 + 19.4 * t
            const base = hy - 5.4 + 2 * t * (1 - t) * 6.4
            const alt = 5.2 + (1 - Math.abs(t - 0.5) * 2) * 2.4
            return (
              <g key={i}>
                <path d={`M ${x - 2.1} ${base} L ${x} ${base - alt} L ${x + 2.1} ${base} Z`} />
                <circle cx={x} cy={base - alt - 0.9} r="1.1" fill="#f6e6a8" />
              </g>
            )
          })}
        </g>
      )}
    </>
  )
}

export function AvatarFigure({
  config,
  accessories,
  working = false,
  seated = false,
}: {
  config: AvatarConfig
  accessories?: AvatarAccessories
  working?: boolean
  seated?: boolean
}) {
  const { body, skin, hairStyle, hairColor, outfit, outfitColor, headphones } = config
  const fem = body === "f"
  const pants = outfit === "terno" ? darken(outfitColor, 18) : "#3b5378"
  const sleeve = outfit === "camiseta" ? skin : outfitColor
  const hx = 1 // centro da cabeça (x)
  const hy = fem ? -39 : -40
  const shoulderY = fem ? -26 : -27
  const torsoW = fem ? 20 : 24
  const torsoX = fem ? -9 : -11

  return (
    <g>
      {/* pernas — dois modos:
          · seated (cena): de costas, as coxas iriam para FRENTE (sob a mesa),
            então mal se vê perna. Mostramos só os joelhos apontando para
            baixo-frente e a ponta dos pés, curtos, saindo de baixo do tronco —
            o "sentado" vem do assento visível da cadeira, não de pernas retas.
          · em pé (editor): corpo inteiro para personalizar. */}
      {seated ? (
        // Membro inferior sentado, em coords LOCAIS calibradas contra a cena
        // (origem = topo do assento pelo lado de trás; escala 0.667):
        //   y≈1  = bumbum (base do tronco) · y≈14.5 = superfície do assento
        //   y≈26 = frente do assento        · y≈45   = piso
        // Sequência: quadril preenche a folga bumbum→assento; coxas seguem
        // para a frente com joelho dobrado; canelas descem ao pé no piso.
        <g>
          {/* sombras de contato dos pés no piso */}
          <ellipse cx="-9" cy="45.5" rx="6" ry="2.2" fill="rgba(0,0,0,0.15)" />
          <ellipse cx="3" cy="46.5" rx="6" ry="2.2" fill="rgba(0,0,0,0.15)" />

          {/* perna distante (mais escura): coxa → joelho → canela → pé */}
          <polyline
            points="-2,10 -11,25 -9,44"
            fill="none"
            stroke={darken(pants, 16)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="-9" cy="45.5" rx="5.4" ry="2.6" fill="#33333d" />

          {/* quadril — preenche a folga entre o bumbum (y≈1) e a
              almofada (y≈14.5): é o que acaba com o "flutuando" */}
          <path d="M -9 1 Q -10 8 -8 15 L 8 15 Q 10 8 9 1 Z" fill={darken(pants, 6)} />

          {/* perna próxima (mais clara): coxa → joelho → canela → pé */}
          <polyline
            points="3,12 11,24 3,45"
            fill="none"
            stroke={pants}
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="3" cy="46.5" rx="5.8" ry="2.8" fill="#3a3a44" />
        </g>
      ) : (
        <g>
          <ellipse cx="-4.8" cy="13.8" rx="3.4" ry="1.5" fill="rgba(0,0,0,0.15)" />
          <ellipse cx="4.8" cy="13.8" rx="3.4" ry="1.5" fill="rgba(0,0,0,0.15)" />
          <path d="M -4.6 -4 L -1.2 -4 Q -0.4 2 -1 6 Q -1.6 9 -1.3 12 L -4.8 13.6 L -5.6 11 Q -6.2 7 -5.8 4 Q -5.4 0 -4.6 -4 Z" fill={darken(pants, 16)} />
          <ellipse cx="-4.8" cy="13.8" rx="3.4" ry="1.5" fill="#33333d" />
          <path d="M 4.6 -4 L 1.2 -4 Q 0.4 2 1 6 Q 1.6 9 1.3 12 L 4.8 13.6 L 5.6 11 Q 6.2 7 5.8 4 Q 5.4 0 4.6 -4 Z" fill={pants} />
          <ellipse cx="4.8" cy="13.8" rx="3.4" ry="1.5" fill="#3a3a44" />
        </g>
      )}

      {/* braços (de costas: cotovelos abertos indo para a mesa) */}
      {working ? (
        <g>
          <g className="nt-arm-l nt-o">
            <line x1={torsoX + 1} y1={shoulderY} x2="-23" y2="-31" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
            <circle cx="-24" cy="-31.5" r="2.6" fill={skin} />
          </g>
          <g className="nt-arm-r nt-o">
            <line x1={torsoX + torsoW - 1} y1={shoulderY} x2="1" y2="-34" stroke={darken(sleeve, 12)} strokeWidth="5" strokeLinecap="round" />
            <circle cx="0" cy="-34.5" r="2.6" fill={darken(skin, 10)} />
          </g>
        </g>
      ) : (
        <g>
          <line x1={torsoX} y1={shoulderY} x2={torsoX - 2.5} y2="-9" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
          <line x1={torsoX + torsoW} y1={shoulderY} x2={torsoX + torsoW + 2.5} y2="-9" stroke={darken(sleeve, 12)} strokeWidth="5" strokeLinecap="round" />
          <circle cx={torsoX - 3} cy="-7" r="2" fill={darken(skin, 12)} />
          <circle cx={torsoX + torsoW + 3} cy="-7" r="2" fill={darken(skin, 18)} />
        </g>
      )}

      {/* tronco de costas */}
      <path
        d={
          fem
            ? `M ${torsoX} -28 q 0 -5 5 -5 h 10 q 5 0 5 5 l 1.5 20 q 0.5 9 -6 9 h -11 q -6.5 0 -6 -9 z`
            : `M ${torsoX} -28 q 0 -5 5 -5 h 14 q 5 0 5 5 l 0.5 21 q 0 8 -6 8 h -13 q -6 0 -6 -8 z`
        }
        fill={outfitColor}
      />
      {outfit === "moletom" && (
        <path d={`M ${hx - 7} -32 q 8 6 16 0 l -1.5 9 q -6.5 4 -13 0 z`} fill={darken(outfitColor, 20)} />
      )}
      {outfit === "jaqueta" && (
        <g>
          <line x1={hx + 1} y1="-31" x2={hx + 1} y2="-2" stroke={darken(outfitColor, 26)} strokeWidth="2" />
          <line x1={torsoX + 1.5} y1="-24" x2={torsoX + 3.5} y2="-2" stroke={darken(outfitColor, 18)} strokeWidth="1.6" />
          <line x1={torsoX + torsoW - 1.5} y1="-24" x2={torsoX + torsoW - 3.5} y2="-2" stroke={darken(outfitColor, 18)} strokeWidth="1.6" />
        </g>
      )}
      {outfit === "terno" && (
        <g>
          <line x1={hx + 1} y1="-12" x2={hx + 1} y2="-1" stroke={darken(outfitColor, 26)} strokeWidth="1.8" />
          <path d={`M ${hx - 5} -31 l 2 3 h 7 l 2 -3`} fill="none" stroke="#f4f1ea" strokeWidth="2.4" />
        </g>
      )}

      {/* pescoço + cabeça de costas — a NUCA. Não existe círculo de pele:
          a cabeça É o cabelo (pele só no pescoço). Sem rosto possível. */}
      <rect x={hx - 3.5} y={hy + 6} width="7" height="7" fill={darken(skin, 8)} />
      {hairStyle === "raspado" ? (
        <g>
          <circle cx={hx} cy={hy} r="10" fill={darken(skin, 10)} />
          <circle cx={hx} cy={hy} r="10" fill={hairColor} opacity="0.45" />
        </g>
      ) : (
        <circle cx={hx} cy={hy} r="10" fill={hairColor} />
      )}
      {/* brilho sutil do cabelo (profundidade) */}
      {hairStyle !== "raspado" && (
        <path d={`M ${hx - 7} ${hy - 5} a 9 9 0 0 1 9 -4`} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.14" />
      )}
      {/* silhuetas por estilo */}
      {hairStyle === "franja" && (
        <g fill={hairColor}>
          <path d={`M ${hx - 11} ${hy} q -1.5 6 1 9.5 q 2 -5 -1 -9.5 z`} />
          <path d={`M ${hx + 11} ${hy} q 1.5 6 -1 9.5 q -2 -5 1 -9.5 z`} />
        </g>
      )}
      {hairStyle === "cacheado" && (
        <g fill={hairColor}>
          <circle cx={hx - 7} cy={hy - 5} r="5.5" />
          <circle cx={hx + 1} cy={hy - 9} r="6" />
          <circle cx={hx + 8} cy={hy - 4} r="5.5" />
          <circle cx={hx - 9} cy={hy + 3} r="4.5" />
          <circle cx={hx + 10} cy={hy + 3} r="4.5" />
          <circle cx={hx - 3} cy={hy + 8} r="4" />
          <circle cx={hx + 4} cy={hy + 8} r="4" />
        </g>
      )}
      {hairStyle === "longo" && (
        <path d={`M ${hx - 8} ${hy + 3} q -2.5 15 0.5 23 q 7 3.5 15 0 q 3 -8 0.5 -23 q -8 4 -16 0 z`} fill={hairColor} />
      )}
      {hairStyle === "coque" && <circle cx={hx} cy={hy - 11} r="4.5" fill={hairColor} />}

      {/* acessórios da loja — depois do cabelo, antes dos fones (na vida real
          o arco do headphone passa por cima do boné e das hastes do óculos) */}
      {accessories && <Acessorios acess={accessories} hx={hx} hy={hy} />}

      {/* fones (de costas: arco + as duas conchas) */}
      {headphones && (
        <g>
          <path d={`M ${hx - 10} ${hy - 2} a 10 10 0 0 1 20 0`} fill="none" stroke="#2f2f38" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx={hx - 10} cy={hy + 2} rx="3" ry="4.4" fill="#2f2f38" />
          <ellipse cx={hx + 10} cy={hy + 2} rx="3" ry="4.4" fill="#2f2f38" />
        </g>
      )}
    </g>
  )
}

// Enquadramento cabeça-aos-ombros. Os números não são arbitrários: a cabeça tem
// raio 10 em torno de (1,-40) e os ombros ficam em -27, então a janela vai de
// -58 (sobra para a coroa, que sobe até -55) a -20. O corpo inteiro num círculo
// de 32px não se enxergaria — vira um borrão com uma bolinha em cima.
const RETRATO_VIEWBOX = "-18 -58 38 38"

// O retrato circular do bonequinho, para listas e para o header. Existe como
// componente porque o enquadramento acima é fácil de copiar errado, e um
// viewBox de menos já corta a cabeça.
export function AvatarRetrato({
  config,
  accessories,
  className,
}: {
  config: AvatarConfig
  accessories?: AvatarAccessories
  className?: string
}) {
  return (
    <svg viewBox={RETRATO_VIEWBOX} className={cn("h-full w-full", className)} aria-hidden>
      <AvatarFigure config={config} accessories={accessories} />
    </svg>
  )
}
