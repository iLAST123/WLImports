// Renovação automática do token OAuth 2.0 do Bling (API v3).
//
// ── ONDE COLAR AS CREDENCIAIS ──────────────────────────────────────────────
// Preencha em `.env.local` (nunca commitado — veja `.env.example`):
//   BLING_CLIENT_ID=<client_id do app cadastrado em developer.bling.com.br>
//   BLING_CLIENT_SECRET=<client_secret do MESMO app>
//   BLING_REFRESH_TOKEN=<refresh token SEMENTE, obtido UMA vez pelo fluxo
//                        authorization code; depois rotaciona sozinho e é
//                        persistido em `.bling-tokens.json`>
// O access_token NUNCA vem de env — expira em ~6h e é renovado por este módulo.
//
// Server-only por convenção: importado apenas por API Routes, nunca por Client
// Components — as credenciais jamais chegam ao browser.

import { promises as fs } from "fs";
import path from "path";

// COM `www` de propósito: a variante sem www (`bling.com.br`) responde um
// redirect 301 que pode converter o POST em GET e derrubar o body do request.
// O host com `www` é o usado pelo client open-source bling-erp-api-js e pela
// documentação oficial — mantê-lo é obrigatório para o refresh funcionar.
const TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";

// Fallback quando a resposta não trouxer expires_in (Bling costuma devolver 6h).
const DEFAULT_EXPIRES_IN_S = 21_600;
// Renova com folga: se faltar menos que isso para expirar, força refresh.
const REFRESH_SKEW_MS = 60_000;

export interface StoredTokens {
  accessToken?: string;
  /** Refresh token ATUAL (rotaciona a cada uso). */
  refreshToken: string;
  /** Epoch em ms de quando o accessToken expira. */
  expiresAt?: number;
}

/** Abstração de persistência dos tokens (troque por KV/DB em serverless). */
export interface TokenStore {
  load(): Promise<StoredTokens | null>;
  save(t: StoredTokens): Promise<void>;
}

/**
 * Persiste os tokens em `.bling-tokens.json` na raiz do projeto.
 * Path default: `process.cwd()/.bling-tokens.json` (override por
 * `BLING_TOKEN_STORE_PATH`). Em ambientes com fs read-only (serverless), a
 * escrita falha silenciosamente e o fluxo segue só com o cache em memória —
 * nesse cenário, trocar por um TokenStore de KV/DB (fora de escopo).
 */
export class FileTokenStore implements TokenStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      process.env.BLING_TOKEN_STORE_PATH ??
      path.join(process.cwd(), ".bling-tokens.json");
  }

  async load(): Promise<StoredTokens | null> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(raw) as StoredTokens;
    } catch {
      return null;
    }
  }

  async save(t: StoredTokens): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(t, null, 2), "utf8");
    } catch {
      // Nunca logamos o conteúdo dos tokens. Só avisamos que a persistência
      // falhou — em serverless isso é esperado (usar KV/DB nesse caso).
      console.warn(
        "[bling-auth] não foi possível persistir tokens em disco; seguindo só com memória",
      );
    }
  }
}

// Chave ÚNICA e fixa do token no Redis. Exportada porque o seeding manual em
// produção (SET inicial do refresh token semente) precisa bater EXATAMENTE com
// este nome. Nunca versionar/prefixar por ambiente aqui — um único registro.
export const KV_TOKEN_KEY = "wlimports:bling:tokens";

interface KvTokenStoreDeps {
  url?: string;
  token?: string;
  fetchFn?: typeof fetch;
}

/**
 * Resolve o par (url, token) do KV a partir das envs que a Vercel injeta.
 * Precedência: `UPSTASH_REDIS_REST_*` primeiro, senão `KV_REST_API_*`. Só
 * considera um par se AMBOS (url + token) estiverem presentes.
 */
function resolveKvEnv(
  env: Record<string, string | undefined>,
): { url: string; token: string } | null {
  const upstashUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (upstashUrl && upstashToken) return { url: upstashUrl, token: upstashToken };

  const kvUrl = env.KV_REST_API_URL?.trim();
  const kvToken = env.KV_REST_API_TOKEN?.trim();
  if (kvUrl && kvToken) return { url: kvUrl, token: kvToken };

  return null;
}

