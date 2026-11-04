# Etapa 1 do banco por cliente: cofre de chaves, canais permitidos e histórico

Adoto o documento enviado como especificação. Nenhum fechamento, movimento, cálculo, sincronização de contatos, painel Resultados ou relatório diário (n8n) muda de comportamento.

## Ordem de execução
1. Pedir o segredo `ELORA_CRED_MASTER_KEY` (32 bytes em base64) pelo formulário seguro. Nada roda antes dele existir.
2. Uma migração única:
   - `elora_credenciais` (cliente_id PK/FK cascade, chave_cifrada, versao_chave, ultimos4, datas). RLS ligado, sem policy, REVOKE de anon/authenticated, GRANT só a service_role.
   - `elora_credenciais_uso` (log com check de evento). SELECT só `is_equipe_interna()`; escrita só service_role.
   - `elora_integracao_contas.api_key` passa a aceitar vazio (coluna não é apagada).
   - `elora_dados_config` e `elora_dados_canais_permitidos`: tudo só para `is_equipe_interna()`.
3. `src/lib/credenciais.server.ts`: AES-256-GCM (Web Crypto), `cifrarChave`, `decifrarChave`, `gravarChaveElora`, `obterChaveElora` (fallback para a coluna antiga com aviso no servidor).
4. Refatorar `src/lib/integracao-elora.functions.ts` e `src/routes/api/public/relatorio-diario/listar-clientes.ts` (mesmo contrato do n8n, registra `leitura_automacao`, comentário de aposentadoria). Tela mostra só "••••1234".
5. `migrarChavesParaCofre` (idempotente, confere decifrando) e `apagarChavesLegadas` (só onde bate, com confirmação). Botões em `/configurar-api`, só equipe interna.
6. Tela de integração do cliente (`clientes_.$id.integracao-elora.tsx`): estado do cofre, "Trocar chave", "Testar conexão" pelo cofre.
7. `listarCanaisElora` (GET /v1/channel) e seção "Dados do Elora": Credencial, Canais permitidos (interruptores; sem canal = nada sincroniza), Histórico desde, aviso "Somente leitura", cartões de sincronização desativados "Em breve".

## Testes
- Criptografia: ida e volta, adulteração falha, chave mestra errada falha, IVs diferentes.
- RLS: ninguém lê `elora_credenciais` pela API; só equipe interna lê as outras três; cliente A não vê cliente B.
- Ajustar `integracao-elora-rls.test.ts` para o cofre; todos os testes atuais passam.
- Conferir com o Dr. Ricardo Assumpção: migrar a chave, testar conexão, listar canais.

## O que você fará depois
- Preencher o segredo no formulário.
- Clicar "Migrar chaves para o cofre"; validar cada cliente; só então "Apagar chaves antigas".
