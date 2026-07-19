# DEC-002 — OAuth refresh-token rotativo para o Bling v3

Data: 2026-07-19 · Status: aceito

## Contexto

O access token do Bling v3 expira em ~6h; não dá para colar um token fixo em
env como na missão 1 (`BLING_ACCESS_TOKEN`) sem exigir reconfiguração manual
periódica. O provedor também rotaciona o refresh token a cada uso — usar a
mesma semente duas vezes falha. Era preciso decidir como renovar, onde guardar
credenciais no request, e onde persistir o refresh token rotacionado sem
depender de infraestrutura externa nesta fase do projeto.

## Decisão

- `src/lib/bling-auth.ts` (`BlingAuth`) renova o access token sozinho: cache
  em memória, skew de 60s antes de expirar, single-flight (chamadas
  concorrentes compartilham o mesmo POST de renovação).
- Credenciais (`client_id`/`client_secret`) vão no header `Authorization:
  Basic` do request de token — nunca no body (body → `invalid_client`).
- Endpoint fixo em `https://www.bling.com.br/Api/v3/oauth/token`, **com
  `www`**: sem `www`, o host responde 301 e o redirect pode converter o POST
  em GET, derrubando o body do request.
- O refresh token retornado a cada renovação (que rotaciona) é persistido
  imediatamente via `TokenStore` (interface); implementação padrão é
  `FileTokenStore`, que grava em `.bling-tokens.json` (raiz, gitignored) com
  precedência sobre a semente `BLING_REFRESH_TOKEN` do env. Em fs read-only
  (serverless), a escrita falha com warn e o fluxo segue só em memória — sem
  vazar o token no log.
- `getProdutos()` (`src/lib/bling.ts`) usa esse token para paginar
  `GET /Api/v3/produtos` (até 30 páginas de 100, parada na primeira página
  vazia/incompleta), com throttle de 350ms entre páginas (rate limit ~3
  req/s) e cache por fetch (`revalidate: 600`).
- A URL de imagem do Bling é assinada (AWS, `Expires`) e caduca — o servidor
  nunca a expõe ao client. Guarda a URL original em memória (repopulada a
  cada `getProdutos`) e serve via proxy `GET /api/imagem?id=<id>`
  (`src/app/api/imagem/route.ts`), que só aceita `id` numérico e resolve a
  URL no servidor — desenhado para não virar um open relay (SSRF).
- `src/app/api/produtos/route.ts` é `dynamic = "force-dynamic"`: com
  revalidate de rota, o handler seria prerenderizado no build, congelando o
  mock mesmo com credenciais presentes em runtime. O cache fica só no fetch
  interno das páginas do Bling.
- Fallback para o catálogo mock permanece universal: qualquer falha (sem
  credenciais, erro de auth, HTTP não-ok, rede, resposta vazia) cai
  silenciosamente para `mock-produtos.ts` — o site nunca quebra por causa do
  Bling.

## Consequências

- Zero intervenção manual para manter o token vivo enquanto o processo roda
  continuamente e o disco persiste (VM/servidor próprio).
- **Limitação conhecida, não implementada**: em serverless (ex.: Vercel), o
  filesystem não persiste entre instâncias — `FileTokenStore` não é
  suficiente para produção nesse alvo. É necessário implementar um
  `TokenStore` sobre KV/DB (a interface já existe, propositalmente, para
  isso) antes de fazer deploy serverless com credenciais reais.
- Perder `.bling-tokens.json` depois de já ter rotacionado invalida a semente
  do `.env.local` — só se recupera reautorizando manualmente (novo
  authorization code). Vale considerar backup do arquivo ou migração para
  KV/DB antes de ir para produção.
- A URL assinada da imagem nunca vaza ao client, mas isso significa que toda
  visualização de imagem passa pelo servidor Next (proxy) — custo extra de
  banda/latência a monitorar se o catálogo crescer muito.
