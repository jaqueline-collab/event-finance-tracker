import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { traduzirErroAuth } from "@/lib/auth-errors";
import { Mail, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · Elora" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const enviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLimpo = email.trim();
    if (!emailLimpo || !emailLimpo.includes("@")) {
      toast.error("Informe um email válido.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailLimpo,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Código enviado! Verifique seu email.");
      setStep("code");
    } catch (err) {
      toast.error(traduzirErroAuth(err));
    } finally {
      setLoading(false);
    }
  };

  const verificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpo = code.replace(/\D/g, "");
    if (codigoLimpo.length !== 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: codigoLimpo,
        type: "email",
      });
      if (error) throw error;
      toast.success("Bem-vindo!");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(traduzirErroAuth(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {step === "email" ? "Entrar" : "Confirme o código"}
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "Digite seu email para receber um código de 6 dígitos. Sem senha."
              : `Enviamos um código para ${email}. Cole abaixo para entrar.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={enviarCodigo} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Enviando..." : "Enviar código"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verificarCodigo} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de 6 dígitos</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verificando..." : "Entrar"}
              </Button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                >
                  <ArrowLeft className="h-3 w-3" /> Trocar email
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={loading}
                  onClick={() => enviarCodigo(new Event("submit") as unknown as React.FormEvent)}
                >
                  Reenviar código
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}