package investimentos

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
	"financial-control/server/internal/store"
)

// userHandler centraliza o user autenticado, a chamada ao service e a resposta JSON (igual a
// contas/transacoes). O userID vem do token (middleware) — nunca do client; sem ele, 401.
func userHandler(label string, fn func(context.Context, string) (any, error)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		out, err := fn(r.Context(), userID)
		if err != nil {
			log.Printf("GET %s: %v", label, err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar "+label)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// SummaryHandler responde GET /investimentos/summary com o resumo do portfólio geral.
func SummaryHandler(svc *Service) http.Handler {
	return userHandler("/investimentos/summary", func(ctx context.Context, userID string) (any, error) {
		return svc.Summary(ctx, userID)
	})
}

// PositionsHandler responde GET /investimentos/positions com as posições abertas (geral).
func PositionsHandler(svc *Service) http.Handler {
	return userHandler("/investimentos/positions", func(ctx context.Context, userID string) (any, error) {
		return svc.Positions(ctx, userID)
	})
}

// AllocationHandler responde GET /investimentos/allocation com a alocação por classe.
func AllocationHandler(svc *Service) http.Handler {
	return userHandler("/investimentos/allocation", func(ctx context.Context, userID string) (any, error) {
		return svc.Allocation(ctx, userID)
	})
}

// CryptoHandler responde GET /investimentos/crypto com o bloco de cripto à parte.
func CryptoHandler(svc *Service) http.Handler {
	return userHandler("/investimentos/crypto", func(ctx context.Context, userID string) (any, error) {
		return svc.Crypto(ctx, userID)
	})
}

// EvolutionHandler responde GET /investimentos/evolution?range=... com a evolução do patrimônio
// geral (valor de mercado × custo acumulado).
func EvolutionHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		out, err := svc.Evolution(r.Context(), userID, r.URL.Query().Get("range"))
		if err != nil {
			log.Printf("GET /investimentos/evolution: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar evolução")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// CatalogoHandler responde GET /investimentos/catalogo?class=&q= com sugestões de ativos do catálogo
// externo (autocomplete do cadastro). Classe inválida → 400; renda_fixa / query curta / sem match → [].
// Não usa o userID além da exigência de token (o catálogo é o universo externo, não dados do usuário).
func CatalogoHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := authedUserID(w, r); !ok {
			return
		}
		q := r.URL.Query()
		out, err := svc.Catalogo(r.Context(), q.Get("class"), q.Get("q"))
		if err != nil {
			if errors.Is(err, ErrClasseInvalida) {
				httpx.WriteError(w, http.StatusBadRequest, "classe de ativo inválida: use acoes|fiis|cripto")
				return
			}
			log.Printf("GET /investimentos/catalogo: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao buscar catálogo de ativos")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// BackfillHandler responde POST /investimentos/backfill disparando, em segundo plano, o backfill de
// histórico dos ativos JÁ cadastrados do usuário (classes cotáveis) → 202 + {assets:N} (quantos
// entraram na fila). Útil uma vez após configurar o BRAPI_TOKEN, pra os ativos antigos ganharem série.
func BackfillHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		n, err := svc.BackfillExistentes(r.Context(), userID)
		if err != nil {
			writeAssetError(w, err, "POST /investimentos/backfill", "erro ao iniciar backfill")
			return
		}
		httpx.WriteJSON(w, http.StatusAccepted, map[string]int{"assets": n})
	})
}

// PriceHistoryHandler responde GET /investimentos/assets/{id}/history?range=... com a série de preço.
func PriceHistoryHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		out, err := svc.PriceHistory(r.Context(), userID, r.PathValue("id"), r.URL.Query().Get("range"))
		if err != nil {
			writeAssetError(w, err, "GET /investimentos/assets/{id}/history", "erro ao buscar histórico de preço")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// --- Recurso CRUD (ativos + operações) ---

// writeInput é o corpo de escrita que se autovalida (criar ativo, editar, operar).
type writeInput interface {
	validate() error
}

// decodeInput lê e valida o corpo JSON em dst. Em erro escreve 400 e devolve false.
func decodeInput[T writeInput](w http.ResponseWriter, r *http.Request, dst *T) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "corpo inválido: esperado JSON")
		return false
	}
	if err := (*dst).validate(); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}

func authedUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
	}
	return userID, ok
}

// writeAssetError mapeia o erro do service pro status HTTP, num só lugar pros handlers de recurso:
// 404 (ativo/operação inexistente), 400 (venda insuficiente, conta de liquidação inválida); o resto
// é um 500 seguro com log.
func writeAssetError(w http.ResponseWriter, err error, logTag, serverErrMsg string) {
	switch {
	case errors.Is(err, store.ErrAssetNotFound):
		httpx.WriteError(w, http.StatusNotFound, "ativo não encontrado")
	case errors.Is(err, store.ErrTradeNotFound):
		httpx.WriteError(w, http.StatusNotFound, "operação não encontrada")
	case errors.Is(err, store.ErrInsufficientQuantity):
		httpx.WriteError(w, http.StatusBadRequest, "quantidade insuficiente para vender")
	case errors.Is(err, store.ErrTradeAccountInvalid):
		httpx.WriteError(w, http.StatusBadRequest, "conta de liquidação inválida")
	default:
		log.Printf("%s: %v", logTag, err)
		httpx.WriteError(w, http.StatusInternalServerError, serverErrMsg)
	}
}

// AssetsHandler responde GET /investimentos/assets com todos os ativos + posição (gestão).
func AssetsHandler(svc *Service) http.Handler {
	return userHandler("/investimentos/assets", func(ctx context.Context, userID string) (any, error) {
		return svc.Assets(ctx, userID)
	})
}

// GetAssetHandler responde GET /investimentos/assets/{id} com o ativo completo (404 se não existe).
func GetAssetHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		out, err := svc.GetAsset(r.Context(), userID, r.PathValue("id"))
		if err != nil {
			writeAssetError(w, err, "GET /investimentos/assets/{id}", "erro ao buscar ativo")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// CreateAssetHandler responde POST /investimentos/assets criando o ativo → 201 + recurso.
func CreateAssetHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in CreateAssetInput
		if !decodeInput(w, r, &in) {
			return
		}
		out, err := svc.CreateAsset(r.Context(), userID, in)
		if err != nil {
			writeAssetError(w, err, "POST /investimentos/assets", "erro ao criar ativo")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, out)
	})
}

// UpdateAssetHandler responde PATCH /investimentos/assets/{id} (metadados + preço) → 200 + recurso.
func UpdateAssetHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in UpdateAssetInput
		if !decodeInput(w, r, &in) {
			return
		}
		out, err := svc.UpdateAsset(r.Context(), userID, r.PathValue("id"), in)
		if err != nil {
			writeAssetError(w, err, "PATCH /investimentos/assets/{id}", "erro ao editar ativo")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// ArchiveAssetHandler responde DELETE /investimentos/assets/{id} arquivando → 204.
func ArchiveAssetHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		if err := svc.ArchiveAsset(r.Context(), userID, r.PathValue("id")); err != nil {
			writeAssetError(w, err, "DELETE /investimentos/assets/{id}", "erro ao arquivar ativo")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// TradeHandler responde POST /investimentos/assets/{id}/trades (compra/venda) → 201 + ativo atualizado.
func TradeHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in CreateTradeInput
		if !decodeInput(w, r, &in) {
			return
		}
		out, err := svc.Trade(r.Context(), userID, r.PathValue("id"), in)
		if err != nil {
			writeAssetError(w, err, "POST /investimentos/assets/{id}/trades", "erro ao registrar operação")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, out)
	})
}

// DeleteTradeHandler responde DELETE /investimentos/assets/{id}/trades/{tradeId} → 204.
func DeleteTradeHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		if err := svc.DeleteTrade(r.Context(), userID, r.PathValue("id"), r.PathValue("tradeId")); err != nil {
			writeAssetError(w, err, "DELETE /investimentos/assets/{id}/trades/{tradeId}", "erro ao excluir operação")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
