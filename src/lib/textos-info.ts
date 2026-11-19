/**
 * Textos do ícone "i" (aprovados) e troca de "UTM" por "Campanha de anúncio" nos títulos.
 * Regras puras: um dicionário único por título; partes vazias não aparecem.
 */
export type TextoInfo = { oque: string; como?: string; fonte?: string; aviso?: string };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Títulos que aguardam decisão: ficam sem ícone até aprovação. */
export const PENDENTES = new Set<string>();

const ADS = "Sem campanha de anúncio registrada no contato, não conta como ADS.";
const HIST = 'Antes de 05/11 não há esse histórico ("—").';
const MSG = "Pelo dia da mensagem.";
const CRIADO = "Pelo dia em que o contato foi criado.";
const INICIO = "Pelo dia de início do atendimento.";

const COLUNAS: Record<string, TextoInfo> = {
  "dia": { oque: "Data de cada linha.", como: "Um dia por linha, todos os dias do período, mesmo sem movimento.", fonte: "Dia em Brasília.", aviso: "Quando aparece uma marca ao lado do dia, é um dia que ainda pode estar incompleto." },
  "social selling": { oque: "Quantidade de contatos de Social Selling do dia.", como: "Valor informado no próprio relatório; vazio não conta como zero.", fonte: "Dia da linha." },
  "novos contatos": { oque: "Pessoas que viraram contato no dia.", como: "Cada contato novo conta 1. Contatos importados em lote não contam.", fonte: `Contatos do Elora App. ${CRIADO}` },
  "novos ads": { oque: "Novos contatos que vieram de anúncio.", como: "Novos contatos com campanha de anúncio registrada.", fonte: CRIADO, aviso: ADS },
  "conversas realizadas": { oque: "Conversas com mensagem recebida no dia.", como: "Cada atendimento conta 1 por dia em que teve mensagem. Notas, transferências e registros automáticos não contam. Conversas de usuários de suporte continuam contando.", fonte: MSG, aviso: "Uma conversa que dura vários dias conta em cada dia." },
  "consulta agendada": { oque: 'Cards que chegaram à etapa "Agendados" com data da consulta preenchida.', como: "Cada card conta 1, uma vez só.", fonte: 'Conta no dia em que o card apareceu pela primeira vez em "Agendados" com a data da consulta preenchida. Não é o dia da consulta.', aviso: HIST },
  "consulta agendada ads": { oque: "Consultas agendadas de contatos vindos de anúncio.", como: "Consulta Agendada com campanha de anúncio registrada no contato.", fonte: "Igual a Consulta Agendada.", aviso: HIST },
  "procedimento vendido": { oque: 'Cards que chegaram à etapa "Agendados" com data do procedimento preenchida.', como: "Cada card conta 1, uma vez só.", fonte: 'Conta no dia em que o card apareceu pela primeira vez em "Agendados" com a data do procedimento preenchida. Não é o dia do procedimento.', aviso: HIST },
  "procedimento vendido ads": { oque: "Procedimentos vendidos de contatos vindos de anúncio.", como: "Procedimento Vendido com campanha de anúncio registrada no contato.", fonte: "Igual a Procedimento Vendido.", aviso: HIST },
  "total": { oque: "Soma do período.", como: "Soma das linhas; fica sempre no rodapé, em qualquer ordem." },
  // Colunas das tabelas dos blocos
  "canal": { oque: "Nome do canal de entrada." },
  "usuario do sistema": { oque: "Conversas em que uma pessoa da equipe respondeu no dia, inclusive quando a resposta foi pelo celular." },
  "bot": { oque: "Conversas em que nenhuma pessoa da equipe respondeu no dia. Inclui as que só o robô respondeu e as que ninguém respondeu." },
  "atendente": { oque: 'Última pessoa da equipe com nome que respondeu. "Respondida pelo celular (sem identificação)" quando só houve resposta pelo celular; "Sem resposta da equipe" quando ninguém da equipe respondeu.' },
  "atendimentos": { oque: "Atendimentos iniciados no período atribuídos a essa linha." },
  "conversas": { oque: "Conversas do período (uma por atendimento por dia com mensagem) atribuídas a essa linha." },
  "proporcao": { oque: "Parte das conversas do bloco que ficou com essa linha (conversas da linha ÷ total de conversas do bloco)." },
  "nome": { oque: "Nome do contato." },
  "telefone": { oque: "Telefone do contato." },
  "origem": { oque: "De onde o contato chegou." },
  "fase do cliente": { oque: "Etapa atual do card." },
  "procedimentos": { oque: "Procedimento registrado no card." },
  "procedimento de interesse": { oque: "Procedimento de interesse do contato." },
  "data da consulta": { oque: "Data da consulta registrada no card." },
  "data do procedimento": { oque: "Data do procedimento registrada no card." },
  "valor da consulta": { oque: 'Campo "Valor da consulta" do card.' },
  "valor do procedimento": { oque: 'Campo "Valor" principal do card.' },
  "valor": { oque: "Valor do card." },
  "data e hora": { oque: "Data e hora da consulta ou do procedimento, em Brasília." },
  "tipo": { oque: "Consulta ou procedimento." },
  "campanha de anuncio (origem)": { oque: "Origem da campanha de anúncio registrada no contato." },
  "campanha de anuncio (nome)": { oque: "Nome da campanha de anúncio registrada no contato." },
  "campanha de anuncio (pagina de entrada)": { oque: "Página de entrada da campanha de anúncio registrada no contato." },
};

