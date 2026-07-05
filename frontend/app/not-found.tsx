import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
      <p className="max-w-sm text-muted-foreground">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Link
        href="/app"
        className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
