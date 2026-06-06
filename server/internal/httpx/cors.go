package httpx

import (
	"net/http"
	"os"
)

// CORS embrulha h adicionando os headers de CORS e tratando o preflight
// OPTIONS com 204. A origem permitida vem de CORS_ALLOW_ORIGIN (default "*" para
// dev GET sem credenciais). Como a API é GET-only e sem auth/cookies, "*" é seguro.
//
//	return httpx.CORS(mux)
func CORS(h http.Handler) http.Handler {
	origin := os.Getenv("CORS_ALLOW_ORIGIN")
	if origin == "" {
		origin = "*"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}
