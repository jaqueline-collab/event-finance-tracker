import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client-configured";
import { getCachedUserId } from "@/lib/auth-session";

export const MODULES = [
  { key: "dashboard", label: "Dashboard", url: "/" },
  { key: "clientes", label: "Clientes", url: "/clientes" },
  { key: "resumo", label: "Fechamento Mensal", url: "/resumo" },
  { key: "financeiro", label: "Financeiro", url: "/financeiro" },
  { key: "orcamentos", label: "Funil", url: "/orcamentos" },
  { key: "planos", label: "Planos", url: "/planos" },
  { key: "parceiros", label: "Parceiros", url: "/gestao-parceiros" },
  { key: "usuarios", label: "Usuários", url: "/usuarios" },
  { key: "novidades", label: "Novidades", url: "/novidades" },
  { key: "treinamento", label: "Treinamento", url: "/treinamento" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export interface PermissionRow {
  email: string;
  module: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface CurrentUserAccess {
  email: string | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  canView: (m: ModuleKey) => boolean;
  canEdit: (m: ModuleKey) => boolean;
  refresh: () => Promise<void>;
}

const CACHE_KEY = "elora.access.cache.v1";

type AccessCache = { email: string | null; isAdmin: boolean; perms: PermissionRow[] };

function readCache(): AccessCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AccessCache) : null;
  } catch {
    return null;
  }
}

export function clearAccessCache() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/** E-mail da sessão salva pelo cliente de auth, lido direto do localStorage (sem a trava de auth). */
function storedSessionEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      const v = JSON.parse(window.localStorage.getItem(k) || "null");
      const mail = v?.user?.email ?? v?.currentSession?.user?.email;
      if (mail) return String(mail).toLowerCase();
    }
  } catch { /* ignore */ }
  return null;
}

// ---------- Regras puras (testadas) ----------

/** Cache só vale para o mesmo e-mail da sessão. */
export function cacheValidoPara(cache: AccessCache | null, sessionEmail: string | null): AccessCache | null {
  if (!cache || !cache.email || !sessionEmail) return null;
  return cache.email.toLowerCase() === sessionEmail.toLowerCase() ? cache : null;
}

/** loading só é true antes da primeira leitura concluída (ou de um cache válido). */
export function deveMostrarLoading(jaConcluiu: boolean): boolean {
  return !jaConcluiu;
}

export type AcaoAuth = "ignorar" | "recarregar" | "sair";

/** Decide o que fazer com um evento de auth. */
export function acaoParaEventoAuth(event: string, novoEmail: string | null, emailAtual: string | null): AcaoAuth {
  if (event === "SIGNED_OUT") return "sair";
  if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
    return (novoEmail ?? null) === (emailAtual ?? null) ? "ignorar" : "recarregar";
  }
  if (event === "USER_UPDATED") return "recarregar";
  return (novoEmail ?? null) === (emailAtual ?? null) ? "ignorar" : "recarregar";
}

function writeCache(value: AccessCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function useCurrentUserAccess(): CurrentUserAccess {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [perms, setPerms] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const concluiu = useRef(false);
  const emailRef = useRef<string | null>(null);
  const emAndamento = useRef<Promise<void> | null>(null);

  const marcarConcluido = () => {
    concluiu.current = true;
    setLoading(deveMostrarLoading(true));
  };

  const aplicar = (v: AccessCache) => {
    emailRef.current = v.email;
    setEmail(v.email);
    setIsAdmin(v.isAdmin);
    setPerms(v.perms);
  };

  const executar = useCallback(async () => {
    setError(null);
    let mail: string | null = null;
    try {
      try {
        const { data: sess } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout-sessao")), 8000)),
        ]);
        mail = sess.session?.user.email?.toLowerCase() ?? null;
      } catch {
        const uid = getCachedUserId();
        if (uid) {
          const { data: byId } = await (supabase as any)
            .from("app_users").select("email").eq("user_id", uid).maybeSingle();
          mail = (byId?.email as string | undefined)?.toLowerCase() ?? null;
        }
        if (!mail) mail = storedSessionEmail();
      }
      if (!mail) { aplicar({ email: null, isAdmin: false, perms: [] }); return; }

      const { data: userRow, error: userErr } = await (supabase as any)
        .from("app_users").select("is_admin").eq("email", mail).maybeSingle();
      if (userErr) throw userErr;
      const { data: p, error: permErr } = await (supabase as any)
        .from("app_user_permissions").select("email, module, can_view, can_edit").eq("email", mail);
      if (permErr) throw permErr;

      const next: AccessCache = { email: mail, isAdmin: Boolean(userRow?.is_admin), perms: (p as PermissionRow[]) ?? [] };
      aplicar(next);
      writeCache(next);
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
      const cached = cacheValidoPara(readCache(), mail ?? storedSessionEmail());
      if (cached) aplicar(cached);
      else if (!concluiu.current) aplicar({ email: mail, isAdmin: false, perms: [] });
      setError(
        err instanceof Error && err.message
          ? `Não foi possível ler suas permissões (${err.message}).`
          : "Não foi possível ler suas permissões.",
      );
    } finally {
      marcarConcluido();
    }
  }, []);

  const load = useCallback(async () => {
    if (emAndamento.current) return emAndamento.current;
    const p = executar().finally(() => { emAndamento.current = null; });
    emAndamento.current = p;
    return p;
  }, [executar]);

  useEffect(() => {
    // Cache válido (mesmo e-mail da sessão) libera a tela de imediato; a rede atualiza em segundo plano.
    const cached = cacheValidoPara(readCache(), storedSessionEmail());
    if (cached) { aplicar(cached); marcarConcluido(); }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const novo = session?.user?.email?.toLowerCase() ?? null;
      const acao = acaoParaEventoAuth(event, novo, emailRef.current);
      if (acao === "ignorar") return;
      if (acao === "sair") {
        clearAccessCache();
        aplicar({ email: null, isAdmin: false, perms: [] });
        return;
      }
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const canView = (m: ModuleKey) => isAdmin || perms.some((p) => p.module === m && p.can_view);
  const canEdit = (m: ModuleKey) => isAdmin || perms.some((p) => p.module === m && p.can_edit);

  return { email, isAdmin, loading, error, canView, canEdit, refresh: load };
}
