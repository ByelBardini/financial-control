// Package config carrega a configuração de runtime do server a partir do ambiente.
package config

import (
	"fmt"
	"os"
	"time"
)

// minSecretLen é o tamanho mínimo do JWT_SECRET (evita segredo fraco tipo "dev").
const minSecretLen = 32

// Config reúne os parâmetros de runtime do server.
type Config struct {
	DatabaseURL    string
	Port           string
	JWTSecret      string
	JWTTTLDefault  time.Duration // validade do token sem "lembre de mim"
	JWTTTLRemember time.Duration // validade do token com "lembre de mim"
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
	return Config{
		DatabaseURL:    dbURL,
		Port:           getenv("PORT", "8080"),
		JWTSecret:      secret,
		JWTTTLDefault:  ttlDefault,
		JWTTTLRemember: ttlRemember,
	}, nil
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
