import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachConfiguredAuth } from "@/integrations/supabase/auth-attacher-configured";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  // Apenas UM cliente de auth. O attacher gerado (`attachSupabaseAuth`) chama
  // supabase.auth.getSession() em um segundo cliente sobre a mesma chave de
  // sessão; os dois disputavam a renovação do token e travavam as gravações.
  // NÃO reintroduza `attachSupabaseAuth` aqui, mesmo que o arquivo gerado
  // `auth-attacher.ts` reapareça após reconectar a integração do backend.
  functionMiddleware: [attachConfiguredAuth],
  requestMiddleware: [errorMiddleware],
}));
