# "Dados do Elora" dentro do cadastro do cliente

Só reorganização visual. Sem mudar banco, cofre, relatório diário (n8n), `listar-clientes`, fechamentos ou cálculos. Nenhum dado alterado.

## 1. Nova página por cliente
- Endereço novo: `/clientes/{id}/dados-elora` (página independente, não dentro da lista de clientes).
- O endereço antigo `/clientes/{id}/integracao-elora` e links `/configurar-api?cliente=...` passam a levar para o novo.
- Em Clientes, botão "Dados do Elora" em cada cliente — só para equipe interna (some para cliente, parceiro e "Ver como").
- Cabeçalho: "Clientes / {Nome} / Dados do Elora" + chip Conectado / Sem chave / Com erro (usa o último erro gravado).
- Quem não é equipe interna (ou está em "Ver como") é redirecionado.

## 2. Abas (pílulas, mobile-first)
- **Visão geral:** 4 cartões (Estrutura, Contatos, Atendimentos, Cards) com "Em breve" e barra vazia, sem números inventados; cartão "Avisos" ("Sem avisos"); cartão lateral "O que sincronizar" com interruptores desabilitados "Em breve", campo "Histórico desde" (salva como hoje), botões "Sincronizar agora"/"Reprocessar tudo" desabilitados; aviso fixo "Somente leitura. Nada é alterado no Elora."
- **Conexão:** cartão Credencial atual (cofre, últimos 4, data, Testar, Trocar) + endereço da conta editável, interruptor Ligada/Desligada e último erro.
- **Canais:** cartão atual; nome em destaque, número formatado `(31) 99086-1102`, ID pequeno embaixo.
- **Estrutura e campos:** esquerda = lista de painéis + "Contatos (campos)"; direita = tabela Campo / Tipo / Estado ("Ativo") / Apelido na página / Mostrar. Inclui também "Sequências da conta". Mesmas leituras da API de hoje.
- **Painel do cliente:** interruptor "Incluído no relatório diário" no topo + todos os demais cartões atuais (classificações, widgets de Resultados etc.) com o mesmo comportamento.

## 3. `/configurar-api` vira administração geral
- Sai a grade de chips e o painel embutido do cliente.
- Fica: Cofre de chaves (Migrar / Apagar antigas) e histórico de uso.
- Novo: tabela de clientes com integração (Cliente, Estado, Canais ligados, "Abrir Dados do Elora"), com busca por nome. Menu igual.

## Detalhes técnicos
- Rota `src/routes/clientes_.$id.dados-elora.tsx` (URL `/clientes/$id/dados-elora`, fora do layout da lista); a antiga vira `beforeLoad` redirect.
- `configurar-api-cliente.tsx` e `dados-elora-cliente.tsx` divididos em seções exportadas (ConexaoSecao, CanaisSecao, EstruturaSecao, PainelClienteSecao, VisaoGeralSecao) reaproveitando hooks e server functions atuais; nenhuma função de servidor nova além de, se necessário, uma leitura de resumo (estado + canais ligados) para a tabela admin, protegida por `requireSupabaseAuth` + `is_equipe_interna()`.
- Guarda de acesso via `useCurrentUserAccess` (sem trocar a tela inteira por "Carregando" após a primeira leitura).
- Formatação de telefone em função pura com teste.
- Testes: acesso negado a cliente/parceiro/"Ver como"; redirect da rota antiga; formatação de telefone; suíte atual inteira. Conferência no Dr. Ricardo Assumpção (Conexão, Canais, Estrutura) em 390/834/1440. Não publicar sem pedido.
