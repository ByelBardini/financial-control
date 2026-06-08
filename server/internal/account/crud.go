package account

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
	"financial-control/server/internal/store"
)

// AccountDetail é a conta completa devolvida por GET/criar/editar (valores em centavos).
type AccountDetail struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	AccountType      string `json:"accountType"`
	Subtitle         string `json:"subtitle"`
	BalanceCents     int64  `json:"balanceCents"`
	Icon             string `json:"icon"`
	Tone             string `json:"tone"`
	DotColor         string `json:"dotColor"`
	CreditLimitCents int64  `json:"creditLimitCents"`
}

// CreateAccountInput é o corpo de criação (inclui o saldo inicial). Subtitle e
// CreditLimitCents são opcionais (nil = ausente → NULL no banco).
type CreateAccountInput struct {
	Name                string  `json:"name"`
	AccountType         string  `json:"accountType"`
	OpeningBalanceCents int64   `json:"openingBalanceCents"`
	Icon                string  `json:"icon"`
	Tone                string  `json:"tone"`
	DotColor            string  `json:"dotColor"`
	Subtitle            *string `json:"subtitle"`
	CreditLimitCents    *int64  `json:"creditLimitCents"`
}

// UpdateAccountInput é o corpo de edição. NÃO tem saldo: o opening_balance nunca é
// editável (saldo só muda via transações).
type UpdateAccountInput struct {
	Name             string  `json:"name"`
	AccountType      string  `json:"accountType"`
	Icon             string  `json:"icon"`
	Tone             string  `json:"tone"`
	DotColor         string  `json:"dotColor"`
	Subtitle         *string `json:"subtitle"`
	CreditLimitCents *int64  `json:"creditLimitCents"`
}

var (
	validAccountTypes = map[string]bool{
		"checking": true, "savings": true, "cash": true,
		"voucher": true, "credit_card": true, "exchange": true,
	}
	validTones = map[string]bool{"primary": true, "secondary": true, "error": true, "neutral": true}
	hexColor   = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
)

// errConvertToCard sinaliza tentativa de converter uma conta existente em credit_card
// pela edição — proibido. O POST garante que todo cartão nasce com opening_balance 0
// (cartão não tem saldo, só fatura); como a edição nunca mexe no saldo, deixar X→cartão
// passar deixaria um opening_balance fantasma vazando no /contas/cards e no Raio-X.
var errConvertToCard = errors.New("conversão inválida para cartão de crédito")

// validateAccountFields valida os campos comuns de criação/edição. Mensagem inclui o
// valor ofensivo + a forma esperada (regra do CLAUDE.md) — o handler responde 400.
func validateAccountFields(name, accountType, tone, dotColor, icon string, creditLimitCents *int64) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("name vazio: informe um nome não-vazio")
	}
	if !validAccountTypes[accountType] {
		return fmt.Errorf("accountType inválido (%q): use checking|savings|cash|voucher|credit_card|exchange", accountType)
	}
	if !validTones[tone] {
		return fmt.Errorf("tone inválido (%q): use primary|secondary|error|neutral", tone)
	}
	if !hexColor.MatchString(dotColor) {
		return fmt.Errorf("dotColor inválido (%q): use #RRGGBB", dotColor)
	}
	if strings.TrimSpace(icon) == "" {
		return errors.New("icon vazio: informe o nome do ícone")
	}
	if creditLimitCents != nil {
		if accountType != "credit_card" {
			return fmt.Errorf("creditLimitCents só é válido para credit_card (accountType recebido %q)", accountType)
		}
		if *creditLimitCents < 0 {
			return fmt.Errorf("creditLimitCents inválido (%d): não pode ser negativo", *creditLimitCents)
		}
	}
	return nil
}

func (in CreateAccountInput) validate() error {
	// Cartão antes do check de negativo: qualquer saldo inicial (positivo OU negativo)
	// recebe a mensagem específica do cartão, não a genérica de "não pode ser negativo".
	if in.AccountType == "credit_card" && in.OpeningBalanceCents != 0 {
		return fmt.Errorf("openingBalanceCents inválido (%d): cartão de crédito não tem saldo inicial (use 0; o saldo é só a fatura)", in.OpeningBalanceCents)
	}
	if in.OpeningBalanceCents < 0 {
		return fmt.Errorf("openingBalanceCents inválido (%d): não pode ser negativo", in.OpeningBalanceCents)
	}
	return validateAccountFields(in.Name, in.AccountType, in.Tone, in.DotColor, in.Icon, in.CreditLimitCents)
}

func (in UpdateAccountInput) validate() error {
	return validateAccountFields(in.Name, in.AccountType, in.Tone, in.DotColor, in.Icon, in.CreditLimitCents)
}

func (in CreateAccountInput) toStore() store.AccountInput {
	return store.AccountInput{
		Name:                in.Name,
		AccountType:         in.AccountType,
		OpeningBalanceCents: in.OpeningBalanceCents,
		Icon:                in.Icon,
		Tone:                in.Tone,
		DotColor:            in.DotColor,
		Subtitle:            in.Subtitle,
		CreditLimitCents:    in.CreditLimitCents,
	}
}

// toStore não define OpeningBalanceCents: o store.UpdateAccount ignora o saldo.
func (in UpdateAccountInput) toStore() store.AccountInput {
	return store.AccountInput{
		Name:             in.Name,
		AccountType:      in.AccountType,
		Icon:             in.Icon,
		Tone:             in.Tone,
		DotColor:         in.DotColor,
		Subtitle:         in.Subtitle,
		CreditLimitCents: in.CreditLimitCents,
	}
}