/**
 * Persiste os tokens no Upstash Redis via API REST (fetch puro — sem SDK).
 * Necessário em serverless (Vercel): o `FileTokenStore` não sobrevive entre
 * lambdas e a primeira rotação do refresh token se perderia (DEC-002 do brain).
 *
 * Contrato REST do Upstash:
 *   GET  {url}/get/{key}  → `{"result": "<string>|null}`
 *   POST {url}/set/{key}  (body = valor) → `{"result": "OK"}`
 * Auth via header `Bearer {token}`. `cache: "no-store"` obrigatório — token de
 * auth JAMAIS pode vir de cache do Next. Nunca logamos token/URL/segredo.
 */
export class KvTokenStore implements TokenStore {
  private readonly url: string;
  private readonly token: string;
  private readonly fetchFn: typeof fetch;

  constructor(deps: KvTokenStoreDeps = {}) {
    const resolved = resolveKvEnv(process.env);
    // Remove barra final para montar a URL de forma determinística.
    this.url = (deps.url ?? resolved?.url ?? "").replace(/\/+$/, "");
    this.token = deps.token ?? resolved?.token ?? "";
    this.fetchFn = deps.fetchFn ?? fetch;
  }

  async load(): Promise<StoredTokens | null> {
    try {
      const res = await this.fetchFn(`${this.url}/get/${KV_TOKEN_KEY}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { result?: string | null };
      // Chave ausente/vazia: `result` vem null — cenário normal, não é erro.
      if (json.result == null) return null;
      return JSON.parse(json.result) as StoredTokens;
    } catch {
      // Genérico de propósito: nunca expor token/URL nos logs.
      console.warn(
        "[bling-auth] não foi possível ler tokens do KV; seguindo sem cache do store",
      );
      return null;
    }
  }

  async save(t: StoredTokens): Promise<void> {
    try {
      const res = await this.fetchFn(`${this.url}/set/${KV_TOKEN_KEY}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        // Sem TTL: o token vive até ser sobrescrito pela próxima rotação.
        body: JSON.stringify(t),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Mesma semântica do FileTokenStore: save NUNCA lança; seguimos só com
      // o cache em memória. Log genérico, sem conteúdo de token.
      console.warn(
        "[bling-auth] não foi possível persistir tokens no KV; seguindo só com memória",
      );
    }
  }
}

/** Cliente Redis mínimo do qual dependemos (get/set/quit). */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  quit(): Promise<unknown>;
}

/** Cria o cliente a partir da connection string; injetável nos testes. */
export type RedisFactory = (url: string) => Promise<RedisLike>;

// Import dinâmico do ioredis: fora do bundle quando o Redis não é usado, e sem
// abrir conexão no import do módulo. `rediss://` (TLS do Upstash) é tratado pela
// própria connection string.
const defaultRedisFactory: RedisFactory = async (url) => {
  const mod = (await import("ioredis")) as unknown as {
    default: new (
      url: string,
      opts?: unknown,
    ) => RedisLike & { connect(): Promise<void> };
  };
  const Redis = mod.default;
  const client = new Redis(url, {
    // `lazyConnect` + `connect()` explícito: garante que a conexão está PRONTA
    // antes do primeiro comando. Sem isso, o get/set sai antes do handshake e
    // falha (foi o bug que fez o token rotacionado se perder em produção).
    lazyConnect: true,
    connectTimeout: 10_000,
    maxRetriesPerRequest: 2,
  });
  await client.connect();
  return client;
};

/**
 * Persiste os tokens no Redis via connection string (`REDIS_URL`), usando
 * ioredis sobre TCP/TLS. É o store adequado ao ambiente serverless da Vercel
 * quando a integração expõe só `REDIS_URL` (e não o par REST) — o
 * `FileTokenStore` não sobrevive entre lambdas (DEC-002 do brain). Uma conexão
 * curta por operação (get/set infrequentes: cold start + rotação). load/save
 * NUNCA lançam — degradam para a semente de env / memória. Nunca logam segredo.
 */
