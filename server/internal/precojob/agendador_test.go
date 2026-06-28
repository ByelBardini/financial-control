package precojob_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"financial-control/server/internal/cotacao"
	"financial-control/server/internal/precojob"
	"financial-control/server/internal/store"
)

type gravacao struct {
	userID, assetID, source string
	cents                   int64
	observedOn              time.Time
}

type fakeCarteira struct {
	ativos      []store.QuotableAsset
	listErr     error
	falharAsset string // assetID que falha no RecordDailyClose (testa isolamento)
	gravados    []gravacao
}

func (f *fakeCarteira) ListQuotableAssets(context.Context) ([]store.QuotableAsset, error) {
	return f.ativos, f.listErr
}

func (f *fakeCarteira) RecordDailyClose(_ context.Context, userID, assetID string, cents int64, observedOn time.Time, source string, _ time.Time) error {
	if assetID == f.falharAsset {
		return errors.New("falha de gravação simulada")
	}
	f.gravados = append(f.gravados, gravacao{userID, assetID, source, cents, observedOn})
	return nil
}

type fakeCotador struct {
	precos    map[string]map[string]cotacao.Cotacao
	errClasse map[string]error
	chamadas  map[string]int
}

func (f *fakeCotador) UltimosPrecos(_ context.Context, class string, _ []string) (map[string]cotacao.Cotacao, error) {
	f.chamadas[class]++
	if e := f.errClasse[class]; e != nil {
		return nil, e
	}
	return f.precos[class], nil
}

func novoCotador() *fakeCotador {
	return &fakeCotador{
		precos: map[string]map[string]cotacao.Cotacao{
			"acoes":  {"PETR4": {PriceCents: 3850, Source: "brapi"}, "VALE3": {PriceCents: 6120, Source: "brapi"}},
			"cripto": {"BTC": {PriceCents: 32476543, Source: "coingecko"}},
		},
		errClasse: map[string]error{},
		chamadas:  map[string]int{},
	}
}

func tresAtivos() []store.QuotableAsset {
	return []store.QuotableAsset{
		{ID: "p", UserID: "u", Ticker: "PETR4", AssetClass: "acoes"},
		{ID: "v", UserID: "u", Ticker: "VALE3", AssetClass: "acoes"},
		{ID: "b", UserID: "u", Ticker: "BTC", AssetClass: "cripto"},
	}
}

func instante() time.Time { return time.Date(2026, 6, 23, 18, 30, 0, 0, cotacao.BRT) }

func acharGravacao(gs []gravacao, assetID string) *gravacao {
	for i := range gs {
		if gs[i].assetID == assetID {
			return &gs[i]
		}
	}
	return nil
}

func TestRodarUmaVezGravaFechamentosEmLotePorClasse(t *testing.T) {
	cart := &fakeCarteira{ativos: tresAtivos()}
	cot := novoCotador()
	ag := precojob.NewAgendador(cart, cot, 18, 30, instante)

	res := ag.RodarUmaVez(context.Background())

	if res.Tentados != 3 || res.Gravados != 3 || res.Falhas != 0 {
		t.Fatalf("resumo = %+v, quero {3,3,0}", res)
	}
	if cot.chamadas["acoes"] != 1 || cot.chamadas["cripto"] != 1 {
		t.Errorf("chamadas por classe = %v, quero 1 por classe (batch)", cot.chamadas)
	}
	petr := acharGravacao(cart.gravados, "p")
	if petr == nil || petr.cents != 3850 || petr.source != "brapi" {
		t.Fatalf("gravação PETR4 = %+v, quero 3850/brapi", petr)
	}
	if !petr.observedOn.Equal(cotacao.DataBRT(instante())) {
		t.Errorf("observed_on = %v, quero hoje em BRT (%v)", petr.observedOn, cotacao.DataBRT(instante()))
	}
}

func TestRodarUmaVezIsolaFalhaDeGravacao(t *testing.T) {
	cart := &fakeCarteira{ativos: tresAtivos(), falharAsset: "v"} // VALE3 falha ao gravar
	ag := precojob.NewAgendador(cart, novoCotador(), 18, 30, instante)

	res := ag.RodarUmaVez(context.Background())

	if res.Gravados != 2 || res.Falhas != 1 {
		t.Fatalf("resumo = %+v, quero {gravados 2, falhas 1} (VALE3 falhou, resto seguiu)", res)
	}
	if acharGravacao(cart.gravados, "p") == nil || acharGravacao(cart.gravados, "b") == nil {
		t.Error("PETR4 e BTC deveriam ter sido gravados apesar da falha do VALE3")
	}
}

func TestRodarUmaVezPrecoFaltandoContaComoFalha(t *testing.T) {
	cot := novoCotador()
	delete(cot.precos["cripto"], "BTC") // provedor não devolveu preço do BTC
	cart := &fakeCarteira{ativos: tresAtivos()}
	ag := precojob.NewAgendador(cart, cot, 18, 30, instante)

	res := ag.RodarUmaVez(context.Background())

	if res.Gravados != 2 || res.Falhas != 1 {
		t.Fatalf("resumo = %+v, quero {gravados 2, falhas 1} (BTC sem preço)", res)
	}
}

func TestRodarUmaVezErroDeClasseNaoDerrubaAsOutras(t *testing.T) {
	cot := novoCotador()
	cot.errClasse["acoes"] = errors.New("brapi fora do ar")
	cart := &fakeCarteira{ativos: tresAtivos()}
	ag := precojob.NewAgendador(cart, cot, 18, 30, instante)

	res := ag.RodarUmaVez(context.Background())

	if res.Falhas != 2 || res.Gravados != 1 {
		t.Fatalf("resumo = %+v, quero {gravados 1 (BTC), falhas 2 (ações)}", res)
	}
	if acharGravacao(cart.gravados, "b") == nil {
		t.Error("BTC (cripto) deveria ter sido gravado mesmo com ações falhando")
	}
}

func TestProximaExecucao(t *testing.T) {
	loc := cotacao.BRT
	t.Run("antes do horário roda hoje", func(t *testing.T) {
		got := precojob.ProximaExecucao(time.Date(2026, 6, 23, 10, 0, 0, 0, loc), 18, 30)
		want := time.Date(2026, 6, 23, 18, 30, 0, 0, loc)
		if !got.Equal(want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})
	t.Run("depois do horário roda amanhã", func(t *testing.T) {
		got := precojob.ProximaExecucao(time.Date(2026, 6, 23, 19, 0, 0, 0, loc), 18, 30)
		want := time.Date(2026, 6, 24, 18, 30, 0, 0, loc)
		if !got.Equal(want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})
}
