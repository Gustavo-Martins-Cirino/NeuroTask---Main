import { type AvatarConfig } from "@/lib/avatar"
import { corDaCalca } from "@/lib/avatar-calca"
import { caminhoDoQuadrilSentado, caminhoDoTronco, silhuetaDe } from "@/lib/avatar-silhueta"
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
const LA = "#b8434a"
const LA_BARRA = "#dc6b70"
const MOLETOM = "#4a4e59"

// Acessórios da loja no bonequinho DE COSTAS. Chapéu se vê inteiro; do óculos
// sobra o que passa da silhueta da cabeça: as hastes correndo até a orelha e a
// pontinha do aro de cada lado. É o teto desta vista — ela não tem rosto.
function Acessorios({ acess, hx, hy }: { acess: AvatarAccessories; hx: number; hy: number }) {
  return (
    <>
      {acess.oculos && (() => {
        const escuros = acess.oculos === "escuros"
        const aro = escuros ? "#14141a" : "#4d3120"
        // De costas, do óculos sobra só a HASTE correndo por cima do cabelo até
        // a orelha e a dobradiça que escapa junto à silhueta — nunca a LENTE,
        // que aponta para a frente. A versão antiga desenhava a lente inteira,
        // clara e brilhante, ACIMA da linha das orelhas: fora do crânio e no
        // meio do rosto que não existe, ela lia como um olho/orelha de ogro.
        return (
          <g>
            {[-1, 1].map((s) => (
              <g key={s}>
                {/* A haste corre RENTE à silhueta, não por cima do crânio.
                    Antes ela saía de `hy - 6.5` e atravessava até a orelha: numa
                    cabeça de raio 10 isso é um arco cruzando a cabeça inteira, e
                    de longe lia como o óculos ser gigante. Óculos visto de
                    costas quase não aparece — é essa a informação. */}
                <path
                  d={`M ${hx + s * 6.6} ${hy - 4.4} q ${s * 2.6} 1.6 ${s * 3.4} 4.2`}
                  fill="none" stroke={aro} strokeWidth="1.15" strokeLinecap="round"
                />
                {/* dobradiça junto à orelha — só a pontinha que passa da cabeça */}
                <ellipse cx={hx + s * 9.9} cy={hy + 0.2} rx="1.05" ry="1.5" fill={aro} />
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

      {acess.chapeu === "gorro" && (
        <g>
          {/* a copa abraça o crânio; a barra enrolada é o que diz "gorro" */}
          <path d={`M ${hx - 10.9} ${hy + 1.6} a 10.9 10.9 0 0 1 21.8 0 z`} fill={LA} />
          <rect x={hx - 11.1} y={hy - 0.4} width="22.2" height="4.8" rx="2.4" fill={LA_BARRA} />
          <circle cx={hx} cy={hy - 12.2} r="3" fill={LA_BARRA} />
        </g>
      )}

      {acess.chapeu === "capuz" && (
        <g>
          {/* de costas o capuz é o que MAIS se vê: ele engole a cabeça inteira */}
          <path
            d={`M ${hx - 13.6} ${hy + 8.5} q -1.4 -16.5 13.6 -17.6 q 15 1.1 13.6 17.6 q -6.2 4.2 -13.6 4.2 q -7.4 0 -13.6 -4.2 z`}
            fill={MOLETOM}
          />
          <path
            d={`M ${hx - 13.6} ${hy + 8.5} q 13.6 5.2 27.2 0 l 0.7 3.2 q -14.3 5.4 -28.6 0 z`}
            fill={darken(MOLETOM, 20)}
          />
        </g>
      )}

      {acess.chapeu === "aureola" && (
        <g>
          {/* paira acima da cabeça: não encosta, e é isso que a faz ler como luz */}
          <ellipse cx={hx} cy={hy - 13} rx="8.2" ry="2.8" fill="none" stroke={OURO} strokeWidth="2.4" />
          <ellipse cx={hx} cy={hy - 13} rx="8.2" ry="2.8" fill="none" stroke="#fff6cf" strokeWidth="0.9" opacity="0.75" />
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
  // A regra do terno (calça sai do paletó) mora em lib/avatar-calca, e não
  // aqui: ela vale igual para o personagem 3D da cena.
  const pants = corDaCalca(config)
  const sleeve = outfit === "camiseta" ? skin : outfitColor
  const hx = 1 // centro da cabeça (x)
  // As medidas do corpo saem de lib/avatar-silhueta. Elas eram o MESMO desenho
  // em V nas duas versões, uma só mais estreita que a outra — daí "a feminina
  // só está mais magra". Agora a diferença é de forma: V contra ampulheta.
  const sil = silhuetaDe(body)
  const hy = sil.cabecaY
  const shoulderY = sil.peitoY
  // O braço sai do ponto mais LARGO do tronco, que é onde ficaria a axila.
  const ombroEsq = hx - sil.peitoL
  const ombroDir = hx + sil.peitoL

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
            stroke={darken(pants, 8)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="-9" cy="45.5" rx="5.4" ry="2.6" fill="#33333d" />

          {/* quadril — preenche a folga entre o bumbum (y≈1) e a
              almofada (y≈14.5): é o que acaba com o "flutuando" */}
          <path d={caminhoDoQuadrilSentado(sil, hx)} fill={darken(pants, 6)} />

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
          <path d="M -4.6 -4 L -1.2 -4 Q -0.4 2 -1 6 Q -1.6 9 -1.3 12 L -4.8 13.6 L -5.6 11 Q -6.2 7 -5.8 4 Q -5.4 0 -4.6 -4 Z" fill={darken(pants, 8)} />
          <ellipse cx="-4.8" cy="13.8" rx="3.4" ry="1.5" fill="#33333d" />
          <path d="M 4.6 -4 L 1.2 -4 Q 0.4 2 1 6 Q 1.6 9 1.3 12 L 4.8 13.6 L 5.6 11 Q 6.2 7 5.8 4 Q 5.4 0 4.6 -4 Z" fill={pants} />
          <ellipse cx="4.8" cy="13.8" rx="3.4" ry="1.5" fill="#3a3a44" />
        </g>
      )}

      {/* braços (de costas: cotovelos abertos indo para a mesa) */}
      {working ? (
        <g>
          <g className="nt-arm-l nt-o">
            <line x1={ombroEsq + 1} y1={shoulderY} x2="-23" y2="-31" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
            <circle cx="-24" cy="-31.5" r="2.6" fill={skin} />
          </g>
          <g className="nt-arm-r nt-o">
            <line x1={ombroDir - 1} y1={shoulderY} x2="1" y2="-34" stroke={darken(sleeve, 7)} strokeWidth="5" strokeLinecap="round" />
            <circle cx="0" cy="-34.5" r="2.6" fill={darken(skin, 10)} />
          </g>
        </g>
      ) : (
        <g>
          <line x1={ombroEsq} y1={shoulderY} x2={ombroEsq - 2.5} y2="-9" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
          <line x1={ombroDir} y1={shoulderY} x2={ombroDir + 2.5} y2="-9" stroke={darken(sleeve, 7)} strokeWidth="5" strokeLinecap="round" />
          <circle cx={ombroEsq - 3} cy="-7" r="2" fill={darken(skin, 8)} />
          <circle cx={ombroDir + 3} cy="-7" r="2" fill={darken(skin, 12)} />
          {/* manga curta: sem ela, o braço nu inteiro fazia a camiseta ler como
              regata. Cobre só o topo do braço, um fio mais grossa para "vestir" */}
          {outfit === "camiseta" && (
            <>
              <line x1={ombroEsq} y1={shoulderY - 0.5} x2={ombroEsq - 1} y2="-19.5" stroke={outfitColor} strokeWidth="5.6" strokeLinecap="round" />
              <line x1={ombroDir} y1={shoulderY - 0.5} x2={ombroDir + 1} y2="-19.5" stroke={darken(outfitColor, 7)} strokeWidth="5.6" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {/* tronco de costas — o contorno sai das medidas, e é ele que separa as
          duas silhuetas: V no masculino, ampulheta no feminino. */}
      <path d={caminhoDoTronco(sil, hx)} fill={outfitColor} />
      {outfit === "moletom" && (
        <path d={`M ${hx - 7} -32 q 8 6 16 0 l -1.5 9 q -6.5 4 -13 0 z`} fill={darken(outfitColor, 20)} />
      )}
      {outfit === "jaqueta" && (
        <g>
          <line x1={hx + 1} y1="-31" x2={hx + 1} y2="-2" stroke={darken(outfitColor, 26)} strokeWidth="2" />
          <line x1={ombroEsq + 1.5} y1="-24" x2={ombroEsq + 3.5} y2="-2" stroke={darken(outfitColor, 18)} strokeWidth="1.6" />
          <line x1={ombroDir - 1.5} y1="-24" x2={ombroDir - 3.5} y2="-2" stroke={darken(outfitColor, 18)} strokeWidth="1.6" />
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
      {/* nuca: cantos arredondados (era um quadrado de cantos vivos, que lia como
          recorte/glitch) + sombra da gola na base, para não sair direto da cabeça */}
      {/* pescoço: acompanha o ombro, senão a cabeça sai de um tronco estreito
          por um pescoço de lenhador. */}
      <rect x={hx - sil.pescocoL} y={hy + 6} width={sil.pescocoL * 2} height="7" rx="2.4" fill={darken(skin, 8)} />
      <ellipse cx={hx} cy={hy + 12.5} rx="5" ry="1.7" fill="#000" opacity="0.14" />
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

      {/* fones (de costas: arco + as duas conchas). O arco tem raio MAIOR que o
          crânio (12 vs 10), para passar por cima do cabelo em vez de afundar
          nele, e o grafite claro contrasta com o cabelo escuro — antes era quase
          da mesma cor (#2f2f38 vs cabelo #2f2a26) e o fone sumia. */}
      {headphones && (
        <g>
          <path d={`M ${hx - 11} ${hy - 2} a 12 12 0 0 1 22 0`} fill="none" stroke="#474d5a" strokeWidth="3" strokeLinecap="round" />
          {[-1, 1].map((s) => (
            <g key={s}>
              <ellipse cx={hx + s * 10.5} cy={hy + 2} rx="3.1" ry="4.6" fill="#3a3f4a" />
              <ellipse cx={hx + s * 10.5} cy={hy + 2} rx="1.4" ry="2.4" fill="#5b6270" />
            </g>
          ))}
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
