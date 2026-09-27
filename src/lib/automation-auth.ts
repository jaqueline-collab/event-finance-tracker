import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifica o segredo compartilhado das rotas de automação externa (n8n).
 * Comparação em tempo constante; o segredo é lido dentro da chamada.
 * Retorna true apenas com o header X-Automation-Secret correto.
 */
export function segredoAutomacaoValido(request: Request): boolean {
  const esperado = process.env["AUTOMATION_SECRET"];
  const recebido = request.headers.get("x-automation-secret");
  if (!esperado || !recebido) return false;
  // HMAC iguala o comprimento dos dois lados antes da comparação.
  const a = createHmac("sha256", "elora-automation").update(recebido).digest();
  const b = createHmac("sha256", "elora-automation").update(esperado).digest();
  return timingSafeEqual(a, b);
}

export const respostaNaoAutorizada = () => new Response("Não autorizado", { status: 401 });
