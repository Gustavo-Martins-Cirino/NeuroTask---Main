import { cn } from "@/lib/utils"

// A textura do fundo da Neuro IA: um grão finíssimo sobre o preto da página.
//
// Veio no lugar da malha pastel, que eram três borrões grandes e difusos. O
// problema dela não era a intensidade — era a FORMA: em opacidade alta virava
// cor demais e a tela deixava de ser preta; em opacidade baixa não lia como
// efeito, lia como mancha. Não havia ponto bom entre os dois.
//
// O grão não tem forma. Ele dá material ao preto, uniformemente, e por isso não
// tem como virar mancha em nenhuma intensidade. É o mesmo recurso da referência
// escolhida para o Entrar/Criar conta (inspirações/better-auth-6.webp).
//
// Não é client component: marcação estática. O ruído é um SVG inline — sem
// arquivo, sem requisição — e o recorte por tema vive no CSS.

export function FundoGrao({ className }: { className?: string }) {
  return <div aria-hidden className={cn("fundo-grao", className)} />
}
