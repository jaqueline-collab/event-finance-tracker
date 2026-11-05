# Princípio "vários clientes, dados incompletos" — registrar e aplicar

## Onde fica registrado
- A estrela-guia só guarda objetivo e métrica (uma linha cada); o princípio não cabe lá sem quebrar o formato. Proposta: registrar as 4 regras como regra permanente do projeto (memória Core + AGENTS.md), aplicada a toda entrega. A estrela-guia não muda. Se preferir mesmo no arquivo da estrela-guia, escrevo lá como nota sua.

## Revisão do que já existe (passo 1, só leitura, lista para você)
Percorrer motor do relatório diário, painel visual, indicadores, espelho, tela de validação, filtros e testes, procurando:
- dimensão ausente que vira bloqueio, erro, bloco vazio ou "—" em vez de "Não definido";
- telas/etapas que exigem mapa de equipe, cards, UTM, etiquetas ou indicadores;
- nomes de pessoa, canal ou cliente no código (achados iniciais: só em testes — "Dr. Ricardo" e "8c0ojhr2" como dados de exemplo; nada no código do app).

## Correções previstas
1. Rótulo único "Não definido" (função pura compartilhada) para canal, equipe, atendente, etiqueta, origem, campanha, etapa e campo personalizado — no relatório, painel, filtros, gráficos e tela de validação. Ex.: Messenger sem equipe e "linha sem canal" passam a mostrar "Não definido". No banco, continua vazio (nada regravado).
2. "Configuração com erro" de indicador sem fonte deixa de bloquear: o indicador fica fora da conta e só a super admin vê um aviso discreto.
3. Cliente sem cards/indicadores/UTM/mapa: os blocos correspondentes somem (sem cartão vazio, sem mensagem). Painel e relatório calculam só as colunas padrão.
4. Mapas, listas e regras com padrão vazio, confirmando que não há valores pré-preenchidos fora do seed por cliente.
5. Testes trocam nomes reais por clientes fictícios e ganham casos: cliente sem nada configurado (sem mapa, sem cards, sem UTM) calcula e renderiza sem erro; dimensão vazia vira "Não definido"; filtro por "Não definido" funciona.

## Entrega
Lista do que foi encontrado e do que mudou, testes passando. Nada gravado no banco, nada publicado.
