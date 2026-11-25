# Instagram deixa de ser patrocinado (Dra. Nathalia, sfwsf3t7)

## O que muda
- Na configuração de Origem da Dra. Nathalia, a lista de patrocinados fica só com **Meta ADS** e **Google ADS**. Instagram passa a contar como **Não patrocinado**.
- O botão **ADS** passa a controlar só as 6 colunas de Meta ADS e Google ADS (nos grupos Contatos novos, Agendamentos e Procedimentos vendidos). As colunas de Instagram continuam visíveis com o botão ADS desligado.
- Nenhuma mudança de código: o botão e as colunas Patrocinado/Não patrocinado já leem essa configuração.

## Passos
1. Retrato "antes" de 17/11: Contatos novos, Agendamentos e Procedimentos vendidos, com Patrocinado, Não patrocinado e Instagram.
2. Atualizar só `origem_patrocinado.patrocinados` em `elora_relatorio_corte_config` para `sfwsf3t7` (`["Meta ADS", "Google ADS"]`) e limpar o cache de cálculo dela.
3. Retrato "depois" de 17/11. Resultado esperado: Contatos novos com Patrocinado -1 e Não patrocinado +1. Em Procedimentos vendidos, a conversa de Instagram desse dia também passa de Patrocinado para Não patrocinado. Os totais ficam iguais.
4. Confirmar que a lista de colunas do botão ADS (`colunasAds`) traz só Meta ADS e Google ADS, e que as colunas de Instagram continuam presentes.
5. Rodar os testes. Nada publicado.
