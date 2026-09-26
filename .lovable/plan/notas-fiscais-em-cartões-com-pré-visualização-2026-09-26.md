# Notas Fiscais em cartões com pré-visualização

A mudança fica restrita à aba **Financeiro → Notas Fiscais** da Área do Parceiro. Nenhum vínculo, valor, permissão ou regra de download será alterado.

## O que muda

1. Transformar cada linha compacta atual em um cartão de documento, com ícone/miniatura, nome do arquivo, competência, quantidade de lançamentos, valor total e botão **Baixar**. Nomes longos podem ser abreviados visualmente, mantendo o nome completo acessível ao passar o mouse e ao tocar/abrir o cartão.
2. Clicar no corpo do cartão abre uma janela de pré-visualização. O botão **Baixar** do cartão continua como atalho direto e não abre a janela.
3. A janela mostra o PDF no navegador, com nome do arquivo, estados de carregamento/erro, botão **Baixar** e opção de fechar sem baixar. Como o envio atual também aceita imagens, exibi-las na mesma janela quando o arquivo for imagem; se o navegador não conseguir mostrar o documento, oferecer o download.
4. Ajustar a disposição dos cartões e da janela para celular, tablet e computador, nos temas claro e escuro; preservar navegação por teclado, foco e rótulos acessíveis.

## Segurança e funcionamento

- Tanto a abertura da prévia quanto os dois botões de download usarão a função autenticada `baixarNotaFiscal` já existente. Ela confere no servidor se a pessoa é da equipe ou pertence ao parceiro da nota antes de buscar o arquivo no Drive. Nenhum link direto para o Drive será exposto.
- O arquivo da prévia será mantido apenas enquanto a janela estiver aberta; ao fechar ou trocar de nota, a URL temporária será liberada. Evitar que uma resposta tardia de uma nota anterior apareça na janela de outra.
- A lista e seus dados continuam vindo do fluxo atual; sem mudanças em banco, servidor, cálculos ou permissões.

## Validação

- Abrir uma nota de um lançamento e outra de vários lançamentos: a prévia aparece sem baixar automaticamente e mostra as mesmas informações do cartão.
- Baixar pela janela e pelo botão do cartão e confirmar que ambos entregam o mesmo arquivo; fechar sem baixar e testar erro/acesso negado.
- Conferir 390 px, 834 px e 1440 px nos temas claro e escuro, inclusive nome longo, teclado e prévia no celular.

## Detalhes técnicos

- Concentrar a mudança visual e os estados de prévia em `src/routes/parceiro.tsx`, reutilizando `Card`, `Button` e `Dialog` existentes. Converter a resposta base64 em `Blob` para uma URL local usada pelo visualizador inline, mantendo `baixarNotaFiscal` como única fonte autorizada do arquivo. Não criar endpoint público nem alterar `src/lib/notas-fiscais.functions.ts`.
