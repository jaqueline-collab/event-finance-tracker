# Dash do cliente — Etapa A (layout e visual, sem dados novos)

O documento tem 6 etapas (A a F). Este plano cobre só a **Etapa A**; ao terminar eu paro para você conferir. As etapas B a F vêm depois, cada uma com seu próprio plano (a B começa pelo diagnóstico do Dr. Ricardo, sem criar nada).

Nada muda em financeiro, fechamentos, cofre, relatório diário do n8n, `listar-clientes`, dados ou widgets existentes. Não publico.

## O que você vai ver

1. **Menu lateral da Área do cliente:** Painel, Conta, Minha equipe, Treinamento, Novidades (+ "Acessar o aplicativo" em Links). Conta e Minha equipe saem de dentro do Painel e viram páginas do menu, com o mesmo conteúdo de hoje.
2. **Painel:** as visões ficam como pílulas no topo. "Resultados" continua com os gráficos de hoje. Entra a visão **"Relatório diário"**, mostrando o conteúdo atual dessa aba. As abas internas antigas (Resultados / Relatório diário / Conta / Minha equipe) somem.
3. **Uma só barra fina para a super admin**, no topo:
   - Normal: à esquerda "Visualizando: {cliente}" e "Sair"; à direita "Editar".
   - Em Editar: "Campos do Elora" (desativado, "Etapa D"), "Conexão e canais" (abre o painel lateral que já existe), "+ Gráfico", "Salvar", "Cancelar"; a barra de visões ganha "+".
   - Saem a faixa "Modo configuração", o botão "Configurar" solto, a faixa grande "Visualizando como…" e o botão "Editar" que hoje fica na barra de visões.
   - Cliente, parceiro e equipe comum não veem a barra (o servidor já recusa as gravações).
4. **Cartões de gráfico** com cabeçalho: título, ícone de filtro do próprio cartão e menu "⋯" (Editar, Duplicar, Excluir). O menu, arrastar e redimensionar só aparecem em Editar.
5. **Limpeza:** apagar o código que ficar sem uso e listar os arquivos/trechos apagados.

Tudo com as cores e componentes atuais do app, nos temas claro e escuro, conferido em 390 / 834 / 1440.

## Pontos a conferir comigo

- "Relatório diário" entra como uma **visão fixa do sistema** (não é apagável nem renomeável), ao lado das visões salvas. Na Etapa E ela vira a tabela calculada.
- O ícone de filtro do cartão abre um aviso "Na Etapa F" (sem filtro ainda).
- Um link antigo `?configurar=conexao` passa a abrir o modo Editar já com "Conexão e canais" aberto.

## Detalhes técnicos

- `area-do-cliente.index.tsx`: menu com `aba` = `painel | conta | equipe | treinamento | novidades` (`conta` antigo continua sendo aceito como Painel); conteúdo de Conta e Equipe sai das props de `ResultadosCliente` e vira `TabsContent` próprios. Teste para o mapeamento de `aba`.
- Nova `BarraSuperAdmin` (usa `podeConfigurarArea`); o estado "editando" sobe de `VisoesPainel` para a página, que controla salvar/cancelar via ref/callback.
- `VisoesPainel`: visão fixa "relatorio" renderiza `SecaoRelatorioDiario`; remove botão Editar interno e barra própria de salvar.
- `ResultadosCliente`: remove `Tabs` internas e props `conta`/`equipe`; cartões ganham cabeçalho com `DropdownMenu`; arrasto/redimensionar condicionados a `editando`.
- "+ Gráfico" abre o construtor atual (`ConfigurarApiCliente soGraficos`).
- Rodar a suíte inteira de testes ao final.
