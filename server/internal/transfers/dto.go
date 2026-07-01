// Package transfers expõe a transferência entre contas (dupla entrada) como um recurso HTTP:
// POST /transfers cria duas linhas kind='transfer' (débito na origem, crédito no destino). Reusa
// o store.CreateTransfer (insert atômico). "Pagar fatura" de cartão é uma transferência cujo
// destino é a conta credit_card. Ver docs/context/transacoes.md e server-api.md.
package transfers

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"financial-control/server/internal/store"
)

// occurredOnLayout é o formato da data de competência no corpo (YYYY-MM-DD).
const occurredOnLayout = "2006-01-02"

// defaultDescription é o fallback quando o corpo não traz descrição (a coluna é NOT NULL não-vazia).
const defaultDescription = "Transferência"

// CreateTransferInput é o corpo de criação. Description opcional (cai no fallback).
type CreateTransferInput struct {
	OriginAccountID      string `json:"originAccountId"`
	DestinationAccountID string `json:"destinationAccountId"`
	Description          string `json:"description"`
	AmountCents          int64  `json:"amountCents"`
	OccurredOn           string `json:"occurredOn"`
}

// TransferResult é o recurso devolvido (201): o group id do par + o eco dos campos.
type TransferResult struct {
	GroupID              string `json:"groupId"`
	OriginAccountID      string `json:"originAccountId"`
	DestinationAccountID string `json:"destinationAccountId"`
	AmountCents          int64  `json:"amountCents"`
	OccurredOn           string `json:"occurredOn"`
}

// validate confere os campos; a mensagem inclui o valor ofensivo (regra do CLAUDE.md) e o
// handler responde 400. A posse das contas (são do usuário, ativas) é checada no SQL.
func (in CreateTransferInput) validate() error {
	origin := strings.TrimSpace(in.OriginAccountID)
	destination := strings.TrimSpace(in.DestinationAccountID)
	if origin == "" {
		return errors.New("originAccountId vazio: informe a conta de origem")
	}
	if destination == "" {
		return errors.New("destinationAccountId vazio: informe a conta de destino")
	}
	if origin == destination {
		return fmt.Errorf("origem e destino iguais (%q): escolha contas diferentes", origin)
	}
	if in.AmountCents <= 0 {
		return fmt.Errorf("amountCents inválido (%d): deve ser maior que zero", in.AmountCents)
	}
	if _, err := time.Parse(occurredOnLayout, in.OccurredOn); err != nil {
		return fmt.Errorf("occurredOn inválido (%q): use o formato YYYY-MM-DD", in.OccurredOn)
	}
	return nil
}

// descOrDefault aplica o fallback de descrição (vazio/espaços → "Transferência").
func descOrDefault(s string) string {
	if strings.TrimSpace(s) == "" {
		return defaultDescription
	}
	return strings.TrimSpace(s)
}

// toStore mapeia o corpo (já validado) para o input do store.
func (in CreateTransferInput) toStore() store.TransferInput {
	occurred, _ := time.Parse(occurredOnLayout, in.OccurredOn) // já validado
	return store.TransferInput{
		OriginAccountID:      strings.TrimSpace(in.OriginAccountID),
		DestinationAccountID: strings.TrimSpace(in.DestinationAccountID),
		AmountCents:          in.AmountCents,
		Description:          descOrDefault(in.Description),
		OccurredOn:           occurred,
	}
}
