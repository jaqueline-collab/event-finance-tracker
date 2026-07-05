import type { Cliente, CustoBase, Plano } from "../types";
import {
  calcularCustoExtraContatosHelena,
  calcularCustoExtraUsuariosHelena,
} from "./helena";

export function custoMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  _custos: CustoBase[],
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return 0;

  const licencaBase = plano.licencaBase ?? 149.90;
  const precoCanalWhatsExc = plano.precoCanalWhatsExc ?? plano.precoCanaisExc ?? 29.90;
  const precoCanalInstaExc = plano.precoCanalInstaExc ?? plano.precoCanaisExc ?? 29.90;
  const precoCanalMessengerExc = plano.precoCanalMessengerExc ?? plano.precoCanaisExc ?? 29.90;
  const precoUsuariosExc = plano.precoUsuariosExc ?? 19.90;
  const precoContatosExc = plano.precoContatosExc ?? 0.045;
  const precoIA = plano.precoIA ?? 50.00;
  const precoAsaas = plano.precoAsaas ?? 49.50;
  const precoZapi = plano.precoZapi ?? 69.00;
  const precoTranscricaoUser = plano.precoTranscricaoUser ?? 3.99;

  let total = licencaBase;

  const canaisWhats = cliente.canaisWhats ?? 0;
  const canaisInsta = cliente.canaisInsta || 0;
  const canaisMessenger = cliente.canaisMessenger || 0;

  const excWhats = Math.max(0, canaisWhats - (plano.canaisWhatsInclusos || 0));
  const excInsta = Math.max(0, canaisInsta - (plano.canaisInstaInclusos || 0));
  const excMessenger = Math.max(0, canaisMessenger - (plano.canaisMessengerInclusos || 0));
  total += excWhats * precoCanalWhatsExc;
  total += excInsta * precoCanalInstaExc;
  total += excMessenger * precoCanalMessengerExc;

  const usersExc = Math.max(0, (cliente.usuariosAtivos || 0) - (plano.usuariosInclusos || 3));
  total += calcularCustoExtraUsuariosHelena(usersExc, precoUsuariosExc);

  const contatosExc = Math.max(0, (cliente.contatosAtivos || 0) - (plano.contatosInclusos || 500));
  total += calcularCustoExtraContatosHelena(contatosExc, precoContatosExc);

  if (cliente.agentesIA && !plano.incluiIA) total += precoIA;
  if (cliente.asaas && !plano.incluiAsaas) total += precoAsaas;

  const qtdZapi = cliente.canaisZapi ?? 0;
  total += qtdZapi * precoZapi;

  if (cliente.transcricaoIA && !plano.incluiTranscricao) {
    total += (cliente.usuariosAtivos || 0) * precoTranscricaoUser;
  }

  return total;
}