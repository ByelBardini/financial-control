// Package httpx reúne helpers HTTP compartilhados entre os handlers de domínio.
package httpx

import (
	"encoding/json"
	"net/http"
)

// WriteJSON serializa v como JSON com o status informado e Content-Type application/json.
//
//	httpx.WriteJSON(w, http.StatusOK, payload)
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError responde com o corpo JSON {"error": msg} e o status informado.
//
//	httpx.WriteError(w, http.StatusBadRequest, "month inválido")
func WriteError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, map[string]string{"error": msg})
}