export class RedisTokenStore implements TokenStore {
  private readonly url: string;
  private readonly makeClient: RedisFactory;

  constructor(deps: { url?: string; makeClient?: RedisFactory } = {}) {
    this.url = deps.url ?? process.env.REDIS_URL ?? "";
    this.makeClient = deps.makeClient ?? defaultRedisFactory;
  }

  async load(): Promise<StoredTokens | null> {
    let client: RedisLike | undefined;
    try {
      client = await this.makeClient(this.url);
      const raw = await client.get(KV_TOKEN_KEY);
      if (raw == null) return null; // chave ausente: normal, não é erro
      return JSON.parse(raw) as StoredTokens;
    } catch {
      console.warn(
        "[bling-auth] não foi possível ler tokens do Redis; seguindo sem cache do store",
      );
      return null;
    } finally {
      try {
        await client?.quit();
      } catch {
        /* fecha silencioso */
      }
    }
  }

  async save(t: StoredTokens): Promise<void> {
    let client: RedisLike | undefined;
    try {
      client = await this.makeClient(this.url);
      await client.set(KV_TOKEN_KEY, JSON.stringify(t));
    } catch {
      console.warn(
        "[bling-auth] não foi possível persistir tokens no Redis; seguindo só com memória",
      );
    } finally {
      try {
        await client?.quit();
      } catch {
        /* fecha silencioso */
      }
    }
  }
}

/**
 * Escolhe o store conforme o ambiente, em ordem de precedência:
 * 1. `REDIS_URL` (connection string TCP/TLS) → `RedisTokenStore` — é o que a
 *    integração de Redis da Vercel expõe neste projeto;
 * 2. par REST (`UPSTASH_REDIS_REST_*` ou `KV_REST_API_*`) → `KvTokenStore`;
 * 3. nada disso → `FileTokenStore` (dev local intocado). Sem env → zero regressão.
 */
export function defaultTokenStore(
  env: Record<string, string | undefined> = process.env,
): TokenStore {
  if (env.REDIS_URL?.trim()) return new RedisTokenStore({ url: env.REDIS_URL.trim() });
  const kv = resolveKvEnv(env);
  if (kv) return new KvTokenStore({ url: kv.url, token: kv.token });
  return new FileTokenStore();
}

/** Erro tipado de renovação — quem chama decide o fallback (ex.: mock). */
export class BlingAuthError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "BlingAuthError";
    this.status = status;
  }
}

interface BlingAuthDeps {
  fetchFn?: typeof fetch;
  store?: TokenStore;
  now?: () => number;
  env?: Record<string, string | undefined>;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
}

export class BlingAuth {
  private readonly fetchFn: typeof fetch;
  private readonly store: TokenStore;
  private readonly now: () => number;
  private readonly env: Record<string, string | undefined>;

  // Cache em memória do access token.
  private accessToken?: string;
  private expiresAt = 0;
  // Refresh token rotacionado (tem precedência sobre a semente do env).
  private refreshToken?: string;

  // Carga preguiçosa do store (single-flight).
  private loaded = false;
  private loadPromise?: Promise<void>;
  // Renovação em andamento (single-flight): duas chamadas concorrentes
  // compartilham o MESMO POST.
  private refreshing?: Promise<string>;

  constructor(deps: BlingAuthDeps = {}) {
    this.fetchFn = deps.fetchFn ?? fetch;
    this.store = deps.store ?? defaultTokenStore();
    this.now = deps.now ?? Date.now;
    this.env = deps.env ?? process.env;
  }

