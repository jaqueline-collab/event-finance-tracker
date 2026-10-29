# Novo visual interno inspirado no Martz

Mudança só de aparência nas telas internas (painel da equipe, Área do Parceiro e Área do Cliente). Nenhum cálculo, permissão, fechamento ou dado é alterado.

## O que muda

**1. Menu lateral mais limpo**
- Fundo claro e liso, sem bordas pesadas; itens com mais espaço entre si e ícones finos.
- Grupos com títulos pequenos em cinza: **MONITORAR** (Dashboard, Clientes, Configurar API), **FINANCEIRO** (Fechamento Mensal, Financeiro, Funil) e **CONFIGURAR** (Planos, Parceiros, Usuários, Novidades, Treinamento).
- Item ativo destacado com fundo suave na cor da marca e texto colorido (igual "Indicadores" no Martz).
- No rodapé, botão "Resumir menu" no lugar do botão atual de recolher; recolhido, mostra só os ícones.
- "Ver como" continua no topo do menu, para administradores.

**2. Barra superior nova**
- Logo EloraCRM à esquerda, área de conteúdo com fundo levemente acinzentado.
- À direita: sino de notificações, alternar tema e bloco com nome + cargo + avatar redondo, com menu (Minha conta, Configurações, Sair).

**3. Páginas no padrão do Martz**
- Título grande da página no topo ("Clientes", "Fechamento Mensal"...), com ação principal à direita.
- Abas em formato de pílula logo abaixo do título, quando a página tiver abas.
- Conteúdo dentro de um cartão branco grande com cantos arredondados, título, subtítulo, filtros e botões ("Importar", "+ Novo cliente", "Exportar").
- Cartões de números (receita, clientes, etc.) com rótulo pequeno, valor grande em negrito e variação em verde/vermelho.
- Tabelas mais arejadas, cabeçalho simples e carregamento em barras cinzas.

**4. Cores**
- Mantém a identidade da Elora (amarelo como cor de destaque) em vez do roxo do Martz; botões principais na cor da marca.
- Tema escuro ajustado com o mesmo estilo.

## Ordem de aplicação
1. Menu lateral + barra superior (já muda a sensação de todas as telas).
2. Padrão de título, abas e cartões aplicado em Dashboard, Clientes, Fechamento Mensal e Financeiro.
3. Mesmo padrão na Área do Parceiro e Área do Cliente.
4. Conferência em celular, tablet e computador, temas claro e escuro.

## Detalhes técnicos
- `src/components/app-sidebar.tsx`: reorganizar grupos (manter filtros de permissão `canView`/`isAdmin`, "Ver como" e a ordenação por arrastar), novo estilo de item ativo, rodapé "Resumir menu" com `toggleSidebar`.
- `src/routes/__root.tsx`: novo cabeçalho com logo, `NotificationBell`, `ThemeToggle`, `UserMenu` (nome, cargo, avatar).
- Novo componente `PageHeader` (título, ações, abas pílula) e `SectionCard` reutilizáveis; tokens novos em `src/styles.css` (`--surface-page`, raio maior, sombra suave) para claro e escuro.
- Sem mudanças em funções de servidor, banco ou regras financeiras.
