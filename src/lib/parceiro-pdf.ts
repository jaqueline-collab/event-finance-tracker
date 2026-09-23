import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type LinhaPdfCliente = {
  nome: string;
  plano: string;
  status: string;
  setup: string;
  ltv: string;
  churn: string;
  /** Só preenchido quando o parceiro pode ver valores. */
  mensalidade?: string;
  historico: { data: string; tipo: string; descricao: string }[];
};

export type PdfClientesParceiro = {
  parceiro: string;
  periodo: string;
  geradoEm: string;
  veValores: boolean;
  clientes: LinhaPdfCliente[];
};

/** Gera e baixa o PDF de clientes do parceiro, com o histórico de cada um. */
export function gerarPdfClientesParceiro(dados: PdfClientesParceiro) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 40;
  let y = margem;

  doc.setFontSize(16);
  doc.text("Clientes", margem, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(`Parceiro: ${dados.parceiro}`, margem, y);
  y += 14;
  doc.text(`Período do filtro: ${dados.periodo}`, margem, y);
  y += 14;
  doc.text(`Gerado em: ${dados.geradoEm}`, margem, y);
  y += 10;

  const cabecalho = ["Cliente", "Plano", "Status", "Setup", "LTV", "Churn"];
  if (dados.veValores) cabecalho.push("Mensalidade");

  autoTable(doc, {
    startY: y + 8,
    head: [cabecalho],
    body: dados.clientes.map((c) => {
      const linha = [c.nome, c.plano, c.status, c.setup, c.ltv, c.churn];
      if (dados.veValores) linha.push(c.mensalidade ?? "—");
      return linha;
    }),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: margem, right: margem },
  });

  for (const c of dados.clientes) {
    doc.addPage();
    doc.setFontSize(13);
    doc.text(`Histórico · ${c.nome}`, margem, margem);
    doc.setFontSize(9);
    const resumo = [
      `Plano: ${c.plano}`,
      `Status: ${c.status}`,
      `Setup: ${c.setup}`,
      `LTV: ${c.ltv}`,
      `Churn: ${c.churn}`,
      dados.veValores ? `Mensalidade: ${c.mensalidade ?? "—"}` : null,
    ]
      .filter(Boolean)
      .join("   ");
    doc.text(resumo, margem, margem + 16);

    autoTable(doc, {
      startY: margem + 28,
      head: [["Data", "Movimento", "Descrição"]],
      body:
        c.historico.length > 0
          ? c.historico.map((h) => [h.data, h.tipo, h.descricao])
          : [["—", "—", "Sem movimentos registrados."]],
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 110 } },
      margin: { left: margem, right: margem },
    });
  }

  doc.save(`clientes-${dados.parceiro.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
