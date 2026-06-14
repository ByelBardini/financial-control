package transacoes

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
	"financial-control/server/internal/store"
)

// occurredOnLayout é o formato da data de competência no corpo (YYYY-MM-DD).
const occurredOnLayout = "2006-01-02"

var validDirections = map[string]bool{"inflow": true, "outflow": true}

// directionDB mapeia o sentido do client (inflow/outflow) para o do banco (income/expense).
func directionDB(d string) string {
	if d == "inflow" {
		return "income"
	}
	return "expense"
}

// TransactionDetail é o recurso devolvido por criar/editar/GET: campos crus (pra
// pré-preencher a edição) + presentação derivada. Dinheiro em centavos; data YYYY-MM-DD.
type TransactionDetail struct {
	ID           string `json:"id"`
	AccountID    string `json:"accountId"`
	CategoryID   string `json:"categoryId"`
	Description  string `json:"description"`
	Direction    string `json:"direction"`
	AmountCents  int64  `json:"amountCents"`
	OccurredOn   string `json:"occurredOn"`
	AccountLabel string `json:"accountLabel"`
	Category     string `json:"category"`
	Icon         string `json:"icon"`
}

// CreateTransactionInput é o corpo de criação. CategoryID opcional (nil/"" = sem categoria).
type CreateTransactionInput struct {
	AccountID   string  `json:"accountId"`
	CategoryID  *string `json:"categoryId"`
	Description string  `json:"description"`
	Direction   string  `json:"direction"`
	AmountCents int64   `json:"amountCents"`
	OccurredOn  string  `json:"occurredOn"`
}

// UpdateTransactionInput é o corpo de edição (não troca de conta).
type UpdateTransactionInput struct {
	CategoryID  *string `json:"categoryId"`
	Description string  `json:"description"`
	Direction   string  `json:"direction"`
	AmountCents int64   `json:"amountCents"`
	OccurredOn  string  `json:"occurredOn"`
}

// validateTransactionFields valida os campos comuns; mensagem inclui o valor ofensivo
// (regra do CLAUDE.md) — o handler responde 400.
func validateTransactionFields(direction, description, occurredOn string, amountCents int64) error {
	if strings.TrimSpace(description) == "" {
		return errors.New("description vazio: informe uma descrição não-vazia")
	}
	if !validDirections[direction] {
		return fmt.Errorf("direction inválido (%q): use inflow|outflow", direction)
	}
	if amountCents <= 0 {
		return fmt.Errorf("amountCents inválido (%d): deve ser maior que zero", amountCents)
	}
	if _, err := time.Parse(occurredOnLayout, occurredOn); err != nil {
		return fmt.Errorf("occurredOn inválido (%q): use o formato YYYY-MM-DD", occurredOn)
	}
	return nil
}

func (in CreateTransactionInput) validate() error {
	if strings.TrimSpace(in.AccountID) == "" {
		return errors.New("accountId vazio: informe a conta da transação")
	}
	return validateTransactionFields(in.Direction, in.Description, in.OccurredOn, in.AmountCents)
}

func (in UpdateTransactionInput) validate() error {
	return validateTransactionFields(in.Direction, in.Description, in.OccurredOn, in.AmountCents)
}

// normalizeCategory trata "" (e espaços) como ausência de categoria — evita um uuid vazio.
func normalizeCategory(c *string) *string {
	if c == nil || strings.TrimSpace(*c) == "" {
		return nil
	}
	return c
}

func (in CreateTransactionInput) toStore() store.TransactionInput {
	occurred, _ := time.Parse(occurredOnLayout, in.OccurredOn) // já validado
	return store.TransactionInput{
		AccountID:   in.AccountID,
		CategoryID:  normalizeCategory(in.CategoryID),
		Description: strings.TrimSpace(in.Description),
		Direction:   directionDB(in.Direction),
		AmountCents: in.AmountCents,
		OccurredOn:  occurred,
	}
}

func (in UpdateTransactionInput) toStore() store.TransactionInput {
	occurred, _ := time.Parse(occurredOnLayout, in.OccurredOn)
	return store.TransactionInput{
		CategoryID:  normalizeCategory(in.CategoryID),
		Description: strings.TrimSpace(in.Description),
		Direction:   directionDB(in.Direction),
		AmountCents: in.AmountCents,
		OccurredOn:  occurred,
	}
}

// Create cria a transação do usuário e devolve o recurso. store.ErrTransactionNotFound
// quando a conta/categoria do corpo não é do usuário (o handler responde 400).
func (s *Service) Create(ctx context.Context, userID string, in CreateTransactionInput) (TransactionDetail, error) {
	id, err := s.store.CreateTransaction(ctx, userID, in.toStore())
	if err != nil {
		return TransactionDetail{}, fmt.Errorf("transacoes: criar transação: %w", err)
	}
	return s.detail(ctx, userID, id)
}

