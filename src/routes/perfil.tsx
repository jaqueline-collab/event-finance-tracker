import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client-configured";
import { salvarMeuPerfil } from "@/lib/perfil.functions";
import { iniciaisDe, usePerfil } from "@/hooks/use-perfil";
import { traduzirErroAuth } from "@/lib/auth-errors";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil · Elora" },
      { name: "description", content: "Gerencie seu nome, foto, telefone e e-mail de acesso ao Elora." },
      { property: "og:title", content: "Meu perfil · Elora" },
      { property: "og:description", content: "Nome, foto, telefone e e-mail de acesso da sua conta Elora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaPerfil,
});

function PaginaPerfil() {
  const { perfil, email, avatarUrl, carregando, recarregar } = usePerfil();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [trocandoEmail, setTrocandoEmail] = useState(false);

  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.nome ?? "");
    setTelefone(perfil.telefone ?? "");
    setAvatarPath(perfil.avatarPath ?? null);
  }, [perfil?.nome, perfil?.telefone, perfil?.avatarPath]);

  const fotoAtual = previa ?? avatarUrl;
  const iniciais = iniciaisDe(nome, email);

  const enviarFoto = async (arquivo: File) => {
    if (!perfil?.userId) {
      toast.error("Sessão não carregada. Recarregue a página.");
      return;
    }
    if (!arquivo.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setEnviando(true);
    try {
      const ext = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
      const caminho = `${perfil.userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });
      if (error) throw error;
      setAvatarPath(caminho);
      setPrevia(URL.createObjectURL(arquivo));
      toast.success("Foto carregada. Clique em salvar para confirmar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarMeuPerfil({
        data: { nome: nome.trim() || null, telefone: telefone.trim() || null, avatarPath },
      });
      setPrevia(null);
      await recarregar();
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setSalvando(false);
    }
  };

  const trocarEmail = async () => {
    const alvo = novoEmail.trim();
    if (!alvo.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setTrocandoEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: alvo },
        { emailRedirectTo: `${window.location.origin}/auth/callback` },
      );
      if (error) throw error;
      toast.success("Enviamos um link de confirmação para o novo e-mail.");
      setNovoEmail("");
    } catch (err) {
      toast.error(traduzirErroAuth(err));
    } finally {
      setTrocandoEmail(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sua foto, nome e telefone aparecem no topo do sistema e do site.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
          <CardDescription>Atualize suas informações pessoais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border border-border">
              {fotoAtual ? <AvatarImage src={fotoAtual} alt={nome || "Perfil"} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputArquivo}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void enviarFoto(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enviando || carregando}
                onClick={() => inputArquivo.current?.click()}
              >
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <span className="ml-2">{enviando ? "Enviando..." : "Trocar foto"}</span>
              </Button>
              {(avatarPath || previa) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAvatarPath(null);
                    setPrevia(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">Remover</span>
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome de exibição</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como você quer ser chamado"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 90000-0000"
              />
            </div>
          </div>

          <Button onClick={() => void salvar()} disabled={salvando || carregando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">{salvando ? "Salvando..." : "Salvar alterações"}</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E-mail de acesso</CardTitle>
          <CardDescription>
            Seu acesso atual é <span className="font-medium text-foreground">{email ?? "—"}</span>. A troca
            só vale depois que você confirmar pelo link enviado no novo e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novo-email">Novo e-mail</Label>
            <Input
              id="novo-email"
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="novo@exemplo.com"
            />
          </div>
          <Button variant="outline" onClick={() => void trocarEmail()} disabled={trocandoEmail}>
            {trocandoEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className={trocandoEmail ? "ml-2" : ""}>
              {trocandoEmail ? "Enviando..." : "Solicitar troca de e-mail"}
            </span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
