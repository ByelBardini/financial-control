package transacoes_test

import (
	"net/http"
	"strings"
	"testing"

	"financial-control/server/internal/transacoes"
)

// Corpo válido: 3 parcelas de R$ 500,00 (valor POR parcela), iniciando em 20/06.
const validInstallmentBody = `{"accountId":"a1","categoryId":"c1","description":"iPhone","amountCents":50000,"totalInstallments":3,"occurredOn":"2026-06-20"}`

func TestCreateInstallmentHandler201(t *testing.T) {
	fake := &fakeStore{installmentRows: 3} // 3 parcelas inseridas
	rec := doJSON(t, transacoes.CreateInstallmentHandler(transacoes.NewService(fake)), http.MethodPost, "/transactions/installment-purchases", validInstallmentBody, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201; body=%s", rec.Code, rec.Body.String())
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("escopo: userID = %q, quero u-1", fake.gotUserID)
	}
	if fake.gotInstallment.Total != 3 || fake.gotInstallment.AmountCents != 50000 || fake.gotInstallment.Description != "iPhone" {
		t.Errorf("gotInstallment = %+v, quero {Total 3, AmountCents 50000 (por parcela), Description iPhone}", fake.gotInstallment)
	}
	if fake.gotInstallment.CategoryID == nil || *fake.gotInstallment.CategoryID != "c1" {
		t.Errorf("categoryID = %v, quero c1", fake.gotInstallment.CategoryID)
	}
}

func TestCreateInstallmentHandlerValidacao400(t *testing.T) {
	cases := []struct{ name, body, wantSub string }{
		{"sem conta", `{"accountId":"","description":"x","amountCents":100,"totalInstallments":3,"occurredOn":"2026-06-20"}`, "accountId vazio"},
		{"descrição vazia", `{"accountId":"a1","description":"  ","amountCents":100,"totalInstallments":3,"occurredOn":"2026-06-20"}`, "description vazio"},
		{"valor não-positivo", `{"accountId":"a1","description":"x","amountCents":0,"totalInstallments":3,"occurredOn":"2026-06-20"}`, "amountCents inválido"},
		{"1 parcela (mínimo 2)", `{"accountId":"a1","description":"x","amountCents":100,"totalInstallments":1,"occurredOn":"2026-06-20"}`, "totalInstallments inválido"},
		{"acima do teto", `{"accountId":"a1","description":"x","amountCents":100,"totalInstallments":49,"occurredOn":"2026-06-20"}`, "totalInstallments inválido"},
		{"data inválida", `{"accountId":"a1","description":"x","amountCents":100,"totalInstallments":3,"occurredOn":"20/06/2026"}`, "occurredOn inválido"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doJSON(t, transacoes.CreateInstallmentHandler(transacoes.NewService(&fakeStore{})), http.MethodPost, "/transactions/installment-purchases", tc.body, "")
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, quero 400", rec.Code)
			}
			if body := rec.Body.String(); !strings.Contains(body, tc.wantSub) {
				t.Errorf("body = %q, quero conter %q", body, tc.wantSub)
			}
		})
	}
}

func TestCreateInstallmentHandlerContaInvalida400(t *testing.T) {
	// 0 linhas afetadas = conta/categoria não é do usuário → 400.
	fake := &fakeStore{installmentRows: 0}
	rec := doJSON(t, transacoes.CreateInstallmentHandler(transacoes.NewService(fake)), http.MethodPost, "/transactions/installment-purchases", validInstallmentBody, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (conta inválida)", rec.Code)
	}
}
