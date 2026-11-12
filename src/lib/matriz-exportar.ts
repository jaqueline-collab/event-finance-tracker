/** Browser-only export of visible Matriz cells; estimates and coverage remain explicit. */
export async function exportarMatriz(formato: "csv" | "xlsx" | "pdf", cab: string[], linhas: (string | number)[][], nome: string) {
  if (formato === "csv") {
    const texto = "\uFEFF" + [cab, ...linhas].map(l => l.map(v => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${nome}.csv`; a.click(); URL.revokeObjectURL(url);
  } else if (formato === "xlsx") {
    const x = await import("xlsx"); const wb = x.utils.book_new();
    x.utils.book_append_sheet(wb, x.utils.aoa_to_sheet([cab,...linhas]), "Matriz"); x.writeFile(wb, `${nome}.xlsx`);
  } else {
    const { jsPDF } = await import("jspdf"); const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" }); autoTable(doc, { head: [cab], body: linhas, styles: { fontSize: 7 } }); doc.save(`${nome}.pdf`);
  }
}