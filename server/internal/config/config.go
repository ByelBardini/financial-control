// Package config carrega a configuração de runtime do server a partir do ambiente.
package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// minSecretLen é o tamanho mínimo do JWT_SECRET (evita segredo fraco tipo "dev").
const minSecretLen = 32

// Config reúne os parâmetros de runtime do server.
type Config struct {
	DatabaseURL     string
	Port            string
	JWTSecret       string
	JWTTTLDefault   time.Duration // validade do token sem "lembre de mim"
	JWTTTLRemember  time.Duration // validade do token com "lembre de mim"
	BrapiToken      string        // cotação de ações/FIIs (vazio = só tickers de teste da brapi)
	CoinGeckoAPIKey string        // cotação de cripto (vazio = tier público sem chave)
	QuoteJobEnabled bool          // liga o job diário de cotação (default desligado)
	QuoteJobHour    int           // hora (BRT) do job diário
	QuoteJobMinute  int           // minuto (BRT) do job diário
}

// Load lê a configuração do ambiente, validando o que é obrigatório.
//
//	cfg, err := config.Load()
func Load() (Config, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL não definida (esperado algo como postgres://user:pass@host:porta/db)")
	}
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < minSecretLen {
		return Config{}, fmt.Errorf("config: JWT_SECRET ausente ou curto demais (mínimo %d bytes; gere um valor aleatório forte)", minSecretLen)
	}
	ttlDefault, err := durationEnv("JWT_TTL_DEFAULT", 24*time.Hour)
	if err != nil {
		return Config{}, err
	}
	ttlRemember, err := durationEnv("JWT_TTL_REMEMBER", 720*time.Hour) // 30 dias
	if err != nil {
		return Config{}, err
	}
	jobHour, jobMin, err := horaMinutoEnv("QUOTE_JOB_AT", 18, 30)
	if err != nil {
		return Config{}, err
	}
	return Config{
		DatabaseURL:     dbURL,
		Port:            getenv("PORT", "8080"),
		JWTSecret:       secret,
		JWTTTLDefault:   ttlDefault,
		JWTTTLRemember:  ttlRemember,
		BrapiToken:      os.Getenv("BRAPI_TOKEN"),       // fail-soft: ausente não impede subir
		CoinGeckoAPIKey: os.Getenv("COINGECKO_API_KEY"), // idem (CoinGecko funciona keyless)
		QuoteJobEnabled: boolEnv("QUOTE_JOB_ENABLED", false),
		QuoteJobHour:    jobHour,
		QuoteJobMinute:  jobMin,
	}, nil
}

// horaMinutoEnv lê um horário "HH:MM" (24h); vazio = fallback. Inválido falha fechado (erro).
func horaMinutoEnv(key string, hFallback, mFallback int) (int, int, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return hFallback, mFallback, nil
	}
	t, err := time.Parse("15:04", v)
	if err != nil {
		return 0, 0, fmt.Errorf("config: %s inválido (%q): use HH:MM (ex.: 18:30)", key, v)
	}
	return t.Hour(), t.Minute(), nil
}

// boolEnv lê um booleano (true/1/yes/on, case-insensitive); vazio = fallback; resto = false.
func boolEnv(key string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
	case "":
		return fallback
	case "true", "1", "yes", "on":
		return true
	default:
		return false
	}
}

// durationEnv lê uma duração no formato Go (ex.: 24h, 720h); vazio = fallback.
func durationEnv(key string, fallback time.Duration) (time.Duration, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("config: %s inválido (%q): use formato de duração Go, ex.: 24h", key, v)
	}
	return d, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
