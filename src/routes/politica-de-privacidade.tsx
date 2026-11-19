import { createFileRoute } from "@tanstack/react-router";
import { Navbar, Footer, PageHeader } from "@/components/landing/SiteChrome";

const TITULO = "Política de Privacidade — EloraCRM";
const DESC = "Como o EloraCRM coleta, usa, guarda e exclui os dados recebidos pela API oficial do Instagram.";
const URL = "https://eloracrm.com.br/politica-de-privacidade";
const EMAIL = "suporte@eloracrm.com.br";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PoliticaPage,
});

function Email() {
  return <a href={`mailto:${EMAIL}`} className="font-semibold underline underline-offset-2 text-landing-fg">{EMAIL}</a>;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-xl md:text-2xl font-bold text-landing-fg">{titulo}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

const Lista = ({ itens }: { itens: React.ReactNode[] }) => (
  <ul className="list-disc pl-6 space-y-2">{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
);

function PoliticaPage() {
  return (
    <div className="min-h-screen bg-landing-bg text-landing-fg" style={{ fontFamily: "var(--font-body)" }}>
      <Navbar />
      <PageHeader etiqueta="Última atualização: 18/11/2026" titulo="Política de Privacidade" />
      <main className="px-5 sm:px-6 py-12 md:py-16">
        <article className="max-w-[68ch] mx-auto text-base leading-relaxed">
          <Secao titulo="1. Quem somos">
            <p>Este aplicativo é operado por DITÓS &amp; C.O LTDA, CNPJ 52.719.885/0001-87, responsável pelo tratamento dos dados descritos aqui. Contato: <Email />.</p>
          </Secao>
          <Secao titulo="2. Dados que coletamos">
            <p>Por meio da API oficial do Instagram, autorizada pelo titular da conta comercial conectada, coletamos:</p>
            <Lista itens={[
              "de quem interage com a conta (comenta, responde a stories ou envia mensagem): ID e nome de usuário do Instagram, o texto do comentário ou da mensagem e a data e hora da interação;",
              "da conta comercial conectada: métricas de publicações, stories e alcance.",
            ]} />
            <p>Não coletamos senhas, dados de pagamento nem informações de contas que não interagiram com o perfil.</p>
          </Secao>
          <Secao titulo="3. Como usamos os dados">
            <Lista itens={[
              "Responder automaticamente mensagens e comentários, por exemplo enviando por mensagem direta o link pedido em uma campanha.",
              "Encaminhar a conversa para atendimento humano quando necessário.",
              "Gerar relatórios de desempenho da conta para a própria empresa.",
            ]} />
            <p>Só enviamos mensagens a quem iniciou o contato, dentro das regras e prazos da Meta. Não usamos os dados para outros fins nem os vendemos.</p>
          </Secao>
          <Secao titulo="4. Base legal">
            <p>O tratamento se apoia no legítimo interesse de responder a quem procurou a empresa e na execução das solicitações feitas pelo próprio usuário (art. 7º, incisos IX e V, da Lei nº 13.709/2018, a LGPD).</p>
          </Secao>
          <Secao titulo="5. Compartilhamento">
            <p>Não vendemos nem compartilhamos dados com terceiros para fins comerciais. Os dados são processados apenas pelos fornecedores de tecnologia que operam o serviço (hospedagem, automação e a própria Meta), sob dever de confidencialidade.</p>
          </Secao>
          <Secao titulo="6. Por quanto tempo guardamos">
            <p>Mantemos os dados enquanto forem necessários para o atendimento e por até 12 meses após a última interação. Depois disso, eles são excluídos ou anonimizados.</p>
          </Secao>
          <Secao titulo="7. Seus direitos e exclusão de dados">
            <p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento:</p>
            <Lista itens={[
              <>por e-mail, para <Email />, com o assunto “Exclusão de dados” e o seu nome de usuário do Instagram;</>,
              "ou removendo o acesso do aplicativo em Instagram > Configurações > Segurança > Apps e sites.",
            ]} />
            <p>Atendemos os pedidos em até 15 dias.</p>
          </Secao>
          <Secao titulo="8. Segurança">
            <p>Usamos acesso restrito, conexões criptografadas e armazenamento protegido.</p>
          </Secao>
          <Secao titulo="9. Alterações">
            <p>Esta política pode ser atualizada. A versão vigente fica sempre neste endereço.</p>
          </Secao>
        </article>
      </main>
      <Footer />
    </div>
  );
}
