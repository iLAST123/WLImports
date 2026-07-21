import Link from "next/link";
import Footer from "@/components/sections/Footer";

// 404 de escopo de produto: id inválido, inexistente ou fora do catálogo.
export default function ProdutoNaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-6 py-32">
        <div className="mx-auto max-w-md text-center">
          <p className="font-sans text-xs uppercase tracking-[0.36em] text-gold">
            404
          </p>
          <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Essa fragrância não está no catálogo.
          </h1>
          <p className="mt-4 font-sans text-base leading-relaxed text-muted">
            O item pode ter saído de linha ou o endereço pode estar incorreto.
            Volte à curadoria para encontrar a sua assinatura.
          </p>
          <Link
            href="/#catalogo"
            className="mt-10 inline-block border border-gold/50 px-8 py-4 font-sans text-sm uppercase tracking-[0.18em] text-gold transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-gold hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver o catálogo
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
