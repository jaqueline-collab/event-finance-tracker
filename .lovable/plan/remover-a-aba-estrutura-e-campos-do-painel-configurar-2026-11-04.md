# Remover a aba "Estrutura e campos" do painel Configurar

## O que muda para você
- O painel Configurar passa a ter só: **Conexão, Canais, Painel do cliente**.
- Links antigos com `configurar=estrutura` abrem a aba **Conexão**.
- Nenhum botão desativado nem texto "Em breve" sobra em nenhuma tela (hoje o único é o "Mostrar (em breve)" desta aba; a página pública de funcionalidades tem a frase "Em breve mais detalhes", que também troco por texto neutro).
- Nenhum dado é apagado. As leituras de painéis, campos personalizados e etiquetas continuam no servidor para o catálogo da Etapa D.

## O que será apagado (na tela de configuração do cliente)
1. Cartão "Estrutura e campos" inteiro: seletor "Contatos (campos)", lista "Painéis da conta" com botão "Buscar/Atualizar", etapas do painel escolhido, botão "Buscar campos personalizados da conta" e a tabela Campo/Tipo/Estado/Apelido/Mostrar com o interruptor "Mostrar (em breve)".
2. Cartão "Sequências da conta" (fica dentro da mesma aba; só informativo, sem dado gravado).
3. Estado e funções que ficam sem uso: `fonte`, `camposPainel`, `buscandoPaineis`, `buscandoCampos`, `sequencias`, `buscandoSeq`, `selecionarFonte`, `buscarSequencias`, `painelEscolhido`, `camposDaFonte`, e os ícones/imports órfãos (`Layers`, `ListChecks`, `listarCamposDoPainel`, `listarSequenciasCliente` no componente).
4. A aba "estrutura" da lista de abas e do tipo aceito pelo componente.
5. Atalho "Configurar na Área do cliente" na tela de integração passa a abrir `configurar=painel` (era `estrutura`).

## O que fica (e por quê)
- Os filtros da aba "Painel do cliente" usam a lista de campos e de painéis. Como os botões que os buscavam somem, eles passam a ser **lidos automaticamente** ao abrir o painel (junto com usuários e etiquetas, como já acontece). Assim os seletores "Escolha o campo" / "Escolha o painel" não ficam presos em "Busque primeiro" — troco esse texto por "Carregando…" / "Nenhum encontrado".
- Funções de servidor `listarCamposPersonalizados`, `listarPaineisCliente`, `listarCamposDoPainel`, `listarEtiquetasCliente`, `listarSequenciasCliente` permanecem (nenhuma é apagada).

## Detalhes técnicos
- `src/lib/dados-elora.ts`: remover `estrutura` de `ABAS_DADOS_ELORA`; `abaConfigurarDoEndereco("estrutura")` retorna `"conexao"` (alias explícito) em vez de `null`.
- `src/components/configuracao-cliente-sheet.tsx`: renderizar `ConfigurarApiCliente` só para `painel`.
- `src/components/configurar-api-cliente.tsx`: prop `aba` vira `"painel"`; remover linhas 371–506 e o estado/funções listados; carregar `campos` e `paineis` no `useEffect` existente.
- `src/components/integracao-elora.tsx`: link para `configurar: "painel"`.
- Teste: `abaConfigurarDoEndereco("estrutura") === "conexao"` e "estrutura" fora da lista de abas.
- Rodar os testes; parar e mostrar com a lista do que foi apagado. Sem publicar.
