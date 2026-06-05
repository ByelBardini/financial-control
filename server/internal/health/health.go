// Package health expõe o handler de liveness da API.
package health

import (
	"encoding/json"
	"net/http"
)

// Handler responde ao liveness check com {"status":"ok"}.
//
//	mux.Handle("GET /health", health.Handler())
func Handler() http.Handler {
	return http.HandlerFunc(serve)
}

func serve(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
