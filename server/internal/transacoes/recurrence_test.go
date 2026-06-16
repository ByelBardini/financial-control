package transacoes_test

import (
	"net/http"
	"strings"
	"testing"

	"financial-control/server/internal/transacoes"
)

// Corpo válido: salário mensal de R$ 3.200,00 a partir de 01/06, sem fim (permanente).
const validRecurringBody = `{"accountId":"a1","categoryId":"c1","description":"Salário","direction":"inflow","amountCents":320000,"frequency":"monthly","intervalCount":1,"startDate":"2026-06-01"}`

func TestCreateRecurringRuleHandler201(t *testing.T) {
	fake := &fakeStore{recurringRows: 1} // regra + 1 lançamento
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
