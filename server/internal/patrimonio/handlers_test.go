package patrimonio_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/patrimonio"
	"financial-control/server/internal/store"
)

func TestOverviewHandlerJSON(t *testing.T) {
	svc := patrimonio.NewService(&fakePatrimonioStore{
		breakdown: store.LiquidBreakdownRow{BankCents: 300000, CashCents: 43000, CardDebtCents: 32000, VoucherCents: 21500},
		geral:     []store.PositionRow{{NetQuantity: "1.00000000", CurrentValueCents: 1400000}},
		cripto:    []store.PositionRow{{NetQuantity: "0.00150000", CurrentValueCents: 100000}},
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/patrimonio/overview", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	patrimonio.OverviewHandler(svc).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q", ct)
	}
	want := `{"liquidBalanceCents":343000,"bankCents":300000,"cashCents":43000,"investedCents":1400000,"cryptoCents":100000,"cardDebtCents":32000,"voucherCents":21500}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
}

func TestOverviewHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/patrimonio/overview", nil) // sem userID no contexto
	patrimonio.OverviewHandler(patrimonio.NewService(&fakePatrimonioStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401 (sem usuário no contexto)", rec.Code)
	}
}

func TestOverviewHandlerErroDoStore500(t *testing.T) {
	svc := patrimonio.NewService(&fakePatrimonioStore{err: errors.New("falha no banco")})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/patrimonio/overview", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	patrimonio.OverviewHandler(svc).ServeHTTP(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500", rec.Code)
	}
}