  private ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const stored = await this.store.load();
        if (stored) {
          this.refreshToken = stored.refreshToken;
          if (stored.accessToken && stored.expiresAt) {
            this.accessToken = stored.accessToken;
            this.expiresAt = stored.expiresAt;
          }
        }
        this.loaded = true;
      })();
    }
    return this.loadPromise;
  }

  /** CLIENT_ID + SECRET + alguma semente de refresh (store rotacionado OU env). */
  async hasCredentials(): Promise<boolean> {
    const id = this.env.BLING_CLIENT_ID?.trim();
    const secret = this.env.BLING_CLIENT_SECRET?.trim();
    if (!id || !secret) return false;
    await this.ensureLoaded();
    const seed =
      this.refreshToken?.trim() || this.env.BLING_REFRESH_TOKEN?.trim();
    return Boolean(seed);
  }

  /** Access token válido — usa cache, renova só quando necessário. */
  async getAccessToken(): Promise<string> {
    await this.ensureLoaded();

    if (this.accessToken && this.expiresAt - this.now() > REFRESH_SKEW_MS) {
      return this.accessToken;
    }

    // Single-flight: reaproveita um refresh já em voo.
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.refresh().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  /**
   * POST único de renovação. Credenciais vão no header Basic — NUNCA no body
   * (se enviadas no body, o Bling responde `invalid_client`). Falha de rede →
   * BlingAuthError; nunca logamos token/credencial.
   */
  private async postToken(
    id: string,
    secret: string,
    refreshToken: string,
  ): Promise<Response> {
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString();

    try {
      return await this.fetchFn(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      });
    } catch {
      throw new BlingAuthError("falha de rede ao renovar o token do Bling");
    }
  }

  private async refresh(): Promise<string> {
    const id = this.env.BLING_CLIENT_ID?.trim();
    const secret = this.env.BLING_CLIENT_SECRET?.trim();
    if (!id || !secret) {
      throw new BlingAuthError("credenciais do Bling ausentes (client id/secret)");
    }

    // Precedência: refresh token rotacionado no store > semente do env.
    let usedRefreshToken =
      this.refreshToken?.trim() || this.env.BLING_REFRESH_TOKEN?.trim();
    if (!usedRefreshToken) throw new BlingAuthError("refresh token ausente");

    let res = await this.postToken(id, secret, usedRefreshToken);

    // Retry único pós-`invalid_grant` (HTTP 400). Multi-instância: outra lambda
    // pode ter rotacionado o refresh token no store enquanto este processo
    // ainda usava um já defasado — o Bling então invalida o antigo. Relemos o
    // store FRESCO (ignorando o cache `loaded`) e, se houver um refresh
    // DIFERENTE do que falhou, tentamos UMA vez com ele.
    //
    // A janela de corrida residual (duas instâncias com o store igualmente
    // defasado) é aceita de propósito: o fallback é o mock e a próxima
    // renovação se recupera pelo store. O single-flight por processo segue
    // intocado — o retry acontece dentro do mesmo POST compartilhado.
    if (res.status === 400) {
      const fresh = await this.store.load();
      const freshToken = fresh?.refreshToken?.trim();
      if (freshToken && freshToken !== usedRefreshToken) {
        this.refreshToken = freshToken;
        usedRefreshToken = freshToken;
        res = await this.postToken(id, secret, freshToken);
      }
    }

    if (!res.ok) {
      throw new BlingAuthError(
        `renovação de token falhou (HTTP ${res.status})`,
        res.status,
      );
    }

    const json = (await res.json()) as TokenResponse;
    if (!json.access_token) {
      throw new BlingAuthError("resposta de token sem access_token");
    }

    this.accessToken = json.access_token;
    const expiresIn =
      typeof json.expires_in === "number" ? json.expires_in : DEFAULT_EXPIRES_IN_S;
    this.expiresAt = this.now() + expiresIn * 1000;

    // O refresh token ROTACIONA a cada uso: persistir o novo IMEDIATAMENTE.
    // Se não persistir, a semente antiga fica inválida e o fluxo só volta com
    // reautorização manual (authorization code). Se a resposta não trouxer um
    // novo refresh_token (provedor pode não rotacionar), persistimos o que
    // acabou de ser usado — ele continua válido.
    this.refreshToken = json.refresh_token ?? usedRefreshToken;

    await this.store.save({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    });

    return this.accessToken;
  }
}

/** Singleton usado pelas rotas. */
export const blingAuth = new BlingAuth();
