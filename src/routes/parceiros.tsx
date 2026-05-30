import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import type { Parceiro } from "@/lib/types";
import { Plus, Trash2, Users, Mail, Phone, Package } from "lucide-react";

export const Route = createFileRoute("/parceiros")({
  head: () => ({ meta: [{ title: "Parceiros · Elora" }] }),
  component: ParceirosPage,
});

type ParceiroForm = Omit<Parceiro, "id" | "criadoEm">;

const emptyForm: ParceiroForm = {
  nome: "",
  email: "",
  celular: "",
  planosVinculados: [],
};

function ParceirosPage() {
  const { parceiros, planos, addParceiro, removeParceiro, updateParceiro } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ParceiroForm>(emptyForm);

  const togglePlano = (planoId: string) => {
    setForm((prev) => ({
      ...prev,
      planosVinculados: prev.planosVinculados.includes(planoId)
        ? prev.planosVinculados.filter((id) => id !== planoId)
        : [...prev.planosVinculados, planoId],
    }));
  };

  const handleSave = () => {
    addParceiro(form);
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Parceiros</h1>
          <p className="text-muted-foreground text-sm">Agências e revendedores credenciados no seu White Label</p>
        </div>
        <Button onClick={() => { setOpen((v) => !v); setForm(emptyForm); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Parceiro
        </Button>
      </div>

      {open && (
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle>Cadastrar Agência Parceira</CardTitle>
            <CardDescription>Vincule planos específicos que essa agência pode comercializar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-1 block">Nome da Agência / Parceiro</Label>
                <Input placeholder="Ex: Agência XYZ..." value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">E-mail</Label>
                <Input type="email" placeholder="contato@agencia.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Celular / WhatsApp</Label>
                <Input placeholder="(11) 99999-9999" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Planos que este parceiro pode revender</Label>
              <div className="flex flex-wrap gap-3">
                {planos.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${form.planosVinculados.includes(p.id) ? "border-primary bg-primary/10" : "border-border/60"}`}
                    onClick={() => togglePlano(p.id)}
                  >
                    <Checkbox
                      id={`chk-${p.id}`}
                      checked={form.planosVinculados.includes(p.id)}
                      onCheckedChange={() => togglePlano(p.id)}
                    />
                    <Label htmlFor={`chk-${p.id}`} className="cursor-pointer">{p.nome}</Label>
                  </div>
                ))}
                {planos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum plano cadastrado ainda. Crie planos primeiro.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!form.nome} onClick={handleSave}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar Parceiro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {parceiros.map((p) => {
          const planosDoP = planos.filter((pl) => p.planosVinculados.includes(pl.id));
          return (
            <Card key={p.id} className="border-border/60 hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center text-sm font-bold text-white">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground">Desde {p.criadoEm}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeParceiro(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  <a href={`mailto:${p.email}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Mail className="h-3.5 w-3.5" /> {p.email || "—"}
                  </a>
                  <a href={`tel:${p.celular}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5" /> {p.celular || "—"}
                  </a>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Package className="h-3.5 w-3.5" /> Planos vinculados:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {planosDoP.length > 0
                      ? planosDoP.map((pl) => <Badge key={pl.id} variant="secondary" className="text-xs">{pl.nome}</Badge>)
                      : <span className="text-xs text-muted-foreground">Nenhum plano vinculado</span>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {parceiros.length === 0 && (
          <div className="col-span-3 text-center py-12 border border-dashed border-border rounded-lg">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Novo Parceiro" para adicionar uma agência.</p>
          </div>
        )}
      </div>
    </div>
  );
}
