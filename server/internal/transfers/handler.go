package transfers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
	"financial-control/server/internal/store"
)

// CreateHandler responde POST /transfers criando a transferência (dupla entrada) → 201 + recurso.
// Corpo inválido ou regra de negócio (origem==destino, valor ≤ 0, data ruim) → 400; conta que não
// é do usuário (ou arquivada) → 400 (ErrTransferInvalid); o resto é 500 com o erro real logado.
func CreateHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		var in CreateTransferInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "corpo inválido: esperado JSON de transferência")
			return
		}
		if err := in.validate(); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		res, err := svc.Create(r.Context(), userID, in)
		if err != nil {
			if errors.Is(err, store.ErrTransferInvalid) {
				httpx.WriteError(w, http.StatusBadRequest, "transferência inválida: as contas precisam ser suas, diferentes e ativas")
				return
			}
			log.Printf("POST /transfers: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao criar transferência")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, res)
	})
}
