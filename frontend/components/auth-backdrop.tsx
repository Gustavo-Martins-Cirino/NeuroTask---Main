import { cn } from "@/lib/utils"

// Fundo das telas de entrada (login, cadastro, redefinir senha).
//
// Referência escolhida: inspirações/better-auth-6.webp — preto quase total,
// ruído sutil e um brilho azul difuso SANGRANDO DAS BORDAS, com o card contido
// no centro. Não é gradiente berrante atrás do formulário: o miolo fica escuro
// justamente para o campo de senha ter contraste.
//
// Escuro SEMPRE, mesmo com o app em tema claro: a entrada tem identidade
// própria, e é o que a referência pede. O `dark` no wrapper faz os tokens oklch
// do tema escuro valerem aqui dentro, então Input/Button/Label vêm certos sem
// nenhum override.
//
// CSS puro (nada de WebGL): é a primeira tela que alguém vê, às vezes em rede
// ruim, e um canvas atrasaria justamente o formulário que a pessoa veio usar.

export function AuthBackdrop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("dark relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4", className)}
      style={{ background: "#08080b" }}
    >
      <div aria-hidden className="nt-auth-glow" />
      <div aria-hidden className="nt-auth-noise" />
      {/* z-10: o conteúdo fica acima do brilho e do ruído. */}
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </div>
  )
}
