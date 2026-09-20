# Calculadora, planos inativos e apresentação

## 1. Calculadora: campo "Contatos" sai da tela

O campo "Contatos" é removido do formulário da calculadora. A simulação continua usando a franquia de contatos do plano (uso = franquia), então nunca gera excedente de contatos na proposta. Nada muda nos cálculos do restante do sistema.

## 2. Acompanhamento embutido em "Mensalidade base"

O card "Mensalidade base" do resumo passa a somar, sem discriminar, o acompanhamento padrão do plano escolhido (campo "Acompanhamento mensal padrão (R$)" da tela de Planos). Não aparece linha separada em lugar nenhum da calculadora. Plano com acompanhamento zerado: nada muda visualmente.

A margem do parceiro passa a incidir sobre esse custo real (licença + acompanhamento + excedentes), conforme a base escolhida.

## 3. Inativar / Reativar plano

- Nova ação "Inativar" na lista de Planos, ao lado de Editar e Duplicar; em plano inativo a ação vira "Reativar".
- Plano inativo ganha um selo "Inativo" no card e fica com aparência esmaecida, mas continua listado.
- Seletores de escolha passam a mostrar só planos ativos: cadastro de cliente novo, Upgrade/Downgrade/Alterar plano e a calculadora do parceiro. Exceção: se o cliente que está sendo editado já está num plano inativo, esse plano continua selecionado e visível para ele, sem migração forçada.
- Histórico não muda: movimentos, fechamentos, filtros de lista e "Plano atual do cliente" seguem exibindo o plano normalmente.

## 4. Transcrição IA por usuário

O toggle passa a exibir "Transcrição IA — R$ X,XX/usuário". Ativado, a linha do resumo mostra quantidade = usuários configurados e total = valor por usuário × usuários, recalculando quando o campo "Usuários" muda.

## 5. Botão "Apresentar ferramenta"

No cabeçalho da Área do Parceiro, ao lado de "Calculadora", com ícone de link externo, abrindo em nova aba a apresentação do Google Slides indicada — mesmo padrão de "Site" e "Elora App".

## 6. Investigação: templates de proposta no Google Slides (resposta)

Sim, existe conector de Google Slides nesta sessão, separado de Docs/Drive/Gmail/Calendar — a conta "Jaqueline's Google Slides" já está autorizada no workspace (ainda não vinculada a este projeto; vincular é um clique quando decidirmos avançar).

O que ele permite, via a API oficial do Google Slides:

- **Ler** uma apresentação inteira (slides, caixas de texto, IDs dos elementos).
- **Criar** apresentação nova do zero e montar slides (texto posicionado, cores, imagens por URL pública).
- **Mala direta**: substituir marcadores tipo `{{nome_cliente}}` / `{{valor_total}}` em todos os slides de uma vez, e trocar formas marcadas por imagens.
- **Duplicar um modelo** preservando o tema e a identidade visual — isso usa o conector do Google Drive (já autorizado) para copiar o arquivo, e depois o de Slides para preencher. Observação: para copiar um arquivo que o app não criou, a conexão do Drive precisa do acesso amplo ao Drive; hoje ela pode estar no escopo restrito, e nesse caso basta reautorizar com o escopo maior.
- **Gerar miniatura** de cada slide (imagem PNG) para pré-visualizar a proposta dentro do Elora.
- As duas contas (Slides e Drive) precisam ser a mesma conta Google dona do modelo.

Limitações a considerar no desenho: a API não cria nem altera temas — por isso o caminho recomendado é manter um modelo pronto no Slides com marcadores e apenas copiá-lo e preencher. Exportar em PDF é possível pelo Drive. Imagens usadas precisam estar em URL pública.

Desenho sugerido (só para sua decisão, não implementado agora): você mantém um modelo de proposta no Slides com marcadores; a calculadora ganha "Gerar proposta", que copia o modelo, preenche nome do cliente, itens, total e margem, e devolve o link da apresentação pronta (e opcionalmente o PDF) para o parceiro. Nesta etapa, o botão "Apresentar ferramenta" continua sendo só o link fixo.

## Detalhes técnicos

- `src/lib/types.ts` / `src/lib/mappers.ts` / `src/lib/store.ts`: `Plano.ativo` (default `true`), mapeado de nova coluna `elora_planos.ativo boolean NOT NULL DEFAULT true` (migração aditiva, sem tocar em clientes, fechamentos ou financeiro).
- `src/routes/planos.tsx`: botão Inativar/Reativar (atualiza só a coluna `ativo`), selo "Inativo" e opacidade reduzida no card.
- `src/routes/clientes.tsx`: seletores de plano (cadastro, movimentos de upgrade/downgrade/alterar plano) filtram `p.ativo !== false`, mantendo o plano já vinculado ao cliente em edição. Filtro da lista e exibições de histórico continuam usando a lista completa.
- `src/lib/parceiro.functions.ts` (`getPlanosCalculadoraParceiro`): seleciona também `ativo` e `valor_acompanhamento`; filtra inativos; `PlanoCalculadoraParceiro` ganha `valorAcompanhamento`.
- `src/lib/parceiro.calculadora.ts`: `ConfiguracaoCalculadoraParceiro` perde `contatos` (a simulação usa `contatosInclusos` do plano); `calcularOrcamentoParceiro` passa `valorAcompanhamento` do plano ao cliente simulado e devolve `mensalidadeBase = licença + acompanhamento`.
- `src/routes/parceiro.tsx`: remove o campo Contatos; rótulo do toggle de transcrição com o valor por usuário; resumo usa a mensalidade base já somada; botão "Apresentar ferramenta" no cabeçalho, com `target="_blank" rel="noreferrer"`.
- Testes em `src/lib/__tests__/calculadora-parceiro.test.ts`: acompanhamento embutido na mensalidade base, transcrição escalando por usuário, ausência de campo de contatos.

## Validação

- "Contatos" ausente da calculadora.
- Trocar de plano: "Mensalidade base" já inclui o acompanhamento padrão, sem linha separada; plano com acompanhamento 0 sem mudança.
- Inativar um plano: some dos seletores (cliente novo, troca de plano, calculadora), continua no histórico e no "Plano atual" de quem já usa; Reativar devolve.
- Transcrição IA ligada: linha escala ao mudar "Usuários".
- "Apresentar ferramenta" abre o link correto em nova aba.
- 390 / 834 / 1440 px, temas claro e escuro.
