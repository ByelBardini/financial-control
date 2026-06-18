package transacoes

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"financial-control/server/internal/httpx"
	"financial-control/server/internal/store"
)

// Limites de parcelas (UX/sanidade): mínimo 2 (1 parcela = transação avulsa), teto 48.
const (
	minInstallments = 2
	maxInstallments = 48
)

// CreateInstallmentInput é o corpo de criação de uma compra parcelada. AmountCents é o valor
// de UMA parcela; TotalInstallments é o nº de parcelas; OccurredOn é a data da 1ª parcela.
// CategoryID opcional. Parcelamento é sempre despesa (o server fixa direction='expense').
type CreateInstallmentInput struct {
	AccountID         string  `json:"accountId"`
	CategoryID        *string `json:"categoryId"`
	Description       string  `json:"description"`
	AmountCents       int64   `json:"amountCents"`
	TotalInstallments int     `json:"totalInstallments"`
	OccurredOn        string  `json:"occurredOn"`
}

// validate satisfaz transactionInput (reusa o decodeInput genérico). Mensagem inclui o valor
// ofensivo (regra do CLAUDE.md) — o handler responde 400.
func (in CreateInstallmentInput) validate() error {
	if strings.TrimSpace(in.AccountID) == "" {
		return errors.New("accountId vazio: informe a conta da compra")
	}
	if strings.TrimSpace(in.Description) == "" {
		return errors.New("description vazio: informe uma descrição não-vazia")
	}
	if in.AmountCents <= 0 {
		return fmt.Errorf("amountCents inválido (%d): deve ser maior que zero", in.AmountCents)
	}
	if in.TotalInstallments < minInstallments || in.TotalInstallments > maxInstallments {
		return fmt.Errorf("totalInstallments inválido (%d): use entre %d e %d", in.TotalInstallments, minInstallments, maxInstallments)
	}
	if _, err := time.Parse(occurredOnLayout, in.OccurredOn); err != nil {
		return fmt.Errorf("occurredOn inválido (%q): use o formato YYYY-MM-DD", in.OccurredOn)
	}
	return nil
}

// CreateInstallmentPurchase cria as N parcelas (valor por parcela) atomicamente. 0 linhas
// (conta/categoria não é do usuário) → ErrTransactionNotFound (o handler responde 400).
func (s *Service) CreateInstallmentPurchase(ctx context.Context, userID string, in CreateInstallmentInput) error {
	occurred, _ := time.Parse(occurredOnLayout, in.OccurredOn) // já validado
	n, err := s.store.CreateInstallmentPurchase(ctx, userID, store.InstallmentInput{
		AccountID:   in.AccountID,
		CategoryID:  normalizeCategory(in.CategoryID),
		Description: strings.TrimSpace(in.Description),
		AmountCents: in.AmountCents,
		Total:       in.TotalInstallments,
		OccurredOn:  occurred,
	})
	if err != nil {
		return fmt.Errorf("transacoes: criar compra parcelada: %w", err)
	}
	if n == 0 {
		return store.ErrTransactionNotFound
	}
	return nil
}

// InstallmentResult é a resposta de criar a compra parcelada: quantas parcelas foram criadas
// (a lista/dívidas/saldo refletem na próxima leitura).
type InstallmentResult struct {
	Created int `json:"created"`
}

// CreateInstallmentHandler responde POST /transactions/installment-purchases criando as N
// parcelas → 201 + {created:N}. Conta/categoria inválida (não é do usuário) → 400.
func CreateInstallmentHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in CreateInstallmentInput
		if !decodeInput(w, r, &in) {
			return
		}
		if err := svc.CreateInstallmentPurchase(r.Context(), userID, in); err != nil {
			writeTransactionError(w, err, http.StatusBadRequest, "conta ou categoria inválida (não é sua)", "POST /transactions/installment-purchases", "erro ao criar compra parcelada")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, InstallmentResult{Created: in.TotalInstallments})
	})
}
