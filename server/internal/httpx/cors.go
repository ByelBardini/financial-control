package httpx

import (
	"net/http"
	"os"
)

// CORS embrulha h adicionando os headers de CORS e tratando o preflight OPTIONS
// com 204. A origem vem de CORS_ALLOW_ORIGIN (default "*"). O token de auth viaja
// no header Authorization (Bearer), não em cookie — então não há credenciais de
// CORS e "*" continua válido; ainda assim, **trave a origem em produção**.
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}
