import Link from "next/link";
import Footer from "@/components/sections/Footer";
import SuperficieLoja from "@/components/loja/SuperficieLoja";

// 404 de escopo de produto: id inválido, inexistente ou fora do catálogo.
// Mesma superfície clara da ficha — quem chega aqui veio de um link de compra.
export default function ProdutoNaoEncontrado() {
  return (
    <>
      <SuperficieLoja className="items-center justify-center px-6 py-32">
        <div className="mx-auto max-w-md">
          <h1 className="font-serif text-[1.625rem] font-normal leading-tight text-foreground sm:text-3xl">
            Essa fragrância não está no catálogo.
          </h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-muted">
            O item pode ter saído de linha ou o endereço pode estar incorreto.
            Volte à curadoria para encontrar a sua assinatura.
          </p>
          <Link
            href="/catalogo"
            className="mt-8 inline-block bg-foreground px-8 py-3.5 font-sans text-sm font-medium text-background transition-colors duration-500 ease-lux hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            Ver o catálogo
          </Link>
        </div>
      </SuperficieLoja>
      <Footer />
    </>
  );
}
