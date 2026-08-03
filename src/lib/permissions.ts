import { useEffect, useState, useCallback } from "react";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let mail: string | null = null;
      try {
        const { data: sess } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout-sessao")), 8000)),
        ]);
        mail = sess.session?.user.email?.toLowerCase() ?? null;
      } catch {
        // A trava de auth pode atrasar getSession; tenta pelo id em cache.
        const uid = getCachedUserId();
        if (uid) {
          const { data: byId } = await (supabase as any)
            .from("app_users").select("email").eq("user_id", uid).maybeSingle();
          mail = (byId?.email as string | undefined)?.toLowerCase() ?? null;
        }
        if (!mail) mail = readCache()?.email ?? null;
      }
      setEmail(mail);
      if (!mail) { setIsAdmin(false); setPerms([]); return; }

      const { data: userRow, error: userErr } = await (supabase as any)
        .from("app_users").select("is_admin").eq("email", mail).maybeSingle();
      if (userErr) throw userErr;

      const { data: p, error: permErr } = await (supabase as any)
        .from("app_user_permissions").select("email, module, can_view, can_edit").eq("email", mail);
      if (permErr) throw permErr;

      const nextAdmin = Boolean(userRow?.is_admin);
      const nextPerms = (p as PermissionRow[]) ?? [];
      setIsAdmin(nextAdmin);
      setPerms(nextPerms);
      writeCache({ email: mail, isAdmin: nextAdmin, perms: nextPerms });
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
      // Não esconde o menu silenciosamente: reaproveita o último acesso conhecido e avisa.
      const cached = readCache();
      if (cached) {
        setEmail((prev) => prev ?? cached.email);
        setIsAdmin(cached.isAdmin);
        setPerms(cached.perms);
      } else {
        setIsAdmin(false);
        setPerms([]);
      }
      setError(
        err instanceof Error && err.message
          ? `Não foi possível ler suas permissões (${err.message}).`
          : "Não foi possível ler suas permissões.",
      );
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const canView = (m: ModuleKey) => isAdmin || perms.some((p) => p.module === m && p.can_view);
  const canEdit = (m: ModuleKey) => isAdmin || perms.some((p) => p.module === m && p.can_edit);

  return { email, isAdmin, loading, error, canView, canEdit, refresh: load };
}