// Update edita a transação (sem trocar de conta). store.ErrTransactionNotFound quando não existe.
func (s *Service) Update(ctx context.Context, userID, id string, in UpdateTransactionInput) (TransactionDetail, error) {
	if err := s.store.UpdateTransaction(ctx, userID, id, in.toStore()); err != nil {
		return TransactionDetail{}, fmt.Errorf("transacoes: editar transação: %w", err)
	}
	return s.detail(ctx, userID, id)
}

// Delete exclui a transação. store.ErrTransactionNotFound quando não existe.
func (s *Service) Delete(ctx context.Context, userID, id string) error {
	if err := s.store.DeleteTransaction(ctx, userID, id); err != nil {
		return fmt.Errorf("transacoes: excluir transação: %w", err)
	}
	return nil
}

// Get devolve a transação completa do usuário (pra pré-preencher a edição).
func (s *Service) Get(ctx context.Context, userID, id string) (TransactionDetail, error) {
	return s.detail(ctx, userID, id)
}

func (s *Service) detail(ctx context.Context, userID, id string) (TransactionDetail, error) {
	row, err := s.store.GetTransactionByID(ctx, userID, id)
	if err != nil {
		return TransactionDetail{}, fmt.Errorf("transacoes: carregar transação: %w", err)
	}
	return TransactionDetail{
		ID:           row.ID,
		AccountID:    row.AccountID,
		CategoryID:   row.CategoryID,
		Description:  row.Description,
		Direction:    directionView(row.Direction),
		AmountCents:  row.AmountCents,
		OccurredOn:   row.OccurredOn.Format(occurredOnLayout),
		AccountLabel: row.AccountName,
		Category:     row.CategoryName,
		Icon:         row.CategoryIcon,
	}, nil
}

// transactionInput cobre criação e edição pra um decoder genérico.
type transactionInput interface {
	validate() error
}

// decodeInput lê e valida o corpo JSON em dst. Em erro escreve 400 e devolve false.
func decodeInput[T transactionInput](w http.ResponseWriter, r *http.Request, dst *T) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "corpo inválido: esperado JSON de transação")
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

// writeTransactionError mapeia o erro do service. ErrTransactionNotFound vira o status
// informado (404 em leitura/edição/exclusão; 400 na criação, quando a conta/categoria do
// corpo não é do usuário); o resto é um 500 seguro com o erro real logado sob logTag.
func writeTransactionError(w http.ResponseWriter, err error, notFoundStatus int, notFoundMsg, logTag, serverErrMsg string) {
	if errors.Is(err, store.ErrTransactionNotFound) {
		httpx.WriteError(w, notFoundStatus, notFoundMsg)
		return
	}
	log.Printf("%s: %v", logTag, err)
	httpx.WriteError(w, http.StatusInternalServerError, serverErrMsg)
}

// CreateHandler responde POST /transactions criando a transação → 201 + recurso. Conta/
// categoria inválida (não é do usuário) → 400.
func CreateHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in CreateTransactionInput
		if !decodeInput(w, r, &in) {
			return
		}
		tx, err := svc.Create(r.Context(), userID, in)
		if err != nil {
			writeTransactionError(w, err, http.StatusBadRequest, "conta ou categoria inválida (não é sua)", "POST /transactions", "erro ao criar transação")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, tx)
	})
}

// GetTransactionHandler responde GET /transactions/{id} com a transação completa (404 se não existe).
func GetTransactionHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		tx, err := svc.Get(r.Context(), userID, r.PathValue("id"))
		if err != nil {
			writeTransactionError(w, err, http.StatusNotFound, "transação não encontrada", "GET /transactions/{id}", "erro ao buscar transação")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, tx)
	})
}

// UpdateHandler responde PATCH /transactions/{id} editando a transação → 200 + recurso.
func UpdateHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in UpdateTransactionInput
		if !decodeInput(w, r, &in) {
			return
		}
		tx, err := svc.Update(r.Context(), userID, r.PathValue("id"), in)
		if err != nil {
			writeTransactionError(w, err, http.StatusNotFound, "transação não encontrada", "PATCH /transactions/{id}", "erro ao editar transação")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, tx)
	})
}

// DeleteHandler responde DELETE /transactions/{id} excluindo a transação → 204.
func DeleteHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		if err := svc.Delete(r.Context(), userID, r.PathValue("id")); err != nil {
			writeTransactionError(w, err, http.StatusNotFound, "transação não encontrada", "DELETE /transactions/{id}", "erro ao excluir transação")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
