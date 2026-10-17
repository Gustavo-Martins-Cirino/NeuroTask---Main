import type { Metadata } from "next"

// A página é client; o título e o endereço canônico moram aqui.
export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre no NeuroTask para ver suas tarefas, sua agenda e falar com a Neuro IA.",
  alternates: { canonical: "/login" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
