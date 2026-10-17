import type { Metadata } from "next"

// Um passo do fluxo de senha, não uma página para achar na busca.
export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