// Create cria a conta do usuário e devolve o recurso (com saldo derivado).
func (s *Service) Create(ctx context.Context, userID string, in CreateAccountInput) (AccountDetail, error) {
	id, err := s.store.CreateAccount(ctx, userID, in.toStore())
	if err != nil {
		return AccountDetail{}, fmt.Errorf("account: criar conta: %w", err)
	}
	return s.detail(ctx, userID, id)
}

// Update edita a conta (sem mexer no saldo). Rejeita converter uma conta existente em
// credit_card (errConvertToCard → 400) pra não deixar saldo fantasma virar fatura.
// store.ErrAccountNotFound quando não existe.
func (s *Service) Update(ctx context.Context, userID, id string, in UpdateAccountInput) (AccountDetail, error) {
	current, err := s.store.GetAccountByID(ctx, userID, id)
	if err != nil {
		return AccountDetail{}, fmt.Errorf("account: carregar conta para editar: %w", err)
	}
	if in.AccountType == "credit_card" && current.AccountType != "credit_card" {
		return AccountDetail{}, fmt.Errorf("%w (tipo atual %q): cartão não tem saldo inicial; crie um cartão novo", errConvertToCard, current.AccountType)
	}
	if err := s.store.UpdateAccount(ctx, userID, id, in.toStore()); err != nil {
		return AccountDetail{}, fmt.Errorf("account: editar conta: %w", err)
	}
	return s.detail(ctx, userID, id)
}

// Archive faz soft-delete da conta. store.ErrAccountNotFound quando não existe.
func (s *Service) Archive(ctx context.Context, userID, id string) error {
	if err := s.store.ArchiveAccount(ctx, userID, id); err != nil {
		return fmt.Errorf("account: arquivar conta: %w", err)
	}
	return nil
}

// Get devolve a conta completa do usuário (pra pré-preencher a edição).
func (s *Service) Get(ctx context.Context, userID, id string) (AccountDetail, error) {
	return s.detail(ctx, userID, id)
}

func (s *Service) detail(ctx context.Context, userID, id string) (AccountDetail, error) {
	row, err := s.store.GetAccountByID(ctx, userID, id)
	if err != nil {
		return AccountDetail{}, fmt.Errorf("account: carregar conta: %w", err)
	}
	return AccountDetail{
		ID:               row.ID,
		Name:             row.Name,
		AccountType:      row.AccountType,
		Subtitle:         row.Subtitle,
		BalanceCents:     row.BalanceCents,
		Icon:             row.Icon,
		Tone:             row.Tone,
		DotColor:         row.DotColor,
		CreditLimitCents: row.CreditLimitCents,
	}, nil
}

// accountInput cobre criação e edição pra um decoder genérico.
type accountInput interface {
	validate() error
}

// decodeInput lê e valida o corpo JSON em dst. Em erro escreve 400 e devolve false.
func decodeInput[T accountInput](w http.ResponseWriter, r *http.Request, dst *T) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "corpo inválido: esperado JSON de conta")
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

// writeAccountError mapeia o erro do service para o status HTTP e responde, num só
// lugar pros quatro handlers. Sentinelas conhecidos viram 4xx (404 conta inexistente,
// 400 conversão proibida pra cartão); o resto é um 500 seguro (mensagem fixed) com o
// erro real logado sob logTag. Handlers que não produzem um dado sentinela simplesmente
// nunca caem nele.
func writeAccountError(w http.ResponseWriter, err error, logTag, serverErrMsg string) {
	switch {
	case errors.Is(err, store.ErrAccountNotFound):
		httpx.WriteError(w, http.StatusNotFound, "conta não encontrada")
	case errors.Is(err, errConvertToCard):
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		log.Printf("%s: %v", logTag, err)
		httpx.WriteError(w, http.StatusInternalServerError, serverErrMsg)
	}
}

// GetHandler responde GET /accounts/{id} com a conta completa (404 se não existe).
func GetHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		acc, err := svc.Get(r.Context(), userID, r.PathValue("id"))
		if err != nil {
			writeAccountError(w, err, "GET /accounts/{id}", "erro ao buscar conta")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, acc)
	})
}

// CreateHandler responde POST /accounts criando a conta → 201 + recurso.
func CreateHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in CreateAccountInput
		if !decodeInput(w, r, &in) {
			return
		}
		acc, err := svc.Create(r.Context(), userID, in)
		if err != nil {
			writeAccountError(w, err, "POST /accounts", "erro ao criar conta")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, acc)
	})
}

// UpdateHandler responde PATCH /accounts/{id} editando a conta (sem saldo) → 200 + recurso.
func UpdateHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in UpdateAccountInput
		if !decodeInput(w, r, &in) {
			return
		}
		acc, err := svc.Update(r.Context(), userID, r.PathValue("id"), in)
		if err != nil {
			writeAccountError(w, err, "PATCH /accounts/{id}", "erro ao editar conta")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, acc)
	})
}

// ArchiveHandler responde DELETE /accounts/{id} arquivando a conta → 204.
func ArchiveHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		err := svc.Archive(r.Context(), userID, r.PathValue("id"))
		if err != nil {
			writeAccountError(w, err, "DELETE /accounts/{id}", "erro ao arquivar conta")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
