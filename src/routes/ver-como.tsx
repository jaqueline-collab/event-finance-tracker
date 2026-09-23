import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Handshake, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/ver-como")({
  head: () => ({
    meta: [
      { title: "Ver como · Elora" },
      {
        name: "description",
        content:
          "Abra a Área do Parceiro ou a Área do Cliente em modo administrador somente leitura, buscando pelo nome.",
      },
      { property: "og:title", content: "Ver como · Elora" },
      {
        property: "og:description",
        content: "Atalho para visualizar a área de qualquer parceiro ou cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerComoPage,
});

function Lista({
  titulo,
  descricao,
  icone: Icone,
  itens,
  aoEscolher,
  placeholder,
}: {
  titulo: string;
  descricao: string;
  icone: any;
  itens: { id: string; nome: string }[];
  aoEscolher: (id: string) => void;
  placeholder: string;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = [...itens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return q ? base.filter((i) => i.nome.toLowerCase().includes(q)) : base;
  }, [itens, busca]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icone className="h-4 w-4" /> {titulo}
        </CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`busca-${titulo}`}>Buscar</Label>
          <Input
            id={`busca-${titulo}`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">
          {filtrados.map((i) => (
            <Button key={i.id} size="sm" variant="outline" onClick={() => aoEscolher(i.id)}>
              {i.nome}
            </Button>
          ))}
          {filtrados.length === 0 && (
            <p className="text-sm text-muted-foreground">Nada encontrado com esse nome.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VerComoPage() {
  const navigate = useNavigate();
  const { parceiros, clientes } = useStore();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
          <Eye className="h-5 w-5" /> Ver como
        </h1>
        <p className="text-sm text-muted-foreground">
          Abra a área de um parceiro ou de um cliente em modo administrador, somente leitura.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Lista
          titulo="Ver como parceiro"
          descricao="Entra direto na Área do Parceiro escolhido."
          icone={Handshake}
          placeholder="Nome do parceiro"
          itens={parceiros.map((p) => ({ id: p.id, nome: p.nome }))}
          aoEscolher={(id) => navigate({ to: "/parceiro", search: { como: id } as never })}
        />
        <Lista
          titulo="Ver como cliente"
          descricao="Entra direto na Área do Cliente escolhido."
          icone={Users}
          placeholder="Nome do cliente"
          itens={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
          aoEscolher={(id) => navigate({ to: "/area-do-cliente", search: { como: id } as never })}
        />
      </div>
    </div>
  );
}
