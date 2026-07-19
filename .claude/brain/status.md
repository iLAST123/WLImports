# Status — WLimports

## 2026-07-19 — Missão 1 concluída

Site completo: design tokens (paleta preto quente/dourado/champanhe, tipografia
Bodoni Moda + Manrope), Hero com vídeo de fundo, About com vídeo, Catálogo
mock-first (busca por nome + chips de categoria, com fallback resiliente para
o mock quando o Bling falha ou não está configurado).

Gates verdes:
- `tsc` — sem erros de tipo.
- `lint` — sem erros de eslint.
- `build` — build de produção passa.
- QA funcional — aprovado (fluxo de busca/filtro, estados de loading/erro/vazio
  do catálogo, retry).
- Gate visual — aprovado em 3 viewports (mobile/tablet/desktop) e sob
  `prefers-reduced-motion` (Lenis desligado, animações substituídas por salto
  instantâneo, poster estático no lugar do vídeo).

## Pendências

- Credenciais reais do Bling (`BLING_CLIENT_ID`/`BLING_CLIENT_SECRET`/
  `BLING_ACCESS_TOKEN`) — hoje o site roda 100% em mock.
- Texto/copy real da marca — o conteúdo atual (hero, about, descrições) é
  placeholder.
- Imagens reais dos produtos — catálogo mock usa dados fictícios sem imagem
  real de produto.
- Deploy/hospedagem — ainda não configurados.
