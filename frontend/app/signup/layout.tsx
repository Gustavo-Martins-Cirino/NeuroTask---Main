import type { Metadata } from "next"

// A página é client; o título e o endereço canônico moram aqui.
export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Crie sua conta grátis no NeuroTask: tarefas, calendário com blocos de tempo, Modo Foco e uma IA que age no app.",
  alternates: { canonical: "/signup" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
