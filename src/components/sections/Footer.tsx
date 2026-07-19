export default function Footer() {
  const ano = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-border bg-background px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        <p className="text-gold-gradient font-serif text-2xl font-semibold">
          WLimports
        </p>
        <p className="font-sans text-xs uppercase tracking-[0.32em] text-muted">
          Perfumes importados
        </p>
        <p className="mt-2 font-sans text-xs text-muted/70">
          © {ano} WLimports. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
