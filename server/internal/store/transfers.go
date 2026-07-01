package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"financial-control/server/internal/store/gen"
)

// ErrTransferInvalid sinaliza uma transferência recusada na borda do SQL: origem == destino,
// ou origem/destino não é do usuário (ou está arquivada). O handler a trata como 400.
var ErrTransferInvalid = errors.New("transferência inválida")

// TransferInput são os campos de uma transferência entre contas (dupla entrada). Dinheiro em
// centavos; Description nunca vazia (o domínio aplica fallback); OccurredOn é a competência.
type TransferInput struct {
	OriginAccountID      string
	DestinationAccountID string
	AmountCents          int64
	Description          string
	OccurredOn           time.Time
}

// CreateTransfer grava a transferência como duas linhas kind='transfer' (uma a débito na origem,
// uma a crédito no destino) num único statement atômico e devolve o transfer_group_id do par.
// As duas contas precisam ser do usuário e não arquivadas, e origem ≠ destino — senão 0 linhas
// e ErrTransferInvalid. uuid malformado falha fechado (também ErrTransferInvalid).
func (s *Store) CreateTransfer(ctx context.Context, userID string, in TransferInput) (string, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return "", err
	}
	oid, err := uuidArg(in.OriginAccountID)
	if err != nil {
		return "", ErrTransferInvalid
	}
	did, err := uuidArg(in.DestinationAccountID)
	if err != nil {
		return "", ErrTransferInvalid
	}
	groups, err := s.q.CreateTransfer(ctx, gen.CreateTransferParams{
		UserID:               uid,
		Description:          in.Description,
		AmountCents:          in.AmountCents,
		OccurredOn:           dateArg(in.OccurredOn),
		OriginAccountID:      oid,
		DestinationAccountID: did,
	})
	if err != nil {
		return "", fmt.Errorf("store: criar transferência: %w", err)
	}
	if len(groups) == 0 {
		return "", ErrTransferInvalid
	}
	return groups[0], nil
}
