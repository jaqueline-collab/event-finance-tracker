import type { Cliente } from "../types";

export function calcularCustoExtraCanaisHelena(excedentes: number, precoCanaisExc: number): number {
  if (excedentes <= 0) return 0;
  let totalCost = 0;
  for (let i = 1; i <= excedentes; i++) {
    if (i <= 4) {
      totalCost += precoCanaisExc;
    } else {
      totalCost += 19.90;
    }
  }
  return totalCost;
}

export function calcularCustoExtraUsuariosHelena(excedentes: number, precoUsuariosExc: number): number {
  if (excedentes <= 0) return 0;
  let totalCost = 0;
  for (let i = 1; i <= excedentes; i++) {
    if (i <= 17) {
      totalCost += precoUsuariosExc;
    } else if (i <= 97) {
      totalCost += 14.90;
    } else {
      totalCost += 12.90;
    }
  }
  return totalCost;
}

export function calcularCustoExtraContatosHelena(excedentes: number, precoContatosExc: number): number {
  if (excedentes <= 0) return 0;
  let totalCost = 0;

  const start = 5000;
  const end = 5000 + excedentes;

  const calculateForRange = (rStart: number, rEnd: number, rate: number) => {
    const overlapStart = Math.max(start, rStart);
    const overlapEnd = Math.min(end, rEnd);
    if (overlapStart < overlapEnd) {
      return (overlapEnd - overlapStart) * rate;
    }
    return 0;
  };

  totalCost += calculateForRange(5000, 20000, precoContatosExc);
  totalCost += calculateForRange(20000, 100000, 0.035);
  totalCost += calculateForRange(100000, Infinity, 0.025);

  return totalCost;
}

export function calcularCustoBrutoHelena(clientesAtivos: Cliente[]): number {
  if (clientesAtivos.length === 0) return 0;

  const custoBase = clientesAtivos.length * 149.90;

  let canaisExcedentesTotais = 0;
  let usuariosExcedentesTotais = 0;
  let contatosExcedentesTotais = 0;
  let custoOpcionais = 0;

  for (const c of clientesAtivos) {
    const canaisWhats = c.canaisWhats ?? 0;
    const canaisInsta = c.canaisInsta || 0;
    const canaisMessenger = c.canaisMessenger || 0;

    const excWhats = Math.max(0, canaisWhats - 1);
    const excInsta = Math.max(0, canaisInsta - 1);
    const excMessenger = Math.max(0, canaisMessenger - 1);

    canaisExcedentesTotais += (excWhats + excInsta + excMessenger);
    usuariosExcedentesTotais += Math.max(0, (c.usuariosAtivos || 0) - 3);
    contatosExcedentesTotais += Math.max(0, (c.contatosAtivos || 0) - 500);

    if (c.agentesIA) custoOpcionais += 50.00;
    if (c.asaas) custoOpcionais += 49.50;

    const qtdZapi = c.canaisZapi ?? 0;
    custoOpcionais += qtdZapi * 69.00;

    if (c.transcricaoIA) custoOpcionais += (c.usuariosAtivos || 0) * 3.99;
  }

  const custoCanais = calcularCustoExtraCanaisHelena(canaisExcedentesTotais, 29.90);
  const custoUsuarios = calcularCustoExtraUsuariosHelena(usuariosExcedentesTotais, 19.90);
  const custoInfra = calcularCustoExtraContatosHelena(contatosExcedentesTotais, 0.045);

  return custoBase + custoCanais + custoUsuarios + custoInfra + custoOpcionais;
}

export function calcularDescontoEscalaHelena(custoBruto: number): number {
  let desconto = 0;

  if (custoBruto > 10000) {
    const faixa1 = Math.min(custoBruto, 25000) - 10000;
    desconto += faixa1 * 0.10;
  }

  if (custoBruto > 25000) {
    const faixa2 = Math.min(custoBruto, 50000) - 25000;
    desconto += faixa2 * 0.15;
  }

  if (custoBruto > 50000) {
    const faixa3 = Math.min(custoBruto, 100000) - 50000;
    desconto += faixa3 * 0.20;
  }

  if (custoBruto > 100000) {
    const faixa4 = custoBruto - 100000;
    desconto += faixa4 * 0.25;
  }

  return desconto;
}

export function calcularCustoLiquidoHelena(clientesAtivos: Cliente[]): number {
  const bruto = calcularCustoBrutoHelena(clientesAtivos);
  const desconto = calcularDescontoEscalaHelena(bruto);
  return bruto - desconto;
}