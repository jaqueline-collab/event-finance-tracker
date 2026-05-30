import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  DollarSign,
  Calendar,
  User,
  Briefcase,
  Layers,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({ meta: [{ title: "Funil de Vendas · Elora" }] }),
  component: FunilPage,
});

interface KanbanCard {
  id: string;
  titulo: string;
  cliente: string;
  valor: number;
  status: "contato" | "proposta" | "negociacao" | "ganho";
  dataCriacao: string;
  observacao?: string;
}

const COLUMNS = [
  { id: "contato" as const, label: "Contato Inicial", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { id: "proposta" as const, label: "Proposta Enviada", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { id: "negociacao" as const, label: "Em Negociação", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { id: "ganho" as const, label: "Fechado / Ganho", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
];

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ===== Mappers de Banco de Dados =====
const mapCardToDb = (c: KanbanCard) => ({
  id: c.id,
  titulo: c.titulo,
  cliente: c.cliente,
  valor: c.valor,
  status: c.status,
  data_criacao: c.dataCriacao,
  observacao: c.observacao || ""
});

const mapDbToCard = (r: any): KanbanCard => ({
  id: r.id,
  titulo: r.titulo,
  cliente: r.cliente,
  valor: Number(r.valor ?? 0),
  status: r.status as any,
  dataCriacao: r.data_criacao,
  observacao: r.observacao || ""
});

function FunilPage() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<KanbanCard, "id" | "dataCriacao">>({
    titulo: "",
    cliente: "",
    valor: 0,
    status: "contato",
    observacao: "",
  });

  // Carregar do Supabase
  useEffect(() => {
    supabase.from("elora_kanban_cards").select("*").then(({ data, error }) => {
      if (data && data.length > 0) {
        setCards(data.map(mapDbToCard));
      } else {
        // Seed inicial para visual premium
        const initial: KanbanCard[] = [
          {
            id: "seed-1",
            titulo: "Plano Growth CRM + Z-API",
            cliente: "Clínica Bem Estar",
            valor: 746.00,
            status: "contato",
            dataCriacao: new Date().toISOString().slice(0, 10),
            observacao: "Lead vindo do Instagram, interessado em chatbot de agendamento.",
          },
          {
            id: "seed-2",
            titulo: "Setup Integração + IA",
            cliente: "Imobiliária Novo Lar",
            valor: 1197.00,
            status: "proposta",
            dataCriacao: new Date().toISOString().slice(0, 10),
            observacao: "Proposta de setup único de IA + MRR do plano Starter.",
          },
          {
            id: "seed-3",
            titulo: "Plano Scale Customizado",
            cliente: "Grupo J. Silva",
            valor: 2450.00,
            status: "negociacao",
            dataCriacao: new Date().toISOString().slice(0, 10),
            observacao: "Reunião de fechamento agendada com o diretor comercial.",
          }
        ];
        setCards(initial);
        initial.forEach(c => {
          supabase.from("elora_kanban_cards").insert(mapCardToDb(c)).then();
        });
      }
    });
  }, []);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      titulo: "",
      cliente: "",
      valor: 0,
      status: "contato",
      observacao: "",
    });
    setOpen(true);
  };

  const handleOpenEdit = (card: KanbanCard) => {
    setEditId(card.id);
    setForm({
      titulo: card.titulo,
      cliente: card.cliente,
      valor: card.valor,
      status: card.status,
      observacao: card.observacao || "",
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.titulo || !form.cliente) return;

    if (editId) {
      const updatedCard: KanbanCard = {
        id: editId,
        titulo: form.titulo,
        cliente: form.cliente,
        valor: Number(form.valor),
        status: form.status,
        dataCriacao: cards.find(c => c.id === editId)?.dataCriacao || new Date().toISOString().slice(0, 10),
        observacao: form.observacao
      };
      setCards(cards.map(c => c.id === editId ? updatedCard : c));
      supabase.from("elora_kanban_cards").update(mapCardToDb(updatedCard)).eq("id", editId).then(({ error }) => {
        if (error) console.error("Erro ao atualizar oportunidade:", error);
      });
    } else {
      const newCard: KanbanCard = {
        id: Math.random().toString(36).substring(2, 9),
        titulo: form.titulo,
        cliente: form.cliente,
        valor: Number(form.valor),
        status: form.status,
        dataCriacao: new Date().toISOString().slice(0, 10),
        observacao: form.observacao
      };
      setCards([...cards, newCard]);
      supabase.from("elora_kanban_cards").insert(mapCardToDb(newCard)).then(({ error }) => {
        if (error) console.error("Erro ao salvar oportunidade:", error);
      });
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente remover esta oportunidade do funil?")) {
      setCards(cards.filter(c => c.id !== id));
      supabase.from("elora_kanban_cards").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Erro ao remover oportunidade:", error);
      });
    }
  };

  const moveCard = (id: string, direction: "prev" | "next") => {
    const cardIndex = cards.findIndex(c => c.id === id);
    if (cardIndex === -1) return;
    const card = cards[cardIndex];
    const currentColIndex = COLUMNS.findIndex(col => col.id === card.status);
    
    let nextColIndex = currentColIndex;
    if (direction === "next" && currentColIndex < COLUMNS.length - 1) {
      nextColIndex++;
    } else if (direction === "prev" && currentColIndex > 0) {
      nextColIndex--;
    }

    if (nextColIndex !== currentColIndex) {
      const updatedCard = { ...card, status: COLUMNS[nextColIndex].id };
      setCards(cards.map(c => c.id === id ? updatedCard : c));
      supabase.from("elora_kanban_cards").update(mapCardToDb(updatedCard)).eq("id", id).then(({ error }) => {
        if (error) console.error("Erro ao mover oportunidade:", error);
      });
    }
  };

  // Totals calculations
  const totalGeral = cards.reduce((sum, c) => sum + c.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Funil de Vendas</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas oportunidades comerciais e acompanhe o pipeline de novos clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Potencial de Fechamento</p>
            <p className="text-lg font-bold text-accent">{formatBRL(totalGeral)}</p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Grid do Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colCards = cards.filter(c => c.status === col.id);
          const colTotal = colCards.reduce((sum, c) => sum + c.valor, 0);

          return (
            <div key={col.id} className="flex flex-col bg-muted/20 border border-border/40 rounded-xl p-3 min-h-[500px]">
              {/* Header da Coluna */}
              <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${col.color} text-xs font-semibold py-0.5 px-2`}>
                    {colCards.length}
                  </Badge>
                  <span className="font-semibold text-sm text-foreground">{col.label}</span>
                </div>
                <span className="text-xs font-bold text-primary">{formatBRL(colTotal)}</span>
              </div>

              {/* Lista de Cartões */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {colCards.map((card) => (
                  <Card key={card.id} className="border-border/60 hover:border-primary/40 hover:shadow-md transition-all group duration-200">
                    <CardHeader className="p-3 pb-2 space-y-1">
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-sm tracking-tight leading-snug group-hover:text-primary transition-colors">
                          {card.titulo}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleOpenEdit(card)}>
                            <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(card.id)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{card.cliente}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-foreground">
                          {formatBRL(card.valor)}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{card.dataCriacao}</span>
                        </div>
                      </div>
                      
                      {card.observacao && (
                        <p className="text-[11px] text-muted-foreground/80 bg-muted/30 border border-border/20 rounded p-1.5 line-clamp-2">
                          {card.observacao}
                        </p>
                      )}

                      {/* Botões de Movimentação Rápida */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/20 mt-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          disabled={col.id === "contato"}
                          onClick={() => moveCard(card.id, "prev")}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Mover</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          disabled={col.id === "ganho"}
                          onClick={() => moveCard(card.id, "next")}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {colCards.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border/40 rounded-lg text-muted-foreground text-xs h-32 bg-muted/5">
                    <Layers className="h-5 w-5 mb-2 text-muted-foreground/40" />
                    Nenhuma proposta aqui.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Criação / Edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Editar Oportunidade" : "Adicionar Oportunidade"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="titulo" className="mb-1 block">Título do Projeto / Proposta</Label>
              <Input
                id="titulo"
                value={form.titulo}
                placeholder="Ex: Licença Growth + WhatsApp Extra"
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cliente" className="mb-1 block">Nome do Cliente</Label>
              <Input
                id="cliente"
                value={form.cliente}
                placeholder="Ex: Organizações Tabajara"
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor" className="mb-1 block">Valor MRR Estimado (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor === 0 ? "" : form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="status" className="mb-1 block">Etapa do Funil</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: KanbanCard["status"]) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="observacao" className="mb-1 block">Observações / Detalhes</Label>
              <textarea
                id="observacao"
                rows={3}
                className="w-full text-sm border border-input rounded-md p-2 bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Detalhes adicionais, canais pretendidos, contato inicial, etc."
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.titulo || !form.cliente}>Salvar Oportunidade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
