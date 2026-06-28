package config_test

import (
	"strings"
	"testing"
	"time"

	"financial-control/server/internal/config"
)

const validSecret = "0123456789-0123456789-0123456789" // 32 bytes

// withBase seta DATABASE_URL + JWT_SECRET válidos pra isolar o caso sob teste.
func withBase(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("JWT_SECRET", validSecret)
}

func TestLoadExigeDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("JWT_SECRET", validSecret)
	if _, err := config.Load(); err == nil {
		t.Fatal("esperava erro quando DATABASE_URL está vazia")
	}
}

func TestLoadExigeJWTSecretForte(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("JWT_SECRET", "curto")
	if _, err := config.Load(); err == nil {
		t.Fatal("esperava erro com JWT_SECRET curto (< 32 bytes)")
	}
}

func TestLoadUsaPadroesQuandoNaoDefinidos(t *testing.T) {
	withBase(t)
	t.Setenv("PORT", "")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("Port = %q, quero 8080 (default)", cfg.Port)
	}
	if cfg.JWTTTLDefault != 24*time.Hour {
		t.Errorf("JWTTTLDefault = %v, quero 24h", cfg.JWTTTLDefault)
	}
	if cfg.JWTTTLRemember != 720*time.Hour {
		t.Errorf("JWTTTLRemember = %v, quero 720h", cfg.JWTTTLRemember)
	}
	if cfg.DatabaseURL != "postgres://u:p@localhost:5432/db" {
		t.Errorf("DatabaseURL = %q, quero a URL informada", cfg.DatabaseURL)
	}
}

func TestLoadRejeitaTTLInvalido(t *testing.T) {
	for _, key := range []string{"JWT_TTL_DEFAULT", "JWT_TTL_REMEMBER"} {
		t.Run(key, func(t *testing.T) {
			withBase(t)
			t.Setenv(key, "banana") // não é duração Go (ex.: 24h)
			if _, err := config.Load(); err == nil {
				t.Fatalf("esperava erro com %s em formato inválido", key)
			}
		})
	}
}

func TestLoadJWTSecretNoLimite(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost:5432/db")

	t.Setenv("JWT_SECRET", strings.Repeat("a", 31)) // 1 byte abaixo do mínimo
	if _, err := config.Load(); err == nil {
		t.Fatal("31 bytes deveria falhar (mínimo 32)")
	}
	t.Setenv("JWT_SECRET", strings.Repeat("a", 32)) // exatamente no mínimo
	if _, err := config.Load(); err != nil {
		t.Fatalf("32 bytes deveria passar, veio erro: %v", err)
	}
}

func TestLoadJobCotacaoDefaults(t *testing.T) {
	withBase(t)
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if cfg.QuoteJobEnabled {
		t.Error("QuoteJobEnabled default deveria ser false (opt-in)")
	}
	if cfg.QuoteJobHour != 18 || cfg.QuoteJobMinute != 30 {
		t.Errorf("horário default = %02d:%02d, quero 18:30", cfg.QuoteJobHour, cfg.QuoteJobMinute)
	}
}

func TestLoadJobCotacaoOverrides(t *testing.T) {
	withBase(t)
	t.Setenv("QUOTE_JOB_ENABLED", "true")
	t.Setenv("QUOTE_JOB_AT", "07:05")
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if !cfg.QuoteJobEnabled {
		t.Error("QUOTE_JOB_ENABLED=true deveria ligar o job")
	}
	if cfg.QuoteJobHour != 7 || cfg.QuoteJobMinute != 5 {
		t.Errorf("horário = %02d:%02d, quero 07:05", cfg.QuoteJobHour, cfg.QuoteJobMinute)
	}
}

func TestLoadRejeitaQuoteJobAtInvalido(t *testing.T) {
	withBase(t)
	t.Setenv("QUOTE_JOB_AT", "banana") // não é HH:MM
	if _, err := config.Load(); err == nil {
		t.Fatal("esperava erro com QUOTE_JOB_AT em formato inválido")
	}
}

func TestLoadRespeitaOverrides(t *testing.T) {
	withBase(t)
	t.Setenv("PORT", "9090")
	t.Setenv("JWT_TTL_DEFAULT", "12h")
	t.Setenv("JWT_TTL_REMEMBER", "168h")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if cfg.Port != "9090" {
		t.Errorf("Port = %q, quero 9090", cfg.Port)
	}
	if cfg.JWTTTLDefault != 12*time.Hour || cfg.JWTTTLRemember != 168*time.Hour {
		t.Errorf("TTLs = %v/%v, quero 12h/168h", cfg.JWTTTLDefault, cfg.JWTTTLRemember)
	}
}
