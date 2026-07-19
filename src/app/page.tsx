import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Catalog from "@/components/sections/Catalog";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <About />
      <Catalog />
      <Footer />
    </main>
  );
}
