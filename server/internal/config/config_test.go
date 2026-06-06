package config_test

import (
	"testing"

	"financial-control/server/internal/config"
)

func TestLoadExigeDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	if _, err := config.Load(); err == nil {
		t.Fatal("esperava erro quando DATABASE_URL está vazia")
	}
}

func TestLoadUsaPortPadraoQuandoNaoDefinida(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("PORT", "")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("Port = %q, quero 8080 (default)", cfg.Port)
	}
	if cfg.DatabaseURL != "postgres://u:p@localhost:5432/db" {
		t.Errorf("DatabaseURL = %q, quero a URL informada", cfg.DatabaseURL)
	}
}

func TestLoadRespeitaPortConfigurada(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("PORT", "9090")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if cfg.Port != "9090" {
		t.Errorf("Port = %q, quero 9090", cfg.Port)
	}
}
