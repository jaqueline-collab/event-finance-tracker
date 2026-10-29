# Novo interior do EloraCRM: menos repetição, mais clareza (inspirado no Martz)

Duas frentes: (A) arrumar a organização das telas e tirar o que está repetido; (B) novo visual interno, mantendo o amarelo da Elora. Nenhum cálculo, fechamento, lançamento do Lucas, setup ou permissão é alterado.

## A. Levantamento: o que está repetido ou confuso hoje

| Onde | Problema | Proposta |
|---|---|---|
| Configurar API (menu) x Integração dentro do cliente | Duas telas para a mesma configuração | Uma só: aba **Integração** dentro da ficha do cliente; "Configurar API" vira lista de status (quem está conectado, último erro) que abre essa aba |
| Fechamento Mensal x Financeiro x Notas Fiscais | Valores do mês em três lugares, nomes parecidos | Agrupar em **Financeiro** com abas: Fechamentos · Lançamentos · Notas Fiscais |
| Ficha de Clientes (tela enorme) | Muitas informações na mesma página | Abas: Dados · Plano e recursos · Movimentos · Integração · Acessos |
| "Ver como" no menu + página Ver como | Duas entradas para a mesma coisa | Só a busca no topo do menu |
| Menu Configurações escondido no rodapé | Planos, Parceiros, Usuários difíceis de achar | Grupo próprio no menu |
| Área do Parceiro | Botões de cima e de baixo misturados (Site, App, Treinamento, Clientes, Financeiro...) | Menu lateral igual ao interno, com só as seções do parceiro |
| Área do Cliente | Abas Dash · Relatório diário · Conta · Minha equipe + menu "Painel" | Menu lateral com as mesmas seções, sem duplicar nas abas |
| Endereços antigos (/cliente) | Só redirecionam | Mantidos (não atrapalham), sem aparecer no menu |

Nada é apagado de dados: só muda onde cada coisa aparece. Telas antigas continuam funcionando por redirecionamento.

## B. Novo visual (estilo Martz, cores Elora)

- **Cores**: fundo #fafafa, superfícies #f1f1f4, texto #1a1a1a, destaque amarelo #f5c518 (botão principal, item ativo do menu). Tema escuro equivalente.
- **Menu lateral**: claro, itens espaçados, ícones finos, grupos **MONITORAR** (Dashboard, Clientes, Funil), **FINANCEIRO** (Fechamentos, Lançamentos, Notas Fiscais), **CONFIGURAR** (Planos, Parceiros, Usuários, Novidades, Treinamento). Item ativo com fundo amarelo suave. Rodapé com "Resumir menu".
- **Barra superior**: logo à esquerda; sino, tema e nome + cargo + avatar à direita com menu (Minha conta, Sair).
- **Páginas**: título grande, ação principal à direita, abas em pílula, conteúdo num cartão branco grande; cartões de números com valor grande e variação verde/vermelha; tabelas mais arejadas.

## Ordem de entrega (uma etapa por vez, com sua aprovação visual)
1. Cores, menu lateral e barra superior (muda todas as telas de uma vez).
2. Financeiro unificado e Integração dentro do cliente.
3. Ficha do cliente em abas e novo padrão em Dashboard/Clientes.
4. Área do Parceiro e Área do Cliente no mesmo padrão.
5. Conferência em celular, tablet e computador, claro e escuro.

## Detalhes técnicos
- Tokens em `src/styles.css` (claro/escuro); componentes `PageHeader` e `SectionCard`.
- `app-sidebar.tsx`: novos grupos, mantendo `canView`/`isAdmin`; remover rota de menu duplicada de Ver como.
- `financeiro.tsx` passa a hospedar abas com o conteúdo hoje em `resumo.tsx` (componentes extraídos sem mudar cálculos); `/resumo` redireciona.
- `configurar-api.tsx` vira lista de status apontando para `clientes_.$id.integracao-elora`.
- `clientes.tsx` dividido em componentes por aba, sem mudar funções de servidor.
- Sem migrações; testes existentes de cálculo rodados a cada etapa.
