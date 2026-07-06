import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Erro de Autenticação</h1>
          <p className="text-muted-foreground">
            Ocorreu um erro durante o processo de autenticação. Por favor, tente novamente.
          </p>
          {reason && (
            <p className="mx-auto max-w-sm rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Detalhe técnico: {reason}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/login">Voltar para Login</Link>
        </Button>
      </div>
    </div>
  )
}
