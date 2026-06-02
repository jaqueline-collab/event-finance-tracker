import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MODULES = [
  { key: "dashboard", label: "Dashboard", url: "/" },
  { key: "clientes", label: "Clientes", url: "/clientes" },
  { key: "resumo", label: "Resumo Mensal", url: "/resumo" },
  { key: "financeiro", label: "Financeiro", url: "/financeiro" },
  { key: "orcamentos", label: "Funil", url: "/orcamentos" },
  { key: "planos", label: "Planos", url: "/planos" },
  { key: "parceiros", label: "Parceiros", url: "/parceiros" },
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
  canView: (m: ModuleKey) => boolean;
  canEdit: (m: ModuleKey) => boolean;
  refresh: () => Promise<void>;
}

export function useCurrentUserAccess(): CurrentUserAccess {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [perms, setPerms] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const mail = sess.session?.user.email?.toLowerCase() ?? null;
    setEmail(mail);
    if (!mail) {
      setIsAdmin(false);
      setPerms([]);
      setLoading(false);
      return;
    }
    // Bootstrap (no-op if já existe algum admin)
    await (supabase as any).rpc("bootstrap_admin_if_empty", { _email: mail });
    const { data: userRow } = await (supabase as any)
      .from("app_users")
      .select("is_admin")
      .eq("email", mail)
      .maybeSingle();
    setIsAdmin(Boolean(userRow?.is_admin));
    const { data: p } = await (supabase as any)
      .from("app_user_permissions")
      .select("email, module, can_view, can_edit")
      .eq("email", mail);
    setPerms((p as PermissionRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const canView = (m: ModuleKey) => isAdmin || perms.some((p) => p.module === m && p.can_view);
  const canEdit = (m: ModuleKey) => isAdmin || perms.some((p) => p.module === m && p.can_edit);

  return { email, isAdmin, loading, canView, canEdit, refresh: load };
}