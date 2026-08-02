import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const lockQueues = new Map<string, Promise<unknown>>();

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
    try {
      await waitForTurn;
      return await operation();
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
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

function createConfiguredClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Configuração do backend indisponível.");
  }

  return createClient<Database>(url, publishableKey, {
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