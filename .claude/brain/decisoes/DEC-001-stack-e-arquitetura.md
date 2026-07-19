# DEC-001 — Stack e arquitetura

Data: 2026-07-19

## Contexto

Precisávamos de um site institucional + catálogo de perfumes importados
integrado à API do Bling (ERP usado pela marca), sem expor credenciais no
cliente e sem depender de uma credencial real do Bling estar disponível desde
o primeiro dia de desenvolvimento.

## Decisão

- **Next.js (App Router) + API Route dedicada** (`src/app/api/produtos/route.ts`)
  como fronteira: o módulo `src/lib/bling.ts` é server-only por convenção e só
  é importado por essa rota, então `BLING_ACCESS_TOKEN` nunca chega ao browser.
- **Mock-first**: `src/lib/mock-produtos.ts` segue exatamente a mesma
  estrutura (`Produto`/`ProdutosResponse`) que a normalização do Bling produz.
  Sem token configurado, ou em qualquer falha (erro de rede, `401`, `429`,
  resposta vazia), o site cai automaticamente para o mock — nunca quebra por
  causa de uma dependência externa.
- **Vídeos locais re-encodados**, nunca hotlink de CDN externa: `hero.mp4` e
  `about.mp4` (Pexels, royalty-free) foram baixados, re-encodados em H.264 sem
  áudio e servidos de `public/videos/`.
- **Tokens de design CSS-first (Tailwind v4)**: cores e fontes vivem como
  custom properties em `src/app/globals.css` (`@theme inline`), não em
  `tailwind.config`. Paleta: preto quente `#0E0A08` (base, não é "dark mode"
  de um tema claro — é a marca), dourado `#C6A15B` e champanhe `#E4D3AC`
  (acentos), off-white `#F4EEE3` (texto). Tipografia: Bodoni Moda (serif,
  headlines) + Manrope (sans, corpo).
- **Motion restrito a `transform`/`opacity`**, sempre respeitando
  `prefers-reduced-motion`: o Lenis (smooth scroll) é desligado inteiramente
  sob reduced-motion (`SmoothScroll.tsx`), e o `MotionConfig reducedMotion="user"`
  no layout raiz garante que as animações do Framer Motion também obedeçam a
  preferência do usuário.

## Consequências

- Desenvolvimento e QA nunca ficam bloqueados por credencial do Bling
  ausente — o mock cobre 100% da superfície de UI do catálogo.
- Trocar de mock para dados reais do Bling é só preencher
  `BLING_ACCESS_TOKEN`; nenhum componente de UI precisa mudar.
- A listagem do Bling v3 não traz categoria por produto — o filtro por
  categoria só aparece na UI quando os dados (mock ou reais) já têm
  `categoria` preenchida.
- Cache de 300s (`next: { revalidate: 300 }`) significa que uma mudança de
  catálogo no Bling pode levar até 5 minutos para refletir no site.
