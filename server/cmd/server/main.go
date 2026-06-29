package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/config"
	"financial-control/server/internal/contas"
	"financial-control/server/internal/cotacao"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/patrimonio"
	"financial-control/server/internal/precojob"
	"financial-control/server/internal/router"
	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	st, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("conectando no Postgres: %v", err)
	}
	defer st.Close()

	authSvc := auth.NewService(
		st,
		auth.NewTokenIssuer(cfg.JWTSecret),
		auth.TTLs{Default: cfg.JWTTTLDefault, Remember: cfg.JWTTTLRemember},
	)

	// Cotação de preço: brapi (ações/FIIs) + CoinGecko (cripto), escolhidos pela classe do ativo.
	// Alimenta o backfill no cadastro (best-effort). Sem token, brapi cobre só os tickers de teste.
	cotador := cotacao.NewResolver(
		cotacao.NewBrapi("https://brapi.dev", cfg.BrapiToken, nil),
		cotacao.NewCoinGecko("https://api.coingecko.com", cfg.CoinGeckoAPIKey, nil, cotacao.IDPadrao),
	)
	deps := router.Deps{
		Auth:          authSvc,
		Account:       account.NewService(st),
		Dashboard:     dashboard.NewService(st),
		Contas:        contas.NewService(st),
		Transacoes:    transacoes.NewService(st),
		Investimentos: investimentos.NewService(st, investimentos.ComBackfill(cotador), investimentos.ComBusca(cotador)),
		Patrimonio:    patrimonio.NewService(st),
	}

	// Job diário de cotação (EOD): atualiza o fechamento de cada ativo cotável no horário (BRT).
	// Opt-in (QUOTE_JOB_ENABLED) pra não bater nas APIs externas em todo start de dev.
	if cfg.QuoteJobEnabled {
		jobCtx, cancel := context.WithCancel(context.Background())
		defer cancel()
		job := precojob.NewAgendador(st, cotador, cfg.QuoteJobHour, cfg.QuoteJobMinute, time.Now)
		go job.Run(jobCtx)
		log.Printf("job de cotação ligado: roda %02d:%02d (BRT)", cfg.QuoteJobHour, cfg.QuoteJobMinute)
	}

	addr := ":" + cfg.Port
	log.Printf("server ouvindo em http://localhost%s", addr)
	if err := http.ListenAndServe(addr, router.New(deps)); err != nil {
		log.Fatal(err)
	}
}
