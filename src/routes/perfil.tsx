import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Save, ShieldCheck, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client-configured";
import { enviarAvatar, salvarMeuPerfil } from "@/lib/perfil.functions";
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
  const { perfil, userId, email, avatarUrl, recarregar } = usePerfil();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [trocandoEmail, setTrocandoEmail] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState(false);




  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.nome ?? "");
    setTelefone(perfil.telefone ?? "");
    setAvatarPath(perfil.avatarPath ?? null);
  }, [perfil?.nome, perfil?.telefone, perfil?.avatarPath]);

  const fotoAtual = previa ?? avatarUrl;
  const iniciais = iniciaisDe(nome, email);

  const enviarFoto = async (arquivo: File) => {
    let uid = userId;
    if (!uid) {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
    }
    if (!uid) {
      toast.error("Sua sessão expirou. Entre novamente para trocar a foto.");
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
      const buffer = await arquivo.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 8192) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const envio = enviarAvatar({
        data: { base64: btoa(bin), contentType: arquivo.type || "image/jpeg", ext },
      });
      const limite = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("O envio demorou demais. Tente novamente.")), 25000),
      );
      const { path } = await Promise.race([envio, limite]);
      setAvatarPath(path);
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
      const gravacao = salvarMeuPerfil({
        data: { nome: nome.trim() || null, telefone: telefone.trim() || null, avatarPath },
      });
      const limite = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("O salvamento demorou demais. Tente novamente.")), 20000),
      );
      await Promise.race([gravacao, limite]);
      setPrevia(null);
      await recarregar();
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setSalvando(false);
    }
  };

  /** Passo 1: manda um código de 6 dígitos para o e-mail ATUAL. */
  const enviarCodigo = async () => {
    const alvo = novoEmail.trim();
    if (!alvo.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!email) {
      toast.error("Não identificamos seu e-mail atual. Recarregue a página.");
      return;
    }
    setTrocandoEmail(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setCodigoEnviado(true);
      toast.success(`Enviamos um código de 6 dígitos para ${email}.`);
    } catch (err) {
      toast.error(traduzirErroAuth(err));
    } finally {
      setTrocandoEmail(false);
    }
  };

  /** Passo 2: confere o código do e-mail atual e só então pede a troca. */
  const confirmarTroca = async () => {
    const alvo = novoEmail.trim();
    const token = codigo.trim();
    if (token.length < 6) {
      toast.error("Digite o código de 6 dígitos que enviamos.");
      return;
    }
    setTrocandoEmail(true);
    try {
      const { error: erroCodigo } = await supabase.auth.verifyOtp({
        email: email as string,
        token,
        type: "email",
      });
      if (erroCodigo) throw erroCodigo;
      const { error } = await supabase.auth.updateUser(
        { email: alvo },
        { emailRedirectTo: `${window.location.origin}/auth/callback` },
      );
      if (error) throw error;
      toast.success("Código confirmado. Agora confirme pelo link enviado ao novo e-mail.");
      setNovoEmail("");
      setCodigo("");
      setCodigoEnviado(false);
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
                disabled={enviando}
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

          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">{salvando ? "Salvando..." : "Salvar alterações"}</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E-mail de acesso</CardTitle>
          <CardDescription>
            Seu acesso atual é <span className="font-medium text-foreground">{email ?? "—"}</span>. Primeiro
            enviamos um código para esse e-mail; depois de confirmá-lo, o novo endereço recebe o link final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novo-email">Novo e-mail</Label>
            <Input
              id="novo-email"
              type="email"
              value={novoEmail}
              disabled={codigoEnviado}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="novo@exemplo.com"
            />
          </div>

          {codigoEnviado && (
            <div className="space-y-2">
              <Label htmlFor="codigo">Código enviado para {email}</Label>
              <Input
                id="codigo"
                inputMode="numeric"
                maxLength={8}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void (codigoEnviado ? confirmarTroca() : enviarCodigo())}
              disabled={trocandoEmail}
            >
              {trocandoEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span className="ml-2">
                {trocandoEmail
                  ? "Aguarde..."
                  : codigoEnviado
                    ? "Confirmar código e trocar"
                    : "Enviar código para o e-mail atual"}
              </span>
            </Button>
            {codigoEnviado && (
              <Button
                variant="ghost"
                onClick={() => {
                  setCodigoEnviado(false);
                  setCodigo("");
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

  );
}
