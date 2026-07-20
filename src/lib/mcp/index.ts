import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClientesTool from "./tools/list-clientes";
import listFechamentosTool from "./tools/list-fechamentos";
import listPlanosTool from "./tools/list-planos";
import getClienteDetalhadoTool from "./tools/get-cliente-detalhado";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL is
// rewritten to a proxy that mcp-js rejects (RFC 8414 issuer mismatch). Read the
// project ref via import.meta.env so Vite inlines it at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "elora-mcp",
  title: "Elora CRM",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar clientes, planos, movimentos e fechamentos mensais do Elora CRM do usuário autenticado. Todas as leituras respeitam as políticas de acesso do usuário no banco.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClientesTool, listPlanosTool, listFechamentosTool, getClienteDetalhadoTool],
});