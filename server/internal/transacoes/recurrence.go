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

// CreateRecurringRule registra a regra (modelo puro — NÃO lança transação; as ocorrências, inclusive
// a do período atual, são registradas pelo botão via RegisterOccurrence). 0 linhas (conta/categoria
// não é do usuário) → ErrTransactionNotFound (o handler responde 400).
func (s *Service) CreateRecurringRule(ctx context.Context, userID string, in CreateRecurringRuleInput) error {
	start, _ := time.Parse(occurredOnLayout, in.StartDate) // já validado
	var end *time.Time
	if in.EndDate != nil {
		e, _ := time.Parse(occurredOnLayout, *in.EndDate)
		end = &e
	}
	n, err := s.store.CreateRecurringRule(ctx, userID, store.RecurringRuleInput{
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

// RecurringRuleResult é a resposta de criar a recorrência: a regra (modelo) ficou registrada e
// aparece em Recorrências, pronta pra ter cada ocorrência registrada pelo botão. Nenhum lançamento
// é criado aqui.
type RecurringRuleResult struct {
	Created bool `json:"created"`
}

// CreateRecurringRuleHandler responde POST /recurring-rules registrando a regra (modelo, sem
// lançar transação) → 201 + {created:true}. Conta/categoria inválida (não é do usuário) → 400.
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

// ErrOccurrenceNotDue: a ocorrência do período corrente não está disponível pra registro — já foi
// registrada (1×/período), a regra ainda não começou, ou já encerrou. O handler responde 409.
var ErrOccurrenceNotDue = errors.New("transacoes: ocorrência do período não está disponível para registro")

// RegisterOccurrence lança a transação do período corrente de uma recorrência (occurred_on = hoje,
// do relógio injetado) e devolve o recurso criado. Recarrega a regra + agregados e revalida o
// "devido" (anti clique-duplo): ErrOccurrenceNotDue se o período já foi coberto/está fora da janela;
// store.ErrTransactionNotFound se a regra não é do usuário ou está inativa.
func (s *Service) RegisterOccurrence(ctx context.Context, userID, ruleID string) (TransactionDetail, error) {
	rule, err := s.store.GetRecurringRuleForRegister(ctx, userID, ruleID)
	if err != nil {
		return TransactionDetail{}, fmt.Errorf("transacoes: carregar recorrência: %w", err)
	}
	today := s.now()
	if !isDue(rule.Frequency, rule.StartDate, rule.EndDate, rule.MaxOccurrences, rule.LastOccurredOn, rule.OccurrenceCount, today) {
		return TransactionDetail{}, ErrOccurrenceNotDue
	}
	id, err := s.store.RegisterRecurringOccurrence(ctx, userID, ruleID, today)
	if err != nil {
		return TransactionDetail{}, fmt.Errorf("transacoes: registrar ocorrência: %w", err)
	}
	return s.detail(ctx, userID, id)
}

// RegisterRecurrenceHandler responde POST /recurring-rules/{id}/register lançando a ocorrência do
// período corrente → 201 + a transação criada. Já registrada neste período / fora da janela → 409;
// regra inexistente ou não é do usuário → 404.
func RegisterRecurrenceHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		tx, err := svc.RegisterOccurrence(r.Context(), userID, r.PathValue("id"))
		if err != nil {
			if errors.Is(err, ErrOccurrenceNotDue) {
				httpx.WriteError(w, http.StatusConflict, "esta recorrência já foi registrada neste período")
				return
			}
			writeTransactionError(w, err, http.StatusNotFound, "recorrência não encontrada", "POST /recurring-rules/{id}/register", "erro ao registrar ocorrência")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, tx)
	})
}
