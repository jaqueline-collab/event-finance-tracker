import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  alterarAcessoCliente,
  concederAcessoCliente,
  listarAcessosCliente,
} from "@/lib/cliente.functions";

type Acesso = Awaited<ReturnType<typeof listarAcessosCliente>>[number];

/** Bloco de gestão dos e-mails que entram na Área do Cliente (uso interno). */
export function AcessosCliente({ clienteId }: { clienteId: string }) {
  const [lista, setLista] = useState<Acesso[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    setCarregando(true);
    listarAcessosCliente({ data: { clienteId } })
      .then(setLista)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao listar acessos."))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, [clienteId]);

  const conceder = async () => {
    if (nome.trim().length < 2 || !email.includes("@")) {
      toast.error("Informe nome e um e-mail válido.");
      return;
    }
    setSalvando(true);
    try {
      await concederAcessoCliente({ data: { clienteId, nome: nome.trim(), email: email.trim() } });
      toast.success("Acesso liberado. A pessoa entra com esse e-mail.");
      setNome("");
      setEmail("");
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível liberar o acesso.");
    } finally {
      setSalvando(false);
    }
  };

  const alterar = async (id: string, ativo: boolean, remover = false) => {
    try {
      await alterarAcessoCliente({ data: { id, ...(remover ? { remover: true } : { ativo }) } });
      toast.success(remover ? "Acesso removido." : ativo ? "Acesso ativado." : "Acesso pausado.");
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar.");
    }
  };

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <KeyRound className="h-4 w-4" /> Acessos à Área do Cliente
      </h3>
      <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="email@empresa.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={() => void conceder()} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-2">Liberar</span>
          </Button>
        </div>
        {carregando && <p className="text-xs text-muted-foreground">Carregando acessos...</p>}
        {!carregando && lista.length === 0 && (
          <p className="text-xs text-muted-foreground">Ninguém tem acesso a esta conta ainda.</p>
        )}
        <div className="divide-y divide-border/40">
          {lista.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{a.nome}</p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.vinculado ? "secondary" : "outline"}>
                  {a.vinculado ? "Já entrou" : "Aguardando 1º acesso"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => void alterar(a.id, !a.ativo)}>
                  {a.ativo ? "Pausar" : "Ativar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void alterar(a.id, false, true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
