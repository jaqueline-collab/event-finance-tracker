import { MessageCircle } from "lucide-react";
import { WHATSAPP_LINK, WHATSAPP_NUMERO } from "@/lib/landing/contato";

export function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar no WhatsApp ${WHATSAPP_NUMERO}`}
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold px-4 py-3 shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline text-sm">Fale no WhatsApp</span>
    </a>
  );
}