const BLOCOS: Record<string, TextoInfo> = {
  "conversas por atendente": { oque: "Mostra qual pessoa da equipe respondeu cada conversa no dia. Quando só houve resposta pelo celular da empresa, aparece como Respondida pelo celular (sem identificação), porque o celular não identifica quem respondeu. Quando ninguém da equipe respondeu, aparece como Sem resposta da equipe. Para medir a carga de cada pessoa, o mais justo é olhar Atendimentos." },
  "novos leads": { oque: "Contatos novos no período.", como: "Cada contato novo conta 1. Contatos importados em lote não contam como novos leads. Compara com o período anterior de mesmo tamanho.", fonte: CRIADO },
  "conversas realizadas": { oque: "Igual à coluna do Relatório diário, somada no período.", como: "Mesma regra da coluna.", fonte: MSG },
  "tmr": { oque: "Tempo médio até a primeira resposta.", como: "Média dos atendimentos do período que têm esse tempo; o rodapé mostra quantos entraram.", fonte: INICIO, aviso: "Atendimentos sem esse tempo ficam fora da média." },
  "tma": { oque: "Tempo médio de atendimento.", como: "Média dos atendimentos do período que têm esse tempo; o rodapé mostra quantos entraram.", fonte: INICIO, aviso: "Atendimentos sem esse tempo ficam fora da média." },
  "leads por dia": { oque: 'Novos leads por dia, separados em "Vindos de ADS" e "Sem campanha".', como: "Mesma regra de Novos leads; ADS = tem campanha de anúncio.", fonte: CRIADO },
  "leads por": { oque: "Novos leads repartidos pelo item escolhido.", como: "Mesma regra de Novos leads.", fonte: CRIADO, aviso: 'Quem não tem o dado aparece como "Sem informação".' },
  "conversas por dia": { oque: "Conversas realizadas por dia, separadas em Usuário do sistema e Bot.", como: "Mesma regra das colunas.", fonte: MSG },
  "principais campanhas": { oque: "Contatos por campanha de anúncio.", como: "Contatos do período com campanha de anúncio, pelo nome da campanha.", fonte: CRIADO },
  "atendimentos por canal": { oque: "Atendimentos por canal de entrada.", como: "Cada atendimento iniciado no período conta 1 no seu canal.", fonte: INICIO, aviso: "Costuma ser menor que Conversas realizadas: aqui cada atendimento conta uma vez; em Conversas, ele conta em cada dia com mensagem." },
  "consultas com data no periodo": { oque: "Cards com data da consulta dentro do período, e a soma dos valores.", como: 'Cada card conta 1; valor = soma do campo "Valor da consulta" do card.', fonte: "Pela data da consulta registrada no card.", aviso: "Card sem valor não entra na soma." },
  "procedimentos com data no periodo": { oque: "Cards com data do procedimento dentro do período, e a soma dos valores.", como: 'Cada card conta 1; valor = soma do campo "Valor" principal do card.', fonte: "Pela data do procedimento registrada no card.", aviso: "Card sem valor não entra na soma." },
  "agendamentos e vendas": { oque: "Lista dos cards contados nos dois blocos de consultas e procedimentos.", como: "Um card por linha, mesmo se tiver consulta e procedimento no período.", fonte: "Pela data da consulta ou do procedimento.", aviso: "O total de linhas pode ser menor que a soma dos dois blocos." },
  "agendamentos": { oque: "Consultas (amarelo) e procedimentos (verde) no calendário.", como: "Cada card aparece no dia e na hora da sua data.", fonte: "Pela data da consulta e pela data do procedimento do card." },
  "itens agendados": { oque: "Contatos com consulta marcada.", como: "Contatos cujo card tem data da consulta preenchida.", fonte: "Pela data da consulta.", aviso: "Mostra só cards com data da consulta preenchida (filtro fixo)." },
};

