import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  alterarAcessoParceiro,
  concederAcessoParceiro,
  listarAcessosParceiro,
} from "@/lib/parceiro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/gestao-parceiros")({
  head: () => ({
    meta: [
      { title: "Parceiros · Elora" },
      { name: "description", content: "Cadastro de parceiros, visibilidade de valores e gestão de acessos da área do parceiro." },
      { property: "og:title", content: "Parceiros · Elora" },
      { property: "og:description", content: "Cadastro de parceiros e gestão de acessos da área do parceiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GestaoParceiros,
});

interface Acesso {
  id: string;
  parceiroId: string;
  nome: string;
  email: string;
  ativo: boolean;
  vinculado: boolean;
  criadoEm: string;
}

function GestaoParceiros() {
  const { parceiros, addParceiro, updateParceiro, removeParceiro } = useStore();
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [carregandoAcessos, setCarregandoAcessos] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState({ nome: "", email: "", celular: "", observacao: "" });
  const [novoAcesso, setNovoAcesso] = useState<Record<string, { nome: string; email: string }>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  const recarregarAcessos = async () => {
    setCarregandoAcessos(true);
    try {
      setAcessos(await listarAcessosParceiro());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar acessos.");
    } finally {
      setCarregandoAcessos(false);
    }
  };

  useEffect(() => {
    recarregarAcessos();
  }, []);

  const salvarParceiro = async () => {
    if (!novo.nome.trim()) {
      toast.error("Informe o nome do parceiro.");
      return;
    }
    setSalvando(true);
    try {
      await addParceiro({
        nome: novo.nome.trim(),
        email: novo.email.trim(),
        celular: novo.celular.trim(),
        planosVinculados: [],
        observacao: novo.observacao.trim(),
        mostrarValoresCliente: false,
      });
      toast.success("Parceiro cadastrado.");
      setNovo({ nome: "", email: "", celular: "", observacao: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao cadastrar parceiro.");
    } finally {
      setSalvando(false);
    }
  };

  const alternarValores = async (id: string, valor: boolean) => {
    setOcupado(id);
    try {
      await updateParceiro(id, { mostrarValoresCliente: valor });
      toast.success(valor ? "Parceiro passa a ver os valores dos clientes." : "Valores ocultos para este parceiro.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao alterar a visibilidade.");
    } finally {
      setOcupado(null);
    }
  };

  const conceder = async (parceiroId: string) => {
    const form = novoAcesso[parceiroId] ?? { nome: "", email: "" };
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Informe nome e e-mail da pessoa.");
      return;
    }
    setOcupado(parceiroId);
    try {
      await concederAcessoParceiro({ data: { parceiroId, nome: form.nome, email: form.email } });
      toast.success("Acesso concedido. A pessoa entra pelo login normal com esse e-mail.");
      setNovoAcesso((s) => ({ ...s, [parceiroId]: { nome: "", email: "" } }));
      await recarregarAcessos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao conceder acesso.");
    } finally {
      setOcupado(null);
    }
  };

  const alterarAcesso = async (id: string, ativo: boolean, remover = false) => {
    setOcupado(id);
    try {
      await alterarAcessoParceiro({ data: { id, ativo, remover } });
      toast.success(remover ? "Acesso removido." : ativo ? "Acesso reativado." : "Acesso revogado.");
      await recarregarAcessos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao alterar o acesso.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parceiros</h1>
        <p className="text-sm text-muted-foreground">
          Cadastro, visibilidade de valores e acessos da área do parceiro.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo parceiro</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Celular</Label>
            <Input value={novo.celular} onChange={(e) => setNovo({ ...novo, celular: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Observação</Label>
            <Textarea
              value={novo.observacao}
              onChange={(e) => setNovo({ ...novo, observacao: e.target.value })}
              rows={2}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={salvarParceiro} disabled={salvando}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {salvando ? "Salvando..." : "Salvar parceiro"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {parceiros.map((p) => {
        const pessoas = acessos.filter((a) => a.parceiroId === p.id);
        const form = novoAcesso[p.id] ?? { nome: "", email: "" };
        return (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{p.nome}</CardTitle>
                <p className="text-xs text-muted-foreground">{p.email || "sem e-mail"} · {p.celular || "sem celular"}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeParceiro(p.id)}
                aria-label={`Excluir ${p.nome}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3 rounded-md border border-border/60 p-3">
                <Switch
                  checked={Boolean(p.mostrarValoresCliente)}
                  disabled={ocupado === p.id}
                  onCheckedChange={(v) => alternarValores(p.id, v)}
                  aria-label="Mostrar valores cobrados dos clientes"
                />
                <div className="text-sm">
                  <p className="font-medium">Mostrar valores cobrados dos clientes</p>
                  <p className="text-muted-foreground text-xs">
                    Permite que este parceiro veja mensalidade e excedentes cobrados dos clientes dele.
                    O custo WTS e a margem nunca são exibidos.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Pessoas com acesso</p>
                {carregandoAcessos && <p className="text-xs text-muted-foreground">Carregando acessos...</p>}
                {!carregandoAcessos && pessoas.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma pessoa com acesso.</p>
                )}
                <ul className="space-y-2">
                  {pessoas.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{a.nome}</span>{" "}
                        <span className="text-muted-foreground">{a.email}</span>
                        <span className="ml-2 text-xs text-muted-foreground">desde {a.criadoEm}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={a.ativo ? "secondary" : "outline"}>
                          {a.ativo ? "Ativo" : "Revogado"}
                        </Badge>
                        {!a.vinculado && <Badge variant="outline">aguardando 1º login</Badge>}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ocupado === a.id}
                          onClick={() => alterarAcesso(a.id, !a.ativo)}
                        >
                          {a.ativo ? "Revogar" : "Reativar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={ocupado === a.id}
                          onClick={() => alterarAcesso(a.id, false, true)}
                          aria-label={`Remover acesso de ${a.nome}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome da pessoa</Label>
                    <Input
                      value={form.nome}
                      onChange={(e) => setNovoAcesso((s) => ({ ...s, [p.id]: { ...form, nome: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E-mail de login</Label>
                    <Input
                      value={form.email}
                      onChange={(e) => setNovoAcesso((s) => ({ ...s, [p.id]: { ...form, email: e.target.value } }))}
                    />
                  </div>
                  <Button onClick={() => conceder(p.id)} disabled={ocupado === p.id}>
                    {ocupado === p.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Conceder acesso
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
