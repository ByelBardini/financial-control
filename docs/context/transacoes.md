# Transações — modelo de domínio

> **O que é uma transação, os tipos, sentidos e tags.** Leia isto antes de mexer em qualquer coisa de
> transação/recorrência/parcelamento. Aqui mora o **conceito**; os detalhes de cada camada estão em:
> schema → [database.md](database.md) · endpoints/DTOs → [server-api.md](server-api.md) · UI/telas →
> [client-app.md](client-app.md) · dinheiro → [money.md](money.md) · armadilhas → [gotchas.md](gotchas.md).

## Conceito central
Uma **transação** é uma linha no ledger (tabela `transactions`) — um evento de dinheiro que **entrou ou
saiu** de uma `account`, numa data de **competência** (`occurred_on`, só data, sem hora). **Saldo é
derivado**: não existe coluna de saldo; conta/mês/categoria são somatórios de transações em tempo de query.
Por isso **criar/editar/excluir** uma transação reflete na hora em Dashboard, Contas e Transações (o client
invalida `['transacoes']`+`['accounts']`+`['contas']`+`['dashboard']`).

Toda transação é **escopada por `user_id`** (do token). Dinheiro é **centavos inteiros** (`int64`) na borda
da API; no banco é `NUMERIC(14,2)`, convertido por cast no SQL (`(amount*100)::bigint`) — nunca float. O
`signed_amount` é uma coluna **gerada** (`+amount` p/ income, `-amount` p/ expense).

## Sentido (`direction`)
- **No banco:** `'income'` | `'expense'`.
- **Na API/client:** `'inflow'` | `'outflow'` (`directionView`/`directionDB` mapeiam nos dois sentidos).
- Tinge o valor (`+`/`-`, verde/vermelho) e o ícone na tela. Valor sempre **positivo**; o sinal vem do sentido.

## `kind` (natureza da linha) — coluna `transactions.kind`
CHECK `('standard','installment','transfer')`:
- **`standard`** — transação avulsa "normal" (a maioria). Inclui as ocorrências **registradas de uma
  recorrência** (que são `standard` + `recurring_rule_id` setado — ver abaixo).
- **`installment`** — uma **parcela** de uma compra parcelada. Vem sempre em grupo: N linhas com o mesmo
  `purchase_group_id`, `installment_number`/`installment_total` e `purchase_total_amount`. CHECK
  `tx_installment_coherent` garante que esses campos só existem (e são coerentes) quando `kind='installment'`.
- **`transfer`** — **reservado** (transferência entre contas = dupla entrada com `transfer_group_id`). Não
  implementado ainda (fora de escopo).

> `kind` é a natureza da **linha**; não confunda com os "tipos de lançamento" da UI (abaixo), que são a
> intenção do usuário ao criar. Uma recorrência **não** é um `kind` — é um `standard` ligado a uma regra.

## Tipos de lançamento na UI (`entryKind`: Único / Parcelado / Fixo)
O formulário (`EntryKindSelect`) escolhe **como** a transação é criada. Cada tipo serializa diferente
(`lib/transactionForm.ts` → mutations):
- **Único** → `POST /transactions` (`createTransaction`): 1 linha `standard`.
- **Parcelado** → `POST /transactions/installment-purchases` (`createInstallmentPurchase`): **N linhas
  `installment`** de uma vez (valor **por parcela**, datadas mês a mês a partir de `occurred_on`, "X/N" no
  fim da descrição, `purchase_total_amount = parcela × N`). **Sempre despesa** (some quando o sentido é
  Receita).
- **Fixo (recorrência)** → `POST /recurring-rules` (`createRecurringRule`): cria **só a regra** em
  `recurring_rules` — **um modelo, sem lançar transação**.

## Recorrências (Fixo) = modelo + registro por período
Uma `recurring_rule` é um **template** (conta/categoria/valor/sentido + `frequency`
daily/weekly/monthly/yearly + `start_date`, fim opcional `end_date` **XOR** `max_occurrences`). Ela **não
materializa** ocorrências sozinha (sem agendador). Cada ocorrência é registrada **manualmente**, 1×/período,
pelo botão **"Registrar"** (`POST /recurring-rules/{id}/register` → lança um `standard` com
`recurring_rule_id` setado, `occurred_on = hoje`).

**`isDue`** (vem da `GET /transacoes/recurrences`) diz se a ocorrência do período corrente está **pendente**
— o client só mostra o botão quando `true`. É **derivado das transações** (sem tabela de tracking): o server
olha `MAX(occurred_on)` + `COUNT` das transações ligadas à regra e decide em Go (`isDue`/`periodStart` em
`due.go`), com períodos **alinhados ao calendário** (dia / **semana começando no domingo** / mês / ano;
`interval_count` ignorado na V1; sem backfill de períodos pulados). Excluir a transação registrada faz o
botão voltar. **Cuidado de fuso ao comparar períodos** — ver [gotchas.md](gotchas.md).

## Tags com significado (derivadas no server, single-badge)
A `tag` de cada linha do log **não** é só income×expense — sai de sinais reais por **precedência**
(`transactionTag` em `personality.go`):
1. `kind='installment'` → **Parcelado** (tom `primary`).
2. receita (`income`): recorrente → **Inflow Esperado**; avulsa → **Renda Extra** (tom `secondary`).
3. despesa recorrente (`recurring_rule_id` setado) → **Fixo** (`primary`).
4. despesa avulsa pela `essentialness` da categoria: `essential` → **Sobrevivência** (`error`);
   `discretionary` → **Supérfluo** (`primary`).

`isRecurring` = `recurring_rule_id IS NOT NULL`. Labels/tons são **derivados em tempo de leitura** (nada
disso é persistido) — junto de `dateLabel` ("12 JUN") e `timeLabel` ("12/06"), também puros (transação só
tem data de competência, sem hora).

## CRUD + regras
- `GET/PATCH/DELETE /transactions/{id}` — ler/editar/excluir (hard delete; editar **não troca de conta**).
- Toda escrita guarda **posse** (a conta/categoria precisa ser do usuário; senão 400/404).
- `description` é **NOT NULL não-vazia** no banco (`tx_description_not_blank`) — o client manda fallback
  "Despesa"/"Receita" (`descOrDefault`) quando o usuário deixa em branco.
- Editar/excluir **parcelamento ou recorrência** em lote = **V2** (hoje edita-se linha a linha).

## Fora de escopo (hoje)
Transferências (`kind='transfer'`); edição em lote de parcelamento/recorrência; materialização automática de
ocorrências futuras (agendador); override manual de tag; `interval_count` > 1; backfill de períodos pulados.
