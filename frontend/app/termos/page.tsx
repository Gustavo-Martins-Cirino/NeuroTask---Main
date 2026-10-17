import type { Metadata } from "next"
import { TermosView } from "@/components/termos-view"

export const metadata: Metadata = {
  title: "Termos de uso e privacidade",
  description: "As regras de uso do NeuroTask e o que acontece com os seus dados, em linguagem direta.",
  alternates: { canonical: "/termos" },
}

export default function TermosPage() {
  return <TermosView />
}
