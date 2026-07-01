package contas

import (
	"errors"
	"log"
	"net/http"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
	"financial-control/server/internal/store"
)

// CardDetailHandler responde GET /contas/cards/{id} com o detalhe do cartão (cabeçalho +
// faturas por mês). 404 quando o cartão não é do usuário (ou não é credit_card/está arquivado);
// 401 sem token; 500 com o erro real logado.
func CardDetailHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		detail, err := svc.CardDetail(r.Context(), userID, r.PathValue("id"))
		if err != nil {
			if errors.Is(err, store.ErrCardNotFound) {
				httpx.WriteError(w, http.StatusNotFound, "cartão não encontrado")
				return
			}
			log.Printf("GET /contas/cards/{id}: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar detalhe do cartão")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, detail)
	})
}
