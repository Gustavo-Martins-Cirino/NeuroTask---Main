import type { Metadata } from "next"
import { Landing } from "@/components/landing"

// A landing é client (idioma e região moram no navegador); este invólucro de
// servidor existe para ela ter metadados — título, endereço canônico e a prévia.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function Page() {
  return <Landing />
}
