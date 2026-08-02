import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const lockQueues = new Map<string, Promise<unknown>>();

const AUTH_DEBUG = typeof window !== "undefined";
function authLog(...args: unknown[]) {
  if (AUTH_DEBUG) console.log(`[auth-debug ${new Date().toISOString()}]`, ...args);
}

/** Limite para a operação executada DENTRO da trava. */
const OPERATION_TIMEOUT_MS = 5000;
/** Limite para qualquer requisição HTTP do cliente (inclui refresh de token). */
const FETCH_TIMEOUT_MS = 10000;

class AuthLockTimeoutError extends Error {
  readonly isAcquireTimeout = true;

  constructor(name: string, timeout: number) {
    super(`Auth lock "${name}" timed out after ${timeout}ms`);
    this.name = "AuthLockTimeoutError";
  }
}

/**
 * Serializa operações de autenticação apenas nesta aba. Assim, uma Web Lock
 * órfã em outra aba não bloqueia permanentemente a sessão desta aba.
 */
async function boundedTabLock<Result>(
  name: string,
  acquireTimeout: number,
  operation: () => Promise<Result>,
): Promise<Result> {
  const previous = lockQueues.get(name) ?? Promise.resolve();
  const previousSettled = previous.then(
    () => undefined,
    () => undefined,
  );

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const waitForTurn =
    acquireTimeout < 0
      ? previousSettled
      : Promise.race([
          previousSettled,
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new AuthLockTimeoutError(name, acquireTimeout)),
              acquireTimeout,
            );
          }),
        ]);

  const current = (async () => {
    const started = Date.now();
    try {
      await waitForTurn;
      authLog(`lock "${name}": obtida após ${Date.now() - started}ms`);
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new AuthLockTimeoutError(`${name}:operation`, OPERATION_TIMEOUT_MS)),
            OPERATION_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (err) {
      authLog(`lock "${name}": falhou após ${Date.now() - started}ms`, err);
      throw err;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      authLog(`lock "${name}": liberada após ${Date.now() - started}ms`);
    }
  })();

  const queued = current.then(
    () => undefined,
    () => undefined,
  );
  lockQueues.set(name, queued);
  void queued.finally(() => {
    if (lockQueues.get(name) === queued) lockQueues.delete(name);
  });

  return current;
}

/** fetch com AbortController para nenhuma chamada ficar pendurada sem prazo. */
async function fetchComPrazo(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: init?.signal ?? controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function createConfiguredClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Configuração do backend indisponível.");
  }

  authLog("criando cliente Supabase (deve aparecer só uma vez por página)");

  return createClient<Database>(url, publishableKey, {
    global: { fetch: fetchComPrazo },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      lock: typeof window !== "undefined" ? boundedTabLock : undefined,
      lockAcquireTimeout: 4000,
    },
  });
}

let configuredClient: ReturnType<typeof createConfiguredClient> | undefined;

export const supabase = new Proxy(
  {} as ReturnType<typeof createConfiguredClient>,
  {
    get(_, property, receiver) {
      configuredClient ??= createConfiguredClient();
      return Reflect.get(configuredClient, property, receiver);
    },
  },
);