export function textoColuna(titulo: string): TextoInfo | null {
  const k = norm(rotuloCampanha(titulo));
  if (PENDENTES.has(k)) return null;
  return COLUNAS[k] ?? null;
}

export function textoBloco(titulo: string): TextoInfo | null {
  const k = norm(titulo);
  if (PENDENTES.has(k)) return null;
  if (BLOCOS[k]) return BLOCOS[k];
  if (k.startsWith("leads por ") && k !== "leads por dia") return BLOCOS["leads por"];
  return null;
}

/** Texto automático para blocos novos do construtor. */
export function textoAutomatico(medida: string, fonte: string, campo?: string | null, campoData?: string | null): TextoInfo {
  return { oque: `${medida} de ${fonte.toLowerCase()}${campo ? `, agrupado por ${campo}` : ""}${campoData ? `, pela ${campoData.toLowerCase()}` : ""} no período.` };
}

const CAMPANHA: Record<string, string> = {
  "utm origem": "Campanha de anúncio (origem)", "utm_source": "Campanha de anúncio (origem)", "utm source": "Campanha de anúncio (origem)",
  "utm campanha": "Campanha de anúncio (nome)", "utm_campaign": "Campanha de anúncio (nome)", "utm campaign": "Campanha de anúncio (nome)",
  "utm url de referencia": "Campanha de anúncio (página de entrada)", "utm_medium": "Campanha de anúncio (meio)", "utm medium": "Campanha de anúncio (meio)",
  "utm": "Campanha de anúncio",
};

/** Título exibido: troca "UTM" por "Campanha de anúncio". Chaves guardadas não mudam. */
export function rotuloCampanha(r: string): string {
  if (!r) return r;
  const k = norm(r);
  if (CAMPANHA[k]) return CAMPANHA[k];
  if (/^utm[\s_]/i.test(r.trim())) return `Campanha de anúncio (${r.trim().replace(/^utm[\s_]+/i, "")})`;
  return r;
}

export const AVISO_INCOMPLETO = "Alguns dias deste período podem estar incompletos.";

const MEDIDA_TXT: Record<string, string> = { contagem: "Quantidade", soma: "Soma", media: "Média", indicador: "Indicador" };
const FONTE_TXT: Record<string, string> = { contato: "contatos", atendimento: "atendimentos", card: "cards", utm: "campanhas de anúncio" };

/** Texto do bloco: dicionário ou, na falta, o automático do construtor. Nunca vazio. */
export function textoBlocoOuAuto(c: { titulo: string; medida?: string; fonte?: string; dimensao?: { campo: string } | null }): TextoInfo {
  return textoBloco(c.titulo) ?? textoAutomatico(MEDIDA_TXT[c.medida ?? "contagem"] ?? "Quantidade", FONTE_TXT[c.fonte ?? "contato"] ?? "registros", c.dimensao?.campo ?? null);
}
export function textoColunaOuAuto(titulo: string): TextoInfo {
  return textoColuna(titulo) ?? { oque: `${rotuloCampanha(titulo)} de cada linha da tabela, no período.` };
}
