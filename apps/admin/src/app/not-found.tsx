import Link from "next/link";

/** Rota inexistente no painel. */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="m-0 text-2xl font-bold">Página não encontrada</h1>
        <p className="m-0 text-fg-secondary">Confira o endereço ou volte para o início do painel.</p>
        <Link href="/" className="font-semibold text-accent-text">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
