package contas_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/contas"
	"financial-control/server/internal/store"
)

// doCard dispara um GET autenticado em /contas/cards/{id} com o path value setado.
func doCard(t *testing.T, h http.Handler, id string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/contas/cards/"+id, nil)
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	req.SetPathValue("id", id)
	h.ServeHTTP(rec, req)
	return rec
}

func TestCardDetailHandlerJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{
		cardSummary: store.CardSummaryRow{ID: "c1", Name: "Nubank", Icon: "credit_card", DotColor: "#8a05be", LimitCents: 200000, BalanceCents: -12000, PaymentAccountID: "b1"},
		cardEntries: []store.CardEntryRow{{
			ID: "e1", Month: "2026-06", OccurredOn: time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC),
			Description: "Mercado", Direction: "expense", AmountCents: 12000, Kind: "standard",
			CategoryName: "Alimentação", CategoryIcon: "restaurant",
		}},
	})
	rec := doCard(t, contas.CardDetailHandler(svc), "c1")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	const want = `{"id":"c1","name":"Nubank","icon":"credit_card","brandColor":"#8a05be","limitCents":200000,"invoiceCents":12000,"availableCents":188000,"usedPercent":6,"paymentAccountId":"b1","months":[{"month":"2026-06","label":"Junho/2026","chargesCents":12000,"paymentsCents":0,"netCents":12000,"entries":[{"id":"e1","occurredOn":"2026-06-10","description":"Mercado","category":"Alimentação","icon":"restaurant","direction":"outflow","amountCents":12000,"kind":"standard"}]}]}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
}

func TestCardDetailHandler404(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{cardErr: store.ErrCardNotFound})
	if rec := doCard(t, contas.CardDetailHandler(svc), "x"); rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", rec.Code)
	}
}

func TestCardDetailHandler500(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{cardErr: errStore})
	if rec := doCard(t, contas.CardDetailHandler(svc), "c1"); rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500", rec.Code)
	}
}

func TestCardDetailHandler401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/contas/cards/c1", nil) // sem userID
	req.SetPathValue("id", "c1")
	contas.CardDetailHandler(contas.NewService(&fakeContasStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}
