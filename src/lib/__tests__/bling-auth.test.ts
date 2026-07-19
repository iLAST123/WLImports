import { describe, it, expect, vi } from "vitest";
import {
  BlingAuth,
  BlingAuthError,
  FileTokenStore,
  KvTokenStore,
  RedisTokenStore,
  KV_TOKEN_KEY,
  defaultTokenStore,
  type RedisLike,
  type StoredTokens,
  type TokenStore,
} from "../bling-auth";

const ENV = {
  BLING_CLIENT_ID: "client-id-teste",
  BLING_CLIENT_SECRET: "client-secret-teste",
  BLING_REFRESH_TOKEN: "R1",
};

function makeStore(initial: StoredTokens | null = null) {
  const state: { saved: StoredTokens | null } = { saved: initial };
  const store: TokenStore = {
    load: vi.fn(async () => state.saved),
    save: vi.fn(async (t: StoredTokens) => {
      state.saved = t;
    }),
  };
  return { store, state };
}

function tokenRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("BlingAuth", () => {
  it("hasCredentials: false sem client id/secret", async () => {
    const auth = new BlingAuth({
      env: {},
      store: makeStore().store,
    });
    expect(await auth.hasCredentials()).toBe(false);
  });

  it("hasCredentials: true com env completo", async () => {
    const auth = new BlingAuth({ env: ENV, store: makeStore().store });
    expect(await auth.hasCredentials()).toBe(true);
  });

  it("hasCredentials: true se a semente vem do store (sem env refresh)", async () => {
    const { store } = makeStore({ refreshToken: "RS" });
    const auth = new BlingAuth({
      env: {
        BLING_CLIENT_ID: "id",
        BLING_CLIENT_SECRET: "secret",
      },
      store,
    });
    expect(await auth.hasCredentials()).toBe(true);
  });

  it("renova com URL (www), header Basic e body urlencoded corretos; credencial não vaza no body", async () => {
    const fetchFn = vi.fn(async () =>
      tokenRes({ access_token: "AT", expires_in: 21600, refresh_token: "R2" }),
    );
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: {
        BLING_CLIENT_ID: "id",
        BLING_CLIENT_SECRET: "secret",
        BLING_REFRESH_TOKEN: "R1",
      },
      now: () => 0,
    });

    const token = await auth.getAccessToken();
    expect(token).toBe("AT");

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://www.bling.com.br/Api/v3/oauth/token");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      "Basic " + Buffer.from("id:secret").toString("base64"),
    );
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

    const body = init.body as string;
    const params = new URLSearchParams(body);
    expect(params.get("grant_type")).toBe("refresh_token");
    expect(params.get("refresh_token")).toBe("R1");
    // credenciais NUNCA no body
    expect(body).not.toContain("secret");
    expect(body).not.toContain("client_id");
  });

  it("rotaciona o refresh token: salva o novo e usa o rotacionado na próxima renovação", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        tokenRes({ access_token: "AT1", expires_in: 1, refresh_token: "R2" }),
      )
      .mockResolvedValueOnce(
        tokenRes({ access_token: "AT2", expires_in: 1, refresh_token: "R3" }),
      );
    const { store, state } = makeStore();
    let now = 0;
    const auth = new BlingAuth({ fetchFn, store, env: ENV, now: () => now });

    await auth.getAccessToken(); // usa a semente R1
    expect(state.saved?.refreshToken).toBe("R2");
    expect(store.save).toHaveBeenCalledTimes(1);

    now += 10_000; // access token (expires_in 1s) já expirou
    await auth.getAccessToken(); // deve usar o rotacionado R2

    const body2 = new URLSearchParams(
      (fetchFn.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(body2.get("refresh_token")).toBe("R2");
    expect(state.saved?.refreshToken).toBe("R3");
  });

  it("cache: duas chamadas com token válido → 1 POST; após expirar → novo POST", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        tokenRes({ access_token: "AT", expires_in: 21600, refresh_token: "R2" }),
      );
    let now = 0;
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: ENV,
      now: () => now,
    });

    await auth.getAccessToken();
    await auth.getAccessToken();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    now += 21600 * 1000 + 1; // além do expires_in
    await auth.getAccessToken();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("single-flight: chamadas concorrentes disparam um único POST", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const fetchFn = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: ENV,
      now: () => 0,
    });

    const both = Promise.all([auth.getAccessToken(), auth.getAccessToken()]);
    // deixa os microtasks (ensureLoaded) drenarem antes de resolver o fetch
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    resolveFetch(
      tokenRes({ access_token: "AT", expires_in: 21600, refresh_token: "R2" }),
    );
    const [a, b] = await both;
    expect(a).toBe("AT");
    expect(b).toBe("AT");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("erro 4xx no refresh → lança BlingAuthError com status", async () => {
    const fetchFn = vi.fn(async () => tokenRes({ error: "invalid_grant" }, 400));
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: ENV,
      now: () => 0,
    });
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(BlingAuthError);
  });

  it("falha de rede no refresh → lança BlingAuthError", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const auth = new BlingAuth({
      fetchFn: fetchFn as unknown as typeof fetch,
      store: makeStore().store,
      env: ENV,
      now: () => 0,
    });
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(BlingAuthError);
  });

  it("hasCredentials: false com id/secret mas SEM semente de refresh (nem env, nem store)", async () => {
    const auth = new BlingAuth({
      env: {
        BLING_CLIENT_ID: "id",
        BLING_CLIENT_SECRET: "secret",
      },
      store: makeStore().store,
    });
    expect(await auth.hasCredentials()).toBe(false);
  });

  it("single-flight se recupera após falha: a chamada seguinte re-tenta (promise rejeitada não fica grudada)", async () => {
    const fetchFn = vi
      .fn()
      // 1ª tentativa: 500
      .mockResolvedValueOnce(tokenRes({ error: "server" }, 500))
      // 2ª tentativa: sucesso
      .mockResolvedValueOnce(
        tokenRes({ access_token: "AT2", expires_in: 21600, refresh_token: "R2" }),
      );
    const auth = new BlingAuth({
      fetchFn: fetchFn as unknown as typeof fetch,
      store: makeStore().store,
      env: ENV,
      now: () => 0,
    });

    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(BlingAuthError);
    await expect(auth.getAccessToken()).resolves.toBe("AT2");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retry pós-invalid_grant: relê store, usa refresh fresco (≠) e persiste rotação", async () => {
    const fetchFn = vi
      .fn()
      // 1º POST com o refresh defasado → 400 invalid_grant
      .mockResolvedValueOnce(tokenRes({ error: "invalid_grant" }, 400))
      // 2º POST com o refresh fresco relido do store → sucesso
      .mockResolvedValueOnce(
        tokenRes({ access_token: "AT2", expires_in: 21600, refresh_token: "R4" }),
      );

    // Store que "muda por baixo": carrega R1 no ensureLoaded e, depois que
    // outra instância rotaciona, passa a devolver R2 na releitura fresca.
    let loadValue: StoredTokens | null = { refreshToken: "R1" };
    const saved: { t: StoredTokens | null } = { t: null };
    const store: TokenStore = {
      load: vi.fn(async () => loadValue),
      save: vi.fn(async (t: StoredTokens) => {
        saved.t = t;
      }),
    };
    const auth = new BlingAuth({ fetchFn, store, env: ENV, now: () => 0 });

    await auth.hasCredentials(); // força ensureLoaded → refreshToken = "R1"
    loadValue = { refreshToken: "R2" }; // outra lambda rotacionou o store

    const token = await auth.getAccessToken();
    expect(token).toBe("AT2");

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const body1 = new URLSearchParams(
      (fetchFn.mock.calls[0][1] as RequestInit).body as string,
    );
    const body2 = new URLSearchParams(
      (fetchFn.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(body1.get("refresh_token")).toBe("R1");
    expect(body2.get("refresh_token")).toBe("R2");
    // rotação da resposta (R4) persistida
    expect(saved.t?.refreshToken).toBe("R4");
  });

  it("retry pós-invalid_grant: store devolve o MESMO refresh → sem retry, lança", async () => {
    const fetchFn = vi.fn(async () =>
      tokenRes({ error: "invalid_grant" }, 400),
    );
    const { store } = makeStore({ refreshToken: "R1" }); // releitura = mesmo R1
    const auth = new BlingAuth({ fetchFn, store, env: ENV, now: () => 0 });

    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(BlingAuthError);
    expect(fetchFn).toHaveBeenCalledTimes(1); // nenhum retry
  });
});

function kvRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("KvTokenStore", () => {
  it("load: GET na URL/header/cache exatos e parseia result", async () => {
    const stored: StoredTokens = {
      accessToken: "AT",
      refreshToken: "R2",
      expiresAt: 123,
    };
    const fetchFn = vi.fn(async () =>
      kvRes({ result: JSON.stringify(stored) }),
    );
    const store = new KvTokenStore({
      url: "https://kv.example",
      token: "kv-token",
      fetchFn,
    });

    const out = await store.load();
    expect(out).toEqual(stored);

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://kv.example/get/${KV_TOKEN_KEY}`);
    expect(url).toBe("https://kv.example/get/wlimports:bling:tokens");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer kv-token",
    );
    expect(init.cache).toBe("no-store");
  });

  it("load: result null → null (chave ausente, sem lançar)", async () => {
    const fetchFn = vi.fn(async () => kvRes({ result: null }));
    const store = new KvTokenStore({
      url: "https://kv.example",
      token: "t",
      fetchFn,
    });
    expect(await store.load()).toBeNull();
  });

  it("load: erro de rede → null sem lançar", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const store = new KvTokenStore({
      url: "https://kv.example",
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(await store.load()).toBeNull();
  });

  it("save: POST na URL/body/header corretos", async () => {
    const fetchFn = vi.fn(async () => kvRes({ result: "OK" }));
    const store = new KvTokenStore({
      url: "https://kv.example",
      token: "kv-token",
      fetchFn,
    });
    const t: StoredTokens = { accessToken: "AT", refreshToken: "R2", expiresAt: 999 };
    await store.save(t);

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://kv.example/set/${KV_TOKEN_KEY}`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(t));
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer kv-token",
    );
    expect(init.cache).toBe("no-store");
  });

  it("save: erro HTTP → não lança", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchFn = vi.fn(async () => kvRes({}, 500));
    const store = new KvTokenStore({
      url: "https://kv.example",
      token: "t",
      fetchFn,
    });
    await expect(store.save({ refreshToken: "R" })).resolves.toBeUndefined();
  });
});

