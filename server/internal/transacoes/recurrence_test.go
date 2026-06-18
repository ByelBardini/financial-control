package transacoes_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// Corpo válido: salário mensal de R$ 3.200,00 a partir de 01/06, sem fim (permanente).
const validRecurringBody = `{"accountId":"a1","categoryId":"c1","description":"Salário","direction":"inflow","amountCents":320000,"frequency":"monthly","intervalCount":1,"startDate":"2026-06-01"}`

func TestCreateRecurringRuleHandler201(t *testing.T) {
	fake := &fakeStore{recurringRows: 1} // regra criada (modelo — sem lançamento)
	rec := doJSON(t, transacoes.CreateRecurringRuleHandler(transacoes.NewService(fake)), http.MethodPost, "/recurring-rules", validRecurringBody, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201; body=%s", rec.Code, rec.Body.String())
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("escopo: userID = %q, quero u-1", fake.gotUserID)
	}
	// inflow é mapeado pro banco (income) antes de gravar.
	if fake.gotRecurring.Direction != "income" || fake.gotRecurring.Frequency != "monthly" || fake.gotRecurring.AmountCents != 320000 {
		t.Errorf("gotRecurring = %+v, quero {Direction income, Frequency monthly, AmountCents 320000}", fake.gotRecurring)
	}
}

func TestCreateRecurringRuleHandlerValidacao400(t *testing.T) {
	cases := []struct{ name, body, wantSub string }{
		{"sem conta", `{"accountId":"","description":"x","direction":"inflow","amountCents":100,"frequency":"monthly","intervalCount":1,"startDate":"2026-06-01"}`, "accountId vazio"},
		{"direção inválida", `{"accountId":"a1","description":"x","direction":"banana","amountCents":100,"frequency":"monthly","intervalCount":1,"startDate":"2026-06-01"}`, "direction inválido"},
		{"frequência inválida", `{"accountId":"a1","description":"x","direction":"inflow","amountCents":100,"frequency":"hourly","intervalCount":1,"startDate":"2026-06-01"}`, "frequency inválido"},
		{"intervalo < 1", `{"accountId":"a1","description":"x","direction":"inflow","amountCents":100,"frequency":"monthly","intervalCount":0,"startDate":"2026-06-01"}`, "intervalCount inválido"},
		{"data inválida", `{"accountId":"a1","description":"x","direction":"inflow","amountCents":100,"frequency":"monthly","intervalCount":1,"startDate":"01/06/2026"}`, "startDate inválido"},
		{"fim duplo (endDate + maxOccurrences)", `{"accountId":"a1","description":"x","direction":"inflow","amountCents":100,"frequency":"monthly","intervalCount":1,"startDate":"2026-06-01","endDate":"2026-12-01","maxOccurrences":6}`, "use endDate OU maxOccurrences"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doJSON(t, transacoes.CreateRecurringRuleHandler(transacoes.NewService(&fakeStore{})), http.MethodPost, "/recurring-rules", tc.body, "")
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, quero 400", rec.Code)
			}
			if body := rec.Body.String(); !strings.Contains(body, tc.wantSub) {
				t.Errorf("body = %q, quero conter %q", body, tc.wantSub)
			}
		})
	}
}

func TestCreateRecurringRuleHandlerContaInvalida400(t *testing.T) {
	// 0 linhas afetadas = conta/categoria não é do usuário → 400.
	fake := &fakeStore{recurringRows: 0}
	rec := doJSON(t, transacoes.CreateRecurringRuleHandler(transacoes.NewService(fake)), http.MethodPost, "/recurring-rules", validRecurringBody, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (conta inválida)", rec.Code)
	}
}

func TestRegisterRecurrenceHandler201LancaNoPeriodoCorrente(t *testing.T) {
	today := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)
	fake := &fakeStore{
		// mensal nunca registrada (last nil) → devida.
		ruleForRegister: store.RecurringRuleRow{ID: "r1", Frequency: "monthly", StartDate: time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC), Direction: "income", AmountCents: 320000},
		registerID:      "t9",
		detail: store.TransactionDetailRow{
			ID: "t9", AccountID: "a1", Description: "Salário", Direction: "income", AmountCents: 320000,
			OccurredOn: today, AccountName: "Nubank", CategoryName: "Salário", CategoryIcon: "payments",
		},
	}
	svc := transacoes.NewServiceWithClock(fake, func() time.Time { return today })
	rec := doJSON(t, transacoes.RegisterRecurrenceHandler(svc), http.MethodPost, "/recurring-rules/r1/register", "", "r1")
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201; body=%s", rec.Code, rec.Body.String())
	}
	if fake.gotRegisterID != "r1" {
		t.Errorf("registrou ruleID %q, quero r1", fake.gotRegisterID)
	}
	if !fake.gotOccurredOn.Equal(today) {
		t.Errorf("occurredOn = %v, quero hoje %v (data do clique)", fake.gotOccurredOn, today)
	}
	if !strings.Contains(rec.Body.String(), `"id":"t9"`) {
		t.Errorf("body = %s, quero a transação criada (id t9)", rec.Body.String())
	}
}

func TestRegisterRecurrenceHandlerJaRegistrado409(t *testing.T) {
	today := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)
	lastThisMonth := time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC)
	fake := &fakeStore{
		// mensal já registrada neste mês → NÃO devida.
		ruleForRegister: store.RecurringRuleRow{ID: "r1", Frequency: "monthly", StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), LastOccurredOn: &lastThisMonth, OccurrenceCount: 6},
	}
	svc := transacoes.NewServiceWithClock(fake, func() time.Time { return today })
	rec := doJSON(t, transacoes.RegisterRecurrenceHandler(svc), http.MethodPost, "/recurring-rules/r1/register", "", "r1")
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, quero 409 (já registrado no período); body=%s", rec.Code, rec.Body.String())
	}
	if !fake.gotOccurredOn.IsZero() {
		t.Error("não devido: não deveria ter chamado RegisterRecurringOccurrence")
	}
}

func TestRegisterRecurrenceHandlerNaoEncontrada404(t *testing.T) {
	fake := &fakeStore{ruleGetErr: store.ErrTransactionNotFound}
	rec := doJSON(t, transacoes.RegisterRecurrenceHandler(transacoes.NewService(fake)), http.MethodPost, "/recurring-rules/rX/register", "", "rX")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404 (regra não é do usuário)", rec.Code)
	}
}
