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

var validFrequencies = map[string]bool{"daily": true, "weekly": true, "monthly": true, "yearly": true}

// CreateRecurringRuleInput é o corpo de criação de uma regra de recorrência (transação Fixa).
// Direction em inflow/outflow (mapeado pro banco). Fim opcional e EXCLUSIVO: EndDate (até a
// data) OU MaxOccurrences (nº de vezes) — nunca os dois; nenhum = permanente.
type CreateRecurringRuleInput struct {
	AccountID      string  `json:"accountId"`
	CategoryID     *string `json:"categoryId"`
	Description    string  `json:"description"`
	Direction      string  `json:"direction"`
	AmountCents    int64   `json:"amountCents"`
	Frequency      string  `json:"frequency"`
	IntervalCount  int     `json:"intervalCount"`
	StartDate      string  `json:"startDate"`
	EndDate        *string `json:"endDate"`
	MaxOccurrences *int    `json:"maxOccurrences"`
}

// validate satisfaz transactionInput (reusa o decodeInput genérico). Mensagem inclui o valor
// ofensivo (regra do CLAUDE.md) — o handler responde 400.
func (in CreateRecurringRuleInput) validate() error {
	if strings.TrimSpace(in.AccountID) == "" {
		return errors.New("accountId vazio: informe a conta da recorrência")
	}
	if strings.TrimSpace(in.Description) == "" {
		return errors.New("description vazio: informe uma descrição não-vazia")
	}
	if !validDirections[in.Direction] {
		return fmt.Errorf("direction inválido (%q): use inflow|outflow", in.Direction)
	}
	if in.AmountCents <= 0 {
		return fmt.Errorf("amountCents inválido (%d): deve ser maior que zero", in.AmountCents)
	}
	if !validFrequencies[in.Frequency] {
		return fmt.Errorf("frequency inválido (%q): use daily|weekly|monthly|yearly", in.Frequency)
	}
	if in.IntervalCount < 1 {
		return fmt.Errorf("intervalCount inválido (%d): deve ser >= 1", in.IntervalCount)
	}
	if _, err := time.Parse(occurredOnLayout, in.StartDate); err != nil {
		return fmt.Errorf("startDate inválido (%q): use o formato YYYY-MM-DD", in.StartDate)
	}
	if in.EndDate != nil && in.MaxOccurrences != nil {
		return errors.New("fim inválido: use endDate OU maxOccurrences, nunca os dois")
	}
	if in.EndDate != nil {
		if _, err := time.Parse(occurredOnLayout, *in.EndDate); err != nil {
			return fmt.Errorf("endDate inválido (%q): use o formato YYYY-MM-DD", *in.EndDate)
		}
	}
	if in.MaxOccurrences != nil && *in.MaxOccurrences < 1 {
		return fmt.Errorf("maxOccurrences inválido (%d): deve ser >= 1", *in.MaxOccurrences)
	}
	return nil
}

// CreateRecurringRule registra a regra E lança a transação do período atual (atômico). 0 linhas
// (conta/categoria não é do usuário) → ErrTransactionNotFound (o handler responde 400).
func (s *Service) CreateRecurringRule(ctx context.Context, userID string, in CreateRecurringRuleInput) error {
	start, _ := time.Parse(occurredOnLayout, in.StartDate) // já validado
	var end *time.Time
	if in.EndDate != nil {
		e, _ := time.Parse(occurredOnLayout, *in.EndDate)
		end = &e
	}
	n, err := s.store.CreateRecurringRuleWithFirst(ctx, userID, store.RecurringRuleInput{
		AccountID:      in.AccountID,
		CategoryID:     normalizeCategory(in.CategoryID),
		Description:    strings.TrimSpace(in.Description),
		Direction:      directionDB(in.Direction),
		AmountCents:    in.AmountCents,
		Frequency:      in.Frequency,
		IntervalCount:  in.IntervalCount,
		StartDate:      start,
		EndDate:        end,
		MaxOccurrences: in.MaxOccurrences,
	})
	if err != nil {
		return fmt.Errorf("transacoes: criar recorrência: %w", err)
	}
	if n == 0 {
		return store.ErrTransactionNotFound
	}
	return nil
}

// RecurringRuleResult é a resposta de criar a recorrência: a regra ficou registrada (aparece
// em Recorrências) e 1 lançamento do período atual entrou no ledger.
type RecurringRuleResult struct {
	Created bool `json:"created"`
}

// CreateRecurringRuleHandler responde POST /recurring-rules registrando a regra + o lançamento
// de agora → 201 + {created:true}. Conta/categoria inválida (não é do usuário) → 400.
func CreateRecurringRuleHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		var in CreateRecurringRuleInput
		if !decodeInput(w, r, &in) {
			return
		}
		if err := svc.CreateRecurringRule(r.Context(), userID, in); err != nil {
			writeTransactionError(w, err, http.StatusBadRequest, "conta ou categoria inválida (não é sua)", "POST /recurring-rules", "erro ao criar recorrência")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, RecurringRuleResult{Created: true})
	})
}