/** Cliente Redis fake com estado em memória. */
function makeFakeRedis(initial: string | null = null) {
  const state: { value: string | null; quits: number } = {
    value: initial,
    quits: 0,
  };
  const client: RedisLike = {
    get: vi.fn(async (key: string) => {
      void key;
      return state.value;
    }),
    set: vi.fn(async (key: string, v: string) => {
      void key;
      state.value = v;
      return "OK";
    }),
    quit: vi.fn(async () => {
      state.quits += 1;
      return "OK";
    }),
  };
  return { client, state };
}

describe("RedisTokenStore", () => {
  it("load: lê e desserializa o JSON da chave certa; fecha a conexão", async () => {
    const t: StoredTokens = { accessToken: "AT", refreshToken: "R9", expiresAt: 5 };
    const { client, state } = makeFakeRedis(JSON.stringify(t));
    const store = new RedisTokenStore({
      url: "rediss://x",
      makeClient: async () => client,
    });
    expect(await store.load()).toEqual(t);
    expect(client.get).toHaveBeenCalledWith(KV_TOKEN_KEY);
    expect(state.quits).toBe(1);
  });

  it("load: chave ausente → null", async () => {
    const { client } = makeFakeRedis(null);
    const store = new RedisTokenStore({
      url: "rediss://x",
      makeClient: async () => client,
    });
    expect(await store.load()).toBeNull();
  });

  it("load: falha de conexão → null sem lançar, e fecha se possível", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = new RedisTokenStore({
      url: "rediss://x",
      makeClient: async () => {
        throw new Error("connect ECONNREFUSED");
      },
    });
    await expect(store.load()).resolves.toBeNull();
  });

  it("save: grava o JSON na chave certa e fecha a conexão", async () => {
    const { client, state } = makeFakeRedis(null);
    const store = new RedisTokenStore({
      url: "rediss://x",
      makeClient: async () => client,
    });
    const t: StoredTokens = { accessToken: "AT", refreshToken: "R2", expiresAt: 9 };
    await store.save(t);
    expect(client.set).toHaveBeenCalledWith(KV_TOKEN_KEY, JSON.stringify(t));
    expect(state.value).toBe(JSON.stringify(t));
    expect(state.quits).toBe(1);
  });

  it("save: erro → não lança", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = new RedisTokenStore({
      url: "rediss://x",
      makeClient: async () => {
        throw new Error("down");
      },
    });
    await expect(store.save({ refreshToken: "R" })).resolves.toBeUndefined();
  });
});

describe("defaultTokenStore", () => {
  it("REDIS_URL presente → RedisTokenStore (precedência)", () => {
    const store = defaultTokenStore({ REDIS_URL: "rediss://x" });
    expect(store).toBeInstanceOf(RedisTokenStore);
  });

  it("REDIS_URL tem precedência sobre o par REST", () => {
    const store = defaultTokenStore({
      REDIS_URL: "rediss://x",
      KV_REST_API_URL: "https://kv.example",
      KV_REST_API_TOKEN: "t",
    });
    expect(store).toBeInstanceOf(RedisTokenStore);
  });

  it("UPSTASH_* completo (sem REDIS_URL) → KvTokenStore", () => {
    const store = defaultTokenStore({
      UPSTASH_REDIS_REST_URL: "https://kv.example",
      UPSTASH_REDIS_REST_TOKEN: "t",
    });
    expect(store).toBeInstanceOf(KvTokenStore);
  });

  it("apenas KV_REST_API_* → KvTokenStore", () => {
    const store = defaultTokenStore({
      KV_REST_API_URL: "https://kv.example",
      KV_REST_API_TOKEN: "t",
    });
    expect(store).toBeInstanceOf(KvTokenStore);
  });

  it("sem envs de store → FileTokenStore", () => {
    const store = defaultTokenStore({});
    expect(store).toBeInstanceOf(FileTokenStore);
  });
});
