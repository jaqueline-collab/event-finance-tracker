import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, LogIn, Mail, Phone, Globe } from "lucide-react";
import { EloraMark } from "@/components/landing/EloraMark";
import { Parceiros } from "@/components/landing/Parceiros";
import { EMAIL_CONTATO, WHATSAPP_LINK, WHATSAPP_NUMERO } from "@/lib/landing/contato";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: "Rabbit Agency — Parceiro Oficial EloraCRM" },
      {
        name: "description",
        content:
          "Parceria oficial EloraCRM + Rabbit Agency: máquina de vendas ponta a ponta para clínicas, consultórios e negócios de saúde. SDR dedicado, Social Seller e treinamento 6 mãos.",
      },
      {
        property: "og:title",
        content: "Rabbit Agency — Parceiro Oficial EloraCRM",
      },
      {
        property: "og:description",
        content:
          "Processos 100% integrados entre captação, atendimento e CRM. Conheça a máquina de vendas da Rabbit Agency + EloraCRM.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://eloracrm.lovable.app/parceiros" },
    ],
    links: [
      { rel: "canonical", href: "https://eloracrm.lovable.app/parceiros" },
    ],
  }),
  component: ParceirosPage,
});

function ParceirosPage() {
  return (
    <div
      className="min-h-screen bg-rabbit-black text-rabbit-white"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Navbar />

      <main>
        <Parceiros />
      </main>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
