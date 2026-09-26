# Relatório de auditoria completa do EloraCRM

Somente leitura: nenhuma tela, cálculo ou dado vai ser alterado.

## O que será entregue
Um documento (Markdown + PDF, em Arquivos) com as 5 seções pedidas, nesta ordem:

1. **Estrutura e arquitetura** — stack, mapa de todas as telas por área (Gestão interna, Parceiro, Cliente, Configurar API, Treinamento), tabelas por domínio com uma frase cada, onde ficam as regras de acesso e onde algo foge do padrão (ex.: tabelas com acesso por dono antigo `user_id`, funções que usam acesso privilegiado no servidor).
2. **Recursos por área** — para cada área: funcionando / parcial / feito mas nunca validado em produção.
3. **Cálculos financeiros** — MRR, mensalidade, excedentes, acompanhamento e margem com nomes das funções; o que é congelado no fechamento versus calculado ao vivo; histórico de bugs; duplicações (calculadora do parceiro x fechamento real x painel).
4. **Design e UX** — inconsistências visuais, fluxos com cliques demais, problemas em celular/tablet, identidade visual não aplicada (incluindo a página 404 ainda em inglês).
5. **Débitos técnicos e riscos** — bugs abertos, pontos de segurança com menos confiança, testes existentes x áreas sem cobertura, pendências (permissões de usuários na API do Elora, armazenamento de fotos, domínio www aguardando DNS, painel do Cirurgiões Staffs substituído no teste).

Onde não houver certeza, o relatório diz isso explicitamente.

## Como será levantado
- Leitura do código de todas as telas e funções de servidor.
- Consulta ao banco (somente leitura): políticas de acesso, permissões por tabela, volume de dados.
- Verificador de segurança do banco e resultados de varredura.
- Execução dos testes automatizados existentes para listar cobertura.
- Capturas de tela em 390/834/1440 das telas principais para a seção de design.
