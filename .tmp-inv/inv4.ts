import { contaDoCliente, lerApiElora } from "@/lib/integracao-elora.functions";
const { conta } = await contaDoCliente("8c0ojhr2");
const r: any = await lerApiElora(String(conta.base_url), String(conta.api_key), "crm", `/v2/panel?PageNumber=1&PageSize=50&IncludeDetails=Steps`);
const l = r.items ?? r.data ?? r; const p = l.find((x: any) => x.id === "324f16fc-b562-4001-b012-57f3e371b218");
console.log(JSON.stringify(p?.steps?.slice(0,3)));
process.exit(0);
