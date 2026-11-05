# Gravar o relatório separado + fonte de dados por cliente

## 1. Backup e gravação (22/09 a 03/10, 8c0ojhr2)
- Criar `elora_relatorio_diario_backup`: as mesmas colunas de `elora_relatorio_diario` (o id original incluído), mais a data e o motivo do backup. Só o servidor acessa.
- Copiar as 12 linhas do n8n (25 e 26/09) e conferir campo a campo contra as originais. Se alguma diferir, paro sem gravar.
- Gravar as linhas separadas dos 12 dias, em uma única operação no banco (vai inteira ou não vai):
  - tirar as 12 linhas antigas de 25 e 26/09, que ficam guardadas no backup;
  - gravar as linhas por dia + canal + atendente + equipe, com as 5 colunas padrão e o suporte interno já descontado; colunas de cards ficam 0; estimado = não;
  - as outras colunas (conversas_usuario_novos e conversas_origem_canal) ficam 0, porque o motor ainda não as calcula.
- Conferir depois de gravar: ler de volta e somar por dia; tem que dar o calculado (22/09 = 70/1/69 etc.).
- Mostrar a tabela final gravada e a consulta de restauração, pronta mas não executada: apagar as linhas gravadas desses 12 dias e devolver as 12 do backup.

## 2. Fonte dos dados por cliente (tirar jvu3dzqk do código)
- Nova coluna na configuração do cliente: fonte dos dados, "automática" (padrão: usa o espelho quando a carga estiver completa) ou "antiga". O Dr. Gean (jvu3dzqk) fica em "antiga".
- Trocar a lista fixa no código por essa leitura, nos dois lugares que usam hoje: a escolha da fonte e o botão "Sincronizar agora".
- Testes:
  - cliente "antiga" nunca usa o espelho, mesmo com a carga completa;
  - cliente "automática" com carga completa usa o espelho;
  - o painel do Dr. Gean continua lendo das tabelas antigas, com os mesmos números de antes da troca (comparo os números antes e depois).
- Não mudo nada do que ele vê.

## 3. Roteiro
- Registrar na Fase 3 (visão Matriz) a tela de edição só para a super admin: lista global de suporte interno e, por cliente, o mapa de equipe e os atendentes ignorados.

## Fora
- Não publicar. Parar e mostrar.
