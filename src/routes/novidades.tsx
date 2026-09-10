import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { listarReleases, removerRelease, salvarRelease } from "@/lib/cliente.functions";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/novidades")({
  head: () => ({
    meta: [
      { title: "Novidades · Elora" },
      { name: "description", content: "Publique novidades e escolha quais clientes veem cada release." },
      { property: "og:title", content: "Novidades · Elora" },
      { property: "og:description", content: "Publicação de releases para a área do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaNovidades,
});

type Release = Awaited<ReturnType<typeof listarReleases>>[number];

const vazio = {
  titulo: "",
  resumo: "",
  conteudo: "",
  tag: "novidade",
  publicado: true,
  paraTodos: true,
  clientesIds: [] as string[],
};

function PaginaNovidades() {
  const clientes = useStore((s) => s.clientes);
  const [lista, setLista] = useState<Release[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({ ...vazio });
  const [editando, setEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    listarReleases()
      .then(setLista)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar novidades."))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const clientesOrdenados = useMemo(
    () => [...clientes].sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientes],
  );

  const salvar = async () => {
    if (form.titulo.trim().length < 2) {
      toast.error("Dê um título para a novidade.");
      return;
    }
    if (!form.paraTodos && form.clientesIds.length === 0) {
      toast.error("Escolha ao menos um cliente ou marque 'Para todos'.");
      return;
    }
    setSalvando(true);
    try {
      await salvarRelease({
        data: {
          ...(editando ? { id: editando } : {}),
          titulo: form.titulo.trim(),
          resumo: form.resumo.trim() || null,
          conteudo: form.conteudo,
          tag: form.tag.trim() || "novidade",
          publicado: form.publicado,
          paraTodos: form.paraTodos,
          clientesIds: form.clientesIds,
        },
      });
      toast.success(editando ? "Novidade atualizada." : "Novidade publicada.");
      setForm({ ...vazio });
      setEditando(null);
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    try {
      await removerRelease({ data: { id } });
      toast.success("Novidade removida.");
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover.");
    }
  };

  const editar = (r: Release) => {
    setEditando(r.id);
    setForm({
      titulo: r.titulo,
      resumo: r.resumo,
      conteudo: r.conteudo,
      tag: r.tag,
      publicado: r.publicado,
      paraTodos: r.paraTodos,
      clientesIds: r.clientesIds,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novidades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publique releases e escolha quais clientes veem cada uma na área deles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editando ? "Editar novidade" : "Nova novidade"}</CardTitle>
          <CardDescription>Título, resumo e conteúdo aparecem na área do cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tag">Etiqueta</Label>
              <Input id="tag" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="novidade, correção, melhoria" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resumo">Resumo</Label>
            <Input id="resumo" value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conteudo">Conteúdo</Label>
            <Textarea id="conteudo" rows={5} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.publicado} onCheckedChange={(v) => setForm({ ...form, publicado: v })} />
              Publicada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.paraTodos} onCheckedChange={(v) => setForm({ ...form, paraTodos: v })} />
              Para todos os clientes
            </label>
          </div>

          {!form.paraTodos && (
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-2 text-sm font-medium">Quem vê esta novidade</p>
              <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                {clientesOrdenados.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.clientesIds.includes(c.id)}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          clientesIds: v
                            ? [...form.clientesIds, c.id]
                            : form.clientesIds.filter((x) => x !== c.id),
                        })
                      }
                    />
                    {c.nome}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">{editando ? "Salvar alterações" : "Publicar novidade"}</span>
            </Button>
            {editando && (
              <Button variant="ghost" onClick={() => { setEditando(null); setForm({ ...vazio }); }}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {carregando && <Skeleton className="h-24 w-full" />}
        {!carregando && lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma novidade cadastrada.</p>
        )}
        {lista.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{r.titulo}</CardTitle>
                  <Badge variant="secondary" className="capitalize">{r.tag}</Badge>
                  <Badge variant={r.publicado ? "default" : "outline"}>
                    {r.publicado ? "Publicada" : "Rascunho"}
                  </Badge>
                  <Badge variant="outline">
                    {r.paraTodos ? "Todos os clientes" : `${r.clientesIds.length} cliente(s)`}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => editar(r)}>Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => void excluir(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {r.resumo && <CardDescription>{r.resumo}</CardDescription>}
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
