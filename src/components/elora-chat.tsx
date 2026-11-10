import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { RotateCcw, X } from "lucide-react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { EloraMark } from "@/components/landing/EloraMark";
import { Button } from "@/components/ui/button";
import { getCachedAccessToken } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client-configured";
import { cn } from "@/lib/utils";

const SUGESTOES = [
  "Quantos novos contatos tive nos últimos 7 dias?",
  "Compare este mês com o mês passado.",
  "Como conecto meu WhatsApp?",
];

async function token() {
  const t = getCachedAccessToken();
  if (t) return t;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

/** Botão flutuante + painel da Elora, montado uma vez no layout das áreas externas. */
export function EloraChat({ area }: { area: "cliente" | "parceiro" }) {
  const [aberto, setAberto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const como = typeof search?.como === "string" ? search.como.trim() : "";

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/elora-ia",
        headers: async () => ({ Authorization: `Bearer ${await token()}` }),
        body: () => ({ area, como }),
      }),
    [area, como],
  );
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({ id: `elora-${area}-${como}`, transport });
  const ocupado = status === "submitted" || status === "streaming";

  const enviar = (texto: string) => {
    const t = texto.trim();
    if (!t || ocupado) return;
    clearError();
    sendMessage({ text: t });
    setEntrada("");
  };
  const erroTexto = (() => {
    if (!error) return null;
    try {
      return JSON.parse(error.message).erro as string;
    } catch {
      return error.message || "Não consegui responder agora.";
    }
  })();

  return (
    <>
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Falar com a Elora"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:scale-[1.03]"
        >
          <EloraMark className="size-5" />
          Elora
        </button>
      )}
      {aberto && (
        <section
          aria-label="Conversa com a Elora"
          className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100vh-40px))] sm:w-[400px] sm:rounded-2xl sm:border sm:shadow-2xl"
        >
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <EloraMark className="size-4" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-semibold">Elora</p>
              <p className="text-xs text-muted-foreground">Só lê e explica. Não altera nada.</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Nova conversa" onClick={() => { stop(); setMessages([]); clearError(); }}>
              <RotateCcw className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setAberto(false)}>
              <X className="size-4" />
            </Button>
          </header>
          <Conversation className="flex-1">
            <ConversationContent className="gap-4 px-4">
              {messages.length === 0 ? (
                <ConversationEmptyState title="Oi, eu sou a Elora" description="Pergunte sobre seus números ou sobre como usar a ferramenta.">
                  <div className="mt-4 flex flex-col gap-2">
                    {SUGESTOES.map((s) => (
                      <button key={s} type="button" onClick={() => enviar(s)} className="rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted">
                        {s}
                      </button>
                    ))}
                  </div>
                </ConversationEmptyState>
              ) : (
                messages.map((m) => {
                  const texto = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                  if (m.role === "assistant" && !texto) return null;
                  return (
                    <Message key={m.id} from={m.role}>
                      <MessageContent className={cn(m.role === "user" && "bg-foreground text-background")}>
                        {m.role === "assistant" ? <MessageResponse>{texto}</MessageResponse> : texto}
                      </MessageContent>
                    </Message>
                  );
                })
              )}
              {status === "submitted" || (status === "streaming" && !messages.at(-1)?.parts.some((p) => p.type === "text" && p.text)) ? (
                <p className="text-sm text-muted-foreground">Elora está consultando…</p>
              ) : null}
              {erroTexto && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erroTexto}</p>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="border-t p-3">
            <PromptInput onSubmit={(m) => enviar(m.text ?? "")}>
              <PromptInputTextarea value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="Pergunte para a Elora…" maxLength={1000} />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={status} onClick={ocupado ? (e) => { e.preventDefault(); stop(); } : undefined} disabled={!ocupado && !entrada.trim()} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>
      )}
    </>
  );
}
