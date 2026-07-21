import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Catalog from "@/components/sections/Catalog";
import Footer from "@/components/sections/Footer";

/**
 * Home — a única página ESCURA do site (a marca). As páginas de compra são
 * claras e vestem `SuperficieLoja`.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      {/* Alvo do link "Sobre" do header. O id vive aqui, e não dentro de
          About.tsx, para não tocar em arquivo fora do escopo desta frente.
          `scroll-mt` compensa o header fixo (h-16 / sm:h-20). */}
      <div id="sobre" className="scroll-mt-16 sm:scroll-mt-20">
        <About />
      </div>
      <Catalog />
      <Footer />
    </main>
  );
}
