---
description: Orienta a criar commits semânticos e descritivos (Conventional Commits). Mensagens devem detalhar o máximo possível a tarefa (o que, por que, como). Git add modular — nunca misturar arquivos de escopos diferentes (server / client / raiz). Prioridade: backend (Go) > frontend (Expo). Testes ficam co-localizados e são commitados antes da implementação que cobrem.
---

# Commits Semânticos

## Comandos Permitidos

**Usar APENAS:**
- `git add` — adicionar arquivos ao stage
- `git commit` — criar commit com mensagem

Não usar: `git push`, `git pull`, `git stash`, `git reset` ou outros comandos git.

---

## Regra de Ouro: Add Modular

**NUNCA misturar arquivos de escopos diferentes no mesmo commit.**

Cada commit deve conter arquivos de **um único escopo**:
- Ou só `server/` — backend Go (inclui os testes `*_test.go`)
- Ou só `client/` — frontend Expo/React Native (inclui testes Jest)
- Ou só arquivos de raiz/config (`docker-compose.yml`, `package.json`, `.env.example`, `README.md`, etc.)

> Em Go os testes ficam **ao lado do código** (`*_test.go`), e no client ficam junto dos
> componentes (`*.test.tsx` / `__tests__/`). Não existe pasta `test/` separada — então um
> commit de teste é sempre dentro do escopo `server/` **ou** `client/`, nunca dos dois juntos.

---

## Prioridade dos Commits

Seguir esta ordem ao criar múltiplos commits:

1. **Backend** (`server/`) — primeiro
2. **Frontend** (`client/`) — segundo
3. **Raiz / config** (`docker-compose.yml`, `package.json`, etc.) — por último

**Teste antes da implementação:** dentro de um escopo, se houver testes novos, comite-os
antes do código que eles cobrem (ex.: `transacao_test.go` antes de `transacao.go`).

---

## Formato da Mensagem (Conventional Commits)

```
<tipo>(<escopo>): <resumo curto>

[corpo — descrição detalhada da tarefa]
```

### Mensagens descritivas (obrigatório)

**As mensagens devem descrever a tarefa o máximo possível.** Evite mensagens genéricas. O corpo deve responder:
- **O que** foi feito (quais arquivos, quais funções)
- **Por que** (problema resolvido, objetivo da mudança)
- **Como** (abordagem usada, quando for relevante)

Exemplo:
```
feat(transacao): adicionar cálculo de saldo da conta

Implementa o cálculo de saldo agregando as transações de uma conta. Inclui:
- Função CalcularSaldo no pacote transacao (usa shopspring/decimal, nunca float)
- Query somando entradas e saídas dentro de uma transação de banco
- Tratamento para conta sem movimentações (saldo zero)
```

### Tipos principais

| Tipo   | Uso                           |
|--------|-------------------------------|
| `feat` | Nova funcionalidade           |
| `fix`  | Correção de bug               |
| `test` | Adicionar ou ajustar testes   |
| `refactor` | Refatoração sem mudar comportamento |
| `chore` | Manutenção, config, deps     |
| `docs` | Documentação                  |
| `style` | Formatação (gofmt/prettier, não altera lógica) |

### Escopos sugeridos

- Domínio: `conta`, `categoria`, `transacao`, `auth`, `relatorio`
- Infra: `db`, `docker`, `deps`, `config`

### Regras do resumo (primeira linha)

- Infinitivo, minúscula (exceto nomes): "adicionar" não "adicionado"
- Sem ponto final
- Máx. ~72 caracteres
- Específico o suficiente para entender a mudança

---

## Fluxo de Trabalho

### 1. Verificar alterações

```bash
git status
```

### 2. Agrupar por escopo

Classificar arquivos modificados em: `server/**`, `client/**`, raiz/config.

### 3. Criar commits na ordem de prioridade

```bash
git add <arquivos-do-grupo>
git commit -m "<tipo>(<escopo>): <resumo>" -m "<corpo detalhado>"
```

---

## Exemplos

### Testes + implementação backend (Go)

```bash
# Commit 1 — testes do backend
git add server/internal/transacao/transacao_test.go
git commit -m "test(transacao): adicionar testes de criação e cálculo de saldo" -m "Cobre a criação de transação e o cálculo de saldo com cenários de entrada, saída e conta sem movimentações. Usa valores em decimal para validar precisão monetária."

# Commit 2 — backend
git add server/internal/transacao/transacao.go server/internal/transacao/repository.go
git commit -m "feat(transacao): implementar criação de transação com saldo" -m "Implementa o handler e o repositório de transações: validação dos campos, escrita dentro de uma transação de banco e cálculo de saldo com shopspring/decimal."
```

### Frontend (Expo / React Native)

```bash
git add client/src/screens/TransacoesScreen.tsx
git commit -m "feat(transacao): adicionar tela de listagem de transações" -m "Cria a TransacoesScreen com lista das transações da conta, consumindo GET /transacoes da API. Formata os valores em BRL e separa entradas/saídas por cor."
```

---

## Checklist antes de commitar

```
- [ ] Arquivos agrupados por escopo (server / client / raiz)
- [ ] Nenhum escopo misturado no mesmo commit
- [ ] Ordem: backend → frontend → raiz/config
- [ ] Dentro do escopo: testes antes da implementação que cobrem
- [ ] Resumo específico (não genérico)
- [ ] Corpo descrevendo o que/por que/como (quando relevante)
- [ ] Mensagem no formato: tipo(escopo): resumo + corpo
- [ ] Apenas git add e git commit
```

---

## Após o commit — limpeza de plano

Se este commit conclui a execução de um plano em `.claude/plans/`, avise o usuário:

> "Commit criado. Se este commit finaliza um plano, me diga o nome dele para eu apagar `.claude/plans/<nome>.md`."

Aguarde a confirmação do usuário antes de deletar qualquer arquivo de plano.
