## Contexto

A planilha enviada (`Controle_de_Clientes_1782779010-2.xlsx`) traz o estado vigente no Monday. Comparei linha a linha com o banco e há divergências em 5 clientes — algumas confirmam hipóteses anteriores, outras conflitam com instruções recentes. Preciso da sua decisão em 2 pontos antes de aplicar.

## Divergências encontradas

### 1. Majestic Transplante Capilar (setup 17/03/2026)
Monday (sistema R$ 389,94 + assessoria 250 = MRR 639,94):
- Licença 17/03: **1 canal sem Z-API** (R$ 199,99) + 1 login
- Canal Extra 17/03: 1 canal **com Z-API** (R$ 99,98)
- Login Extra 17/03: +1 login (R$ 29,99)
- Login Extra **15/04: +2 logins** (R$ 59,98) ← este é o famoso delta de R$ 59,98

Banco hoje: 2 whats + 1 messenger + 1 zapi + 4 users (sistema R$ 329,96 antes do 15/04).
**Correção:** o movimento de 15/04 (+2 logins) já existe no banco — só faltava recalcular. Após a correção do snapshot histórico, o abril já bate. Mas o setup tem 1 canal a mais (messenger) que não consta no Monday. Proposta: remover o `canais_messenger` do cadastro (passa para 2 whats + 0 msg + 1 zapi).

### 2. Instituto Murilo Fischer (setup 06/02/2026)
Monday (sistema 559,91 + 600 = 1.159,91):
- Setup 06/02: licença 1 canal + 1 zapi + **1 login**
- 06/02 +2 canais extra sem zapi (R$ 59,98)
- 07/03 −1 canal (−29,99)
- 11/03 +1 login Claudia (29,99)
- 20/03 −1 canal (−29,99)
- 08/04 +1 login SDR (29,99)
- 28/04 +2 canais com 2 zapi (199,96)
- **09/06 +1 login SDR (29,99)** ← Monday diz 09/06, no banco está em **22/06**

Banco hoje: 3 whats + 0 insta + 1 msg + 3 zapi + **6 logins**. Composição total casa em canais/zapi, mas o Monday acumula **4 logins**, não 6. O banco partiu de 3 logins no setup; Monday partiu de 1.

**Decisão necessária:**
- (a) Manter 6 logins (sua palavra prevalece) e ajustar movimento para 22/06; ou
- (b) Alinhar ao Monday: setup com 1 login, total atual 4 logins, movimento em 09/06.

### 3. Cecilia Bunn
Monday: setup **09/06/2026**. Você me passou **12/06/2026** e foi assim cadastrada.
**Decisão necessária:** mantenho 12/06 (sua instrução) ou troco para 09/06 (Monday)?

### 4. Camila Ahrens (setup 06/05/2026)
Monday (sistema 329,96 + 250 = 579,96):
- Setup 06/05: licença completa
- 06/05 +1 canal extra **sem Z-API** (29,99)
- 06/05 +1 login extra (29,99)

Banco hoje: data_inicio 12/05, 1 whats + 1 insta + 1 msg + 1 zapi + 4 users.
**Correção:** ajustar data_inicio para 06/05; canais 1 whats + 1 insta + 1 zapi (total 2 canais, sem messenger) + 2 logins iniciais (1 license + 1 extra). Hoje está sobrando 1 messenger e 2 logins.

### 5. Érico Servano (setup 06/05/2026)
Monday: licença básica (1 canal + 1 zapi + 1 login + assessoria 250) = R$ 519,98.
Banco: data_inicio 07/05, 3 logins, 1 msg em vez de 0 extras. Sobra messenger e 2 logins.

### 6. INTEP's Treinamentos (setup 24/03/2026)
Monday: setup + 3 logins extra em 24/03 + 1 login em 13/04 = 4 logins extra (5 totais com a license) + sistema 389,94.
Banco: 7 logins + 1 movimento de upgrade em 13/04 (+1). Sobram 2 logins.

## Plano de execução (após sua resposta)

1. **Reset por reconstrução** dos 5 clientes acima: zerar canais/usuários no cadastro para o estado de **setup Monday**, reescrever a sequência de `elora_movimentos` exatamente igual à coluna de subitens, depois aplicar o estado final (canais/usuários) batendo com a soma.
2. **Majestic, Camila, Servano, Intep**: aplicar sem precisar de confirmação adicional (todos têm composição clara).
3. **Fischer / Cecilia**: aplicar conforme sua resposta no item Decisão.
4. **Validação automática** após aplicar:
   - script SQL que reconstrói o sistema MRR de cada cliente somando setup + movimentos e compara com o `MRR Total` do Monday.
   - relatório `/mnt/documents/reconciliacao_v3.csv` listando cada cliente, MRR app, MRR Monday, delta — se vier algo ≠ 0, mostro antes de fechar.
5. Sem mexer em UI nesta rodada — só dados.

## Perguntas que preciso responder antes

1. **Fischer**: mantenho 6 logins / movimento 22/06 (sua instrução anterior) **ou** alinho 100% ao Monday (4 logins, movimento 09/06)?
2. **Cecilia**: setup 12/06 (sua instrução) **ou** 09/06 (Monday)?