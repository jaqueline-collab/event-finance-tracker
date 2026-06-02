import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, useCurrentUserAccess, type PermissionRow } from "@/lib/permissions";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · Elora" }] }),
  component: UsuariosPage,
});

interface AppUserRow {
  id: string;
  email: string;
  is_admin: boolean;
  display_name: string | null;
  created_at: string;
}

function UsuariosPage() {
  const access = useCurrentUserAccess();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [perms, setPerms] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoEmail, setNovoEmail] = useState("");
  const [novoNome, setNovoNome] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: u } = await (supabase as any).from("app_users").select("*").order("created_at");
    const { data: p } = await (supabase as any).from("app_user_permissions").select("*");
    setUsers((u as AppUserRow[]) ?? []);
    setPerms((p as PermissionRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!access.loading && !access.isAdmin) {
      navigate({ to: "/" });
    }
  }, [access.loading, access.isAdmin, navigate]);

  const adicionar = async () => {
    const email = novoEmail.trim().toLowerCase();
    if (!email.includes("@")) { toast.error("Email inválido."); return; }
    const { error } = await (supabase as any).from("app_users").insert({
      email, display_name: novoNome || email, is_admin: false, invited_by: access.email,
    });
    if (error) { toast.error(error.message); return; }
    // permissões padrão: leitura no dashboard
    await (supabase as any).from("app_user_permissions").insert({
      email, module: "dashboard", can_view: true, can_edit: false,
    });
    toast.success(`Usuário ${email} adicionado. Ele entra pelo link mágico em /auth.`);
    setNovoEmail(""); setNovoNome("");
    carregar();
  };

  const remover = async (u: AppUserRow) => {
    if (u.is_admin && users.filter((x) => x.is_admin).length <= 1) {
      toast.error("Não é possível remover o único administrador.");
      return;
    }
    if (!confirm(`Remover ${u.email}?`)) return;
    await (supabase as any).from("app_user_permissions").delete().eq("email", u.email);
    await (supabase as any).from("app_users").delete().eq("id", u.id);
    carregar();
  };

  const toggleAdmin = async (u: AppUserRow) => {
    await (supabase as any).from("app_users").update({ is_admin: !u.is_admin }).eq("id", u.id);
    carregar();
  };

  const togglePerm = async (
    email: string,
    moduleKey: string,
    field: "can_view" | "can_edit",
    value: boolean,
  ) => {
    const existing = perms.find((p) => p.email === email && p.module === moduleKey);
    if (existing) {
      const patch: any = { [field]: value };
      if (field === "can_edit" && value) patch.can_view = true;
      if (field === "can_view" && !value) patch.can_edit = false;
      await (supabase as any)
        .from("app_user_permissions")
        .update(patch)
        .eq("email", email)
        .eq("module", moduleKey);
    } else {
      await (supabase as any).from("app_user_permissions").insert({
        email, module: moduleKey,
        can_view: field === "can_view" ? value : false,
        can_edit: field === "can_edit" ? value : false,
      });
    }
    carregar();
  };

  if (access.loading || loading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!access.isAdmin) return null;

  const permFor = (email: string, m: string) => perms.find((p) => p.email === email && p.module === m);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Usuários & Permissões</h1>
        <p className="text-muted-foreground text-sm">Convide pessoas e defina o que cada uma pode ver ou editar.</p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Adicionar usuário</CardTitle>
          <CardDescription>Após adicionar, peça que a pessoa acesse <code>/auth</code> e entre com o e-mail informado para receber o link mágico.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="pessoa@empresa.com" />
          </div>
          <div>
            <Label className="text-xs">Nome (opcional)</Label>
            <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome de exibição" />
          </div>
          <div className="flex items-end"><Button onClick={adicionar}>Adicionar</Button></div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Árvore de permissões</CardTitle>
          <CardDescription>Marque <strong>Ver</strong> para liberar a leitura e <strong>Editar</strong> para liberar alterações. Admin ignora a árvore e tem acesso total.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Papel</TableHead>
                {MODULES.map((m) => (
                  <TableHead key={m.key} className="text-center text-xs">{m.label}</TableHead>
                ))}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.display_name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleAdmin(u)} className="inline-flex">
                      {u.is_admin ? (
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30"><ShieldCheck className="h-3 w-3 mr-1" /> Admin</Badge>
                      ) : (
                        <Badge variant="outline">Convidado</Badge>
                      )}
                    </button>
                  </TableCell>
                  {MODULES.map((m) => {
                    const p = permFor(u.email, m.key);
                    const disabled = u.is_admin;
                    return (
                      <TableCell key={m.key} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={disabled || !!p?.can_view}
                              disabled={disabled}
                              onCheckedChange={(v) => togglePerm(u.email, m.key, "can_view", v)}
                            />
                            <span className="text-[10px] text-muted-foreground">ver</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={disabled || !!p?.can_edit}
                              disabled={disabled}
                              onCheckedChange={(v) => togglePerm(u.email, m.key, "can_edit", v)}
                            />
                            <span className="text-[10px] text-muted-foreground">editar</span>
                          </div>
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => remover(u)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={MODULES.length + 3} className="text-center text-muted-foreground py-6">
                    Nenhum usuário cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}