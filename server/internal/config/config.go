// Package config carrega a configuração de runtime do server a partir do ambiente.
package config

import (
	"fmt"
	"os"
)

// Config reúne os parâmetros de runtime do server.
type Config struct {
	DatabaseURL string
	Port        string
}

// Load lê a configuração do ambiente, validando o que é obrigatório.
//
//	cfg, err := config.Load()
func Load() (Config, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL não definida (esperado algo como postgres://user:pass@host:porta/db)")
	}
	return Config{
		DatabaseURL: dbURL,
		Port:        getenv("PORT", "8080"),
	}, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
