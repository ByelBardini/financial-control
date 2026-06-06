// Package account expõe a leitura de contas (com saldo) que alimenta o dashboard.
package account

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"financial-control/server/internal/httpx"
	"financial-control/server/internal/store"
)

// Account é a conta no formato que o client espera (valores em centavos).
type Account struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	BalanceCents int64  `json:"balanceCents"`
	Icon         string `json:"icon"`
	Tone         string `json:"tone"`
	DotColor     string `json:"dotColor"`
}

// AccountStore é a dependência de dados do serviço de contas.
type AccountStore interface {
	ListAccountsWithBalance(ctx context.Context) ([]store.AccountRow, error)
}

// Service lê contas a partir do store.
type Service struct {
	store AccountStore
}

// NewService injeta o store no serviço de contas.
//
//	svc := account.NewService(st)
func NewService(s AccountStore) *Service {
	return &Service{store: s}
}

// List devolve todas as contas ativas com o saldo all-time já calculado.
func (s *Service) List(ctx context.Context) ([]Account, error) {
	rows, err := s.store.ListAccountsWithBalance(ctx)
	if err != nil {
		return nil, fmt.Errorf("account: listar contas: %w", err)
	}
	out := make([]Account, 0, len(rows))
	for _, r := range rows {
		out = append(out, Account{
			ID:           r.ID,
			Name:         r.Name,
			BalanceCents: r.BalanceCents,
			Icon:         r.Icon,
			Tone:         r.Tone,
			DotColor:     r.DotColor,
		})
	}
	return out, nil
}

// ListHandler responde GET /accounts com a lista de contas em JSON.
//
//	mux.Handle("GET /accounts", account.ListHandler(svc))
func ListHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accounts, err := svc.List(r.Context())
		if err != nil {
			log.Printf("GET /accounts: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao listar contas")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, accounts)
	})
}
