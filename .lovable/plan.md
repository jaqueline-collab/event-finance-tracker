# Endereço da conta: domínio raiz + sufixo por tipo de chamada

## O que confirmei no código

Sim, sua leitura está certa. Existe um único ponto que monta a URL final:

- `lerApiElora(baseUrl, apiKey, caminho)` faz literalmente `url = baseUrl + caminho`.
- Todas as chamadas passam o mesmo valor salvo em "Endereço da conta": contatos, campos personalizados, painéis, campos de painel, sequências, usuários, etiquetas, conversas/classificações.
- Hoje o valor salvo na conta que funciona é `https://api.wts.chat/core`, então painéis viram `https://api.wts.chat/core/v2/panel` — caminho inexistente, e a resposta de recusa foi lida como "a conta recusou o acesso".

Ou seja: o diagnóstico anterior de "falta de permissão na chave" era consequência do endereço errado, não a causa.

Valores salvos hoje (só duas contas):

- `jvu3dzqk` → `https://api.wts.chat/core` (ligada)
- `oxi9byp0` → `https://app.eloracrm.com.br` (desligada, e este é o endereço do site, não da API)

## O que muda

1. "Endereço da conta" passa a guardar apenas o domínio raiz (ex.: `https://api.wts.chat`). O campo ganha o exemplo novo e uma explicação curta de que não se coloca `/core` no fim.
2. Ao salvar, o sistema limpa sozinho o que for sufixo de serviço no fim do endereço (`/core`, `/crm`, `/chat`) e barras sobrando — quem colar o endereço completo continua salvando certo.
3. Cada chamada passa a dizer de qual serviço ela é, e o prefixo é acrescentado internamente:
   - contatos e campos personalizados de contato → `/core`
   - painéis, etapas e campos de painel → `/crm`
   - sequências e conversas/classificações → `/chat`
   - usuários e etiquetas → `/core` (é onde respondem hoje com a chave atual)
4. "Testar conexão" continua usando a chamada de contatos, agora sob `/core`, e a mensagem de erro passa a mostrar o endereço completo tentado, para diagnóstico rápido.

## Migração do que já está salvo

Automática, sem reconfiguração manual — são duas contas e o padrão é claro:

- `jvu3dzqk`: `https://api.wts.chat/core` → `https://api.wts.chat`.
- `oxi9byp0`: fica como está (`https://app.eloracrm.com.br`), porque não é endereço de API e nenhuma remoção de sufixo conserta isso. A integração já está desligada; você reconfigura quando quiser ativá-la, e a tela avisa que o endereço não é o da API.

A limpeza de sufixo também roda no salvamento, então qualquer conta futura fica normalizada mesmo que alguém cole o endereço com `/core`.

## Detalhes técnicos

- `lerApiElora` ganha um parâmetro de serviço (`core` | `crm` | `chat`) e monta `raiz + "/" + servico + caminho`; a raiz é normalizada em tempo de execução (remove barra final e um sufixo `/core|/crm|/chat` residual), de modo que contas ainda não migradas não quebram.
- `salvarIntegracaoCliente` normaliza `base_url` antes de gravar; o schema Zod segue exigindo URL válida.
- Atualização das duas linhas existentes via ferramenta de dados (é alteração de dados, não de schema) — nenhuma migração de banco é necessária.
- Sem mudança em RLS, GRANTs ou no fluxo `requireSupabaseAuth` + `is_equipe_interna()`; a chave continua só no servidor.
- Textos de ajuda ajustados em `src/components/integracao-elora.tsx` (placeholder `https://api.wts.chat`).

## Validação

- Com a conta `jvu3dzqk` migrada: testar conexão, buscar campos, buscar painéis, buscar sequências, buscar usuários/etiquetas e buscar classificações — conferindo qual passa a responder e qual ainda recusa (aí sim seria permissão da chave).
- Sincronizar contatos duas vezes e confirmar que não duplica.
- Suíte de testes e build íntegros.
