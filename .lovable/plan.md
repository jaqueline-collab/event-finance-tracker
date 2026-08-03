# Modo "Visualizar como Parceiro" (admin)

## O que muda para você

- Na tela de gestão de parceiros, cada parceiro ganha um botão **"Ver como este parceiro"**.
- O botão abre a área do parceiro real, exatamente como aquele parceiro a enxerga, com uma faixa fixa no topo: *"Visualizando como: Rabbit Agency — modo admin, somente leitura"* e um botão **Sair do modo**.
- A escolha é sempre por empresa parceira, nunca por pessoa/e-mail.
- Só quem é da equipe interna consegue usar. Se um parceiro tentar forçar a URL, o servidor recusa.
- Nada pode ser gravado nesse modo: a tela do parceiro já é somente leitura e nenhuma ação de escrita é adicionada.

## Como funciona por dentro

1. `painelParceiroSchema` passa a aceitar um campo opcional `verComoParceiroId`.
2. `getPainelParceiro` (mesma função, mesmo cálculo):
   - sem `verComoParceiroId` → comportamento atual (`parceiro_do_usuario()`);
   - com `verComoParceiroId` → valida `is_equipe_interna()`; se falso, erro de acesso negado. Se verdadeiro, usa esse `parceiroId`.
   - O toggle continua vindo do banco: `mostrar_valores_cliente` do parceiro visualizado (leitura direta da coluna, equivalente ao que `parceiro_ve_valores()` faz para o login do parceiro). Nenhum campo de custo, margem ou lucro entra no payload em nenhum caso.
   - Nenhum ramo alternativo de montagem de dados: clientes, movimentos e valores seguem o mesmo código.
3. `/parceiro` ganha um search param validado `como?: string`, repassado à função de servidor; quando presente e o papel for interno, renderiza o banner fixo com botão que volta para `/gestao-parceiros`.
4. `__root.tsx`: o redirecionamento forçado de parceiros já ignora `/parceiro`; admin acessando `/parceiro?como=...` continua com o shell interno normal.
5. `gestao-parceiros.tsx`: botão `Link` para `/parceiro` com `search={{ como: p.id }}` em cada card de parceiro.

## Validação de segurança (pontos 5 e 6)

Depois de implementado, executo com dados reais e mostro o payload:

- Toggle **desligado** em um parceiro: confirmo que o retorno não traz `mensalidade`, `acompanhamento`, `itens`, nem `totalCarteira`.
- Toggle **ligado** (Rabbit Agency): confirmo que traz valores cobrados e que não existe nenhuma chave de custo WTS, margem ou lucro.
- Também confirmo que chamar com `verComoParceiroId` a partir de um login de parceiro é rejeitado.
