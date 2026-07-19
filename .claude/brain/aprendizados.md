# Aprendizados — WLimports

## 2026-07-19

1. **Delay do Framer Motion precisa viver dentro da `transition` da variant.**
   Quando uma `variant` já define sua própria `transition` (ex.: em
   `cardVariants`/`gridVariants`), uma prop `transition` passada diretamente no
   `motion.*` é ignorada — o delay/duração precisam ser declarados dentro do
   objeto `transition` da própria variant (`src/components/sections/Catalog.tsx`).

2. **Screenshot `fullPage` do Playwright não dispara `whileInView`.** Conteúdo
   abaixo do fold aparece com `opacity: 0` no PNG de página inteira porque o
   viewport de captura nunca "passa" pelo elemento — não é um bug de produção,
   é uma limitação do método de captura. Para validar reveals, é preciso
   scrollar de verdade (ou capturar por viewport) em vez de confiar só no
   fullPage screenshot.

3. **Contrato da listagem do Bling API v3**: o endpoint `GET /Api/v3/produtos`
   não traz categoria por item (campo inexistente na resposta) — por isso
   `normalizar()` em `src/lib/bling.ts` sempre deixa `categoria: undefined`
   para produtos vindos do Bling. Também: `preco: 0` significa "sem preço
   cadastrado", não "grátis" — tratado como "Sob consulta" na UI, nunca como
   "R$ 0,00".

4. **`create-next-app` recusa diretório com maiúsculas** (por causa das regras
   de naming do `package.json`/npm). O scaffold precisou ser feito numa pasta
   em minúsculas e depois movido/renomeado para `WLImports`.
