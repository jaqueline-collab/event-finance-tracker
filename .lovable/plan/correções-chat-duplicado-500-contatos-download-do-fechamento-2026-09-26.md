# Correções: chat duplicado, 500 contatos, download do fechamento, "Apresentar ferramenta"

Nenhum cálculo oficial é alterado. Nenhum dado é apagado.

## 1. Chat só no site público, sem duplicação
- Remover o botão antigo "Fale no Chat" (WhatsAppFloat) de: página inicial, Parceiros, Blog (lista e artigo) e Perguntas frequentes; apagar o componente.
- Tirar o script do widget do cabeçalho geral do app e carregá-lo só quando a página for pública (início, Parceiros, Blog, Perguntas frequentes). Ao entrar numa tela interna, a bolha é escondida/removida.

## 2. Fim do "500 contatos" inventado
Na tela de Clientes (cálculo em tempo real do cadastro/edição):
- Franquia de contatos vem só do plano; sem valor definido conta como 0 e aparece o aviso "Franquia de contatos não configurada no plano".
- Mesmo tratamento para outros valores chutados no mesmo cálculo: usuários inclusos (hoje assume 3).
- Também remover os 500 automáticos ao escolher plano, ao abrir edição de cliente, no formulário de novo cliente e na troca de plano (usam o valor do plano ou ficam vazios).
- Levantar e listar no resumo final outros "500" parecidos fora dessa tela (ex.: Resumo e formulário de Planos) — sem mexer neles nesta rodada, só reportar.

## 3. Download ao lado do valor do fechamento = PDF de resumo
Na Área do Parceiro, lista de fechamentos:
- O ícone de baixar gera um PDF da competência: parceiro, competência, vencimento, ciclo e tabela de clientes cobertos com valores (detalhado ou só total, conforme a permissão de composição do parceiro — mesma regra do PDF de Clientes).
- Remover todo botão de baixar nota fiscal da lista de fechamentos (linha e parte expandida). NF só na aba "Notas Fiscais".

## 4. "Apresentar ferramenta" com aviso temporário
- Clique mostra o aviso "Este recurso ainda está sendo configurado." e não abre nada. O link fica guardado no código para religar depois.

## Validação
- Site público: só a bolha do widget. Telas internas logadas: sem bolha.
- Cliente com plano sem franquia: sem 500, com aviso.
- Download do fechamento gera o resumo; nenhum botão de NF fora da aba própria.
- "Apresentar ferramenta" mostra o aviso.
- Celular/tablet/computador, claro e escuro; verificação de tipos e 52 testes.

## Detalhes técnicos
- Widget: componente `ChatWidget` montado nas rotas públicas (`useEffect` injeta `<script data-widget="chat-f60065">` uma vez; cleanup esconde `.h-widget*` fora delas). Remover `scripts` do `head` em `__root.tsx`.
- `clientes.tsx` linhas ~105, 209–213, 291, 331, 1206, 1635: `?? 500`/`|| 500`/`?? 3` → `?? 0` ou vazio; flag `franquiaContatosFaltando` para o aviso.
- `parceiro-pdf.ts`: nova `gerarPdfResumoFechamento(...)` com jspdf-autotable; em `parceiro.tsx` trocar chamadas de `baixarNotaFiscal` na lista de fechamentos; manter uso na aba Notas.
- `APRESENTACAO_URL` mantido; botão vira `onClick={() => toast.info(...)}`.
