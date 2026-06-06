package main

import (
	"context"
	"log"
	"net/http"

	"financial-control/server/internal/account"
	"financial-control/server/internal/config"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/router"
	"financial-control/server/internal/store"
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

	deps := router.Deps{
		Account:   account.NewService(st),
		Dashboard: dashboard.NewService(st),
	}

	addr := ":" + cfg.Port
	log.Printf("server ouvindo em http://localhost%s", addr)
	if err := http.ListenAndServe(addr, router.New(deps)); err != nil {
		log.Fatal(err)
	}
}
