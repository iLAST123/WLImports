# DEC-004 — De catálogo a e-commerce: PDP, carrinho e checkout VISUAL (2026-07-21)

Status: aceito · Missão 6

## Contexto

O site era um **catálogo institucional**: uma home única (Hero → About →
Catalog → Footer) onde o card do produto era `<article>` não-interativo. O dono
pediu a reestruturação para e-commerce — clicar no produto abre a página do
produto, "Comprar" leva ao checkout — mais um "fator uau" na entrada.

Duas restrições moldaram tudo:

1. **Sem transação real.** Decisão explícita do dono, perguntada antes de
   executar: o fluxo vai até a tela de pagamento com a experiência pronta, mas
   **não processa pagamento e não integra gateway**. A UI fica pronta para
   plugar um gateway depois.
2. **Produção viva e cara de reconquistar.** A cadeia de refresh token do Bling
   vive só no Redis de produção (DEC-002 + aprendizados de 2026-07-21); o
   refresh token local está *stale*. Nenhum agente podia chamar a API real nem
   o endpoint OAuth. Todo o desenvolvimento correu contra o **mock** e contra
   `fetch` mockado nos testes.

## Decisão

### 1. Detalhe do produto: UMA busca por produto, mesma infraestrutura da DEC-003

A descrição rica **não existe na listagem** (`descricaoCurta` vem quase sempre
vazia) — ela só está no detalhe (`GET /produtos/{id}`), o mesmo endpoint que a
DEC-003 já chamava para resolver a imagem em tamanho original.

Em vez de somar uma segunda chamada, o cache de detalhe foi **generalizado**:
de `string | null` (só a URL da imagem grande) para um objeto com descrição +
galeria completa. `getImagemProduto` passou a derivar desse cache. Portanto:
**uma requisição de detalhe por produto serve imagem, descrição e galeria**, com
a mesma fila serial de `THROTTLE_MS` (350ms), o mesmo teto `MAX_FILA_DETALHE`,
o mesmo TTL de 600s, o mesmo cache negativo de 60s e o mesmo
`next: { revalidate: 600 }`. O orçamento de rate limit do Bling (3 req/s,
120k/dia) **não** aumentou.

Contrato novo em `src/lib/types.ts`: `ProdutoDetalhe` (= `Produto` + `descricao`
+ `imagens: string[]`) e `ProdutoDetalheResponse`. Função:
`getProdutoDetalhe(id, deps?)` — **nunca lança**; id fora do catálogo →
`produto: null`; falha do detalhe → devolve o produto da listagem sem descrição
(a página nunca quebra por causa do Bling, mantendo a regra universal da
DEC-001/DEC-002).

### 2. Descrição do ERP é renderizada como TEXTO PURO, nunca como HTML

O Bling costuma devolver **HTML** em `descricaoComplementar`. O conteúdo é
escrito por terceiros dentro do ERP e não é confiável para injeção direta.
Decisão: **sanitizar no servidor** (remover tags, decodificar as entidades
comuns, colapsar espaços, preservar parágrafos como `\n\n`) e renderizar no
client com `split("\n\n") → <p>`. **`dangerouslySetInnerHTML` é proibido nesta
superfície.** Custo aceito: a formatação rica do ERP (negrito, listas) se perde.

### 3. Galeria pelo mesmo proxy SSRF-safe, com índice

`/api/imagem?id=<id>` (imagem principal) ganhou o parâmetro opcional
`&i=<n>` para as demais imagens da galeria. O client continua passando
**apenas números** — nunca uma URL. O design SSRF-safe da DEC-002 permanece
intacto, assim como a whitelist de `Content-Type`, o `nosniff` e o fallback
para a miniatura.

### 4. Carrinho: contexto React + `localStorage`, sem lib

`src/lib/carrinho.tsx` — `useReducer` + Context, persistência em
`localStorage` (`wlimports:carrinho:v1`). Sem zustand/redux (Ponytail). As
funções puras (reducer, serialização, cálculo de subtotal) são exportadas para
serem testáveis **sem DOM** — o projeto não tem `vitest.config.ts`, portanto
não tem jsdom nem alias `@/` nos testes.

Regra de domínio preservada em todo o fluxo: `consultar: true` significa
**produto sem preço cadastrado** → "Sob consulta", **nunca "R$ 0,00"**; esses
itens entram na sacola mas **não somam no subtotal**, e a UI diz isso.

Hidratação: `localStorage` só é lido em `useEffect`. Ler no render causaria
hydration mismatch no Next.

### 5. Checkout é SIMULAÇÃO — e é honesto sobre isso

- Zero SDK de pagamento, zero `fetch` para gateway, zero envio de dados.
- **Nenhum dado de cartão é coletado.** O método de pagamento é uma escolha
  visual; a cobrança é combinada no atendimento.
- **Nenhum dado pessoal é persistido** (nem em `localStorage`).
- Frete não é calculado nem inventado — é "a combinar".
- A tela final diz **"pedido registrado"**, nunca "pagamento aprovado".
- O ponto exato de integração futura está marcado com `// TODO(gateway)`, sem
  construir a abstração agora.

### 6. Fator UAU: decorativo por cima, nunca bloqueante

Cortina de abertura + reveal de máscara na wordmark + grão de filme. Regras
duras: **não é preloader** (o conteúdo está no DOM desde o primeiro paint, o
LCP não piora), a abertura roda **uma vez por sessão** (`sessionStorage`), só
anima `transform`/`opacity`, e **não monta** sob `prefers-reduced-motion`.

## Consequências / limitações conhecidas

- A descrição perde formatação rica (trade-off consciente por segurança).
- O checkout não vende: é vitrine de experiência. Plugar um gateway exige
  backend real (a decisão de "não persistir nada" precisará ser revista).
- A PDP é `force-dynamic` e resolve o catálogo inteiro (`getProdutos`) para
  achar um produto — barato graças ao Data Cache de 600s, mas é O(catálogo)
  por página; se o catálogo crescer muito, vale um índice por id.
- Como todo o trabalho correu contra o mock, **o caminho real do Bling
  (descrição + galeria) nunca foi exercitado contra a API de verdade** — só
  contra `fetch` mockado. Validação em produção é obrigatória (ver `status.md`).
