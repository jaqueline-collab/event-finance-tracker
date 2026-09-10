import { createMiddleware } from "@tanstack/react-start";
import { getCachedAccessToken, setCachedAccessToken } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client-configured";

/**
 * Único anexador de token do app. Usa o cache em memória alimentado pelo
 * __root; se ainda não houver token (primeira renderização, site público),
 * lê a sessão do MESMO cliente configurado — nunca de um segundo cliente,
 * porque clientes concorrentes disputam a trava de auth e travam as chamadas.
 */
export const attachConfiguredAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token = getCachedAccessToken();
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token ?? null;
        setCachedAccessToken(token);
      } catch {
        token = null;
      }
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
