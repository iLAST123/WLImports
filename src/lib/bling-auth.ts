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
    this.store = deps.store ?? new FileTokenStore();
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

  private async refresh(): Promise<string> {
    const id = this.env.BLING_CLIENT_ID?.trim();
    const secret = this.env.BLING_CLIENT_SECRET?.trim();
    if (!id || !secret) {
      throw new BlingAuthError("credenciais do Bling ausentes (client id/secret)");
    }

    // Precedência: refresh token rotacionado no store > semente do env.
    const refreshToken =
      this.refreshToken?.trim() || this.env.BLING_REFRESH_TOKEN?.trim();
    if (!refreshToken) throw new BlingAuthError("refresh token ausente");

    // Credenciais vão no header Basic — NUNCA no body. Se enviadas no body, o
    // Bling responde `invalid_client`.
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString();

    let res: Response;
    try {
      res = await this.fetchFn(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      });
    } catch {
      // Nunca logamos token/credencial.
      throw new BlingAuthError("falha de rede ao renovar o token do Bling");
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
    this.refreshToken = json.refresh_token ?? refreshToken;

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
