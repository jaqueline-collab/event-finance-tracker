# Relatório diário: nova estrutura de dados, hierarquia, paginação e Social Seller

Segue o documento enviado. Só o Relatório diário da Área do Cliente e a rota de gravação mudam.

## 1. Banco e rota de gravação (primeiro)
- Migração aditiva: `conversas_usuario_novos`, `conversas_origem_canal`, `conversas_total_dia` (inteiros, não nulos, padrão 0) em `elora_relatorio_diario`.
- `registrar.ts`: os três campos entram no schema como contadores obrigatórios e no upsert. O `onConflict` fica como está.
- Importante: a partir daí, a automação (n8n) precisa enviar os três campos, senão a gravação é recusada com erro 400.
- `RelatorioDiarioLinha` e `getRelatorioDiarioCliente` passam a trazer os três campos. Os tipos do banco são regenerados.

## 2. Atendente
- Atendente em branco sai da lista do filtro Atendente.
- Nova dica da coluna: "Atendente humano responsável pela conversa."
- Duas colunas novas: "Origem Canal" e "Novas conversas no dia", com as dicas do documento.
- As linhas antigas com "Automação"/"Origem Canal" ficam como estão.

## 3. Conversas do Usuário
- A célula mostra "novos - total". O Total soma cada lado separadamente e usa o mesmo formato. Na exportação, os dois números vão em colunas separadas.

## 4. Agrupar quando uma coluna está oculta
- Canal, Equipe ou Atendente desligados em "Colunas": as linhas do mesmo dia que só diferem nessas colunas viram uma linha só, com os números somados.
- Os filtros continuam usando os valores originais. Exportar usa a tabela já agrupada, como aparece na tela.

## 5. Paginação
- 7, 15, 30 ou 60 linhas por página (padrão 15), com os mesmos botões anterior/próxima do outro quadro de tabela. Volta à página 1 quando filtros ou colunas mudam. O Total continua somando o período todo.

## 6. Data fixa
- A coluna Data fica presa à esquerda na rolagem lateral, junto com o cabeçalho e o Total.

## 7. Atalho ADS
- Um interruptor "ADS" ao lado do botão Colunas liga ou desliga de uma vez as 3 colunas "/ADS". Fica travado quando a visualização está congelada.

## 8. Social Seller (preenchimento manual)
- Nova tabela `elora_relatorio_social_seller`, exatamente como no documento. O cliente, a equipe interna e o parceiro com painel liberado podem ler. Ninguém grava direto pelo navegador.
- Função de servidor `salvarSocialSeller`: exige login, confere `is_equipe_interna()` e só depois grava por (cliente, data, canal, equipe). Valor: inteiro de 0 a 1.000.000.
- Coluna "Social Seller" em "Colunas". O valor pertence ao dia + canal + equipe, então:
  - Com Atendente oculto, cada linha mostra o valor. A equipe interna vê o lápis para editar ali mesmo.
  - Com Atendente visível, várias linhas têm o mesmo dia, canal e equipe. O valor aparece só uma vez nesse grupo, para não ser somado em dobro, e o lápis só aparece com Atendente oculto.
  - Quando mais colunas estão ocultas, os valores são somados e só dá para ler, porque a edição precisa do dia + canal + equipe exatos.
- Atenção: os logins do parceiro Rabbit **não** são equipe interna. Seguindo o documento, eles verão os valores, mas não poderão editar. Se a Rabbit também precisar editar, é só avisar que eu incluo parceiros com painel liberado.

## Validação
- Typecheck e build sem erros. Enviar à rota uma chamada de teste com os campos novos e depois apagar os dados de teste.
- Na tela do Dr. Ricardo: alternar colunas e o atalho ADS, arrastar colunas, conferir a Data fixa, paginar em 7/15/30/60, conferir as somas ao ligar e desligar Canal/Equipe/Atendente, editar um Social Seller e recarregar a página para ver se ficou salvo (depois apagar o teste).
- Celular (390), tablet (834) e computador (1440), nos temas claro e escuro.
