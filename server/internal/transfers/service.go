package transfers

import (
	"context"
	"fmt"
	"strings"

	"financial-control/server/internal/store"
)

// TransferStore é a dependência de dados da transferência (escopada por usuário).
type TransferStore interface {
	CreateTransfer(ctx context.Context, userID string, in store.TransferInput) (string, error)
}

// Service cria transferências entre contas. Sem estado além do store.
type Service struct {
	store TransferStore
}

// NewService injeta a dependência de dados.
//
//	svc := transfers.NewService(st)
func NewService(s TransferStore) *Service {
	return &Service{store: s}
}

// Create grava a transferência (dupla entrada) e devolve o resultado com o group id do par.
// store.ErrTransferInvalid quando origem==destino ou alguma conta não é do usuário/está arquivada
// (o handler responde 400).
func (s *Service) Create(ctx context.Context, userID string, in CreateTransferInput) (TransferResult, error) {
	gid, err := s.store.CreateTransfer(ctx, userID, in.toStore())
	if err != nil {
		return TransferResult{}, fmt.Errorf("transfers: criar transferência: %w", err)
	}
	return TransferResult{
		GroupID:              gid,
		OriginAccountID:      strings.TrimSpace(in.OriginAccountID),
		DestinationAccountID: strings.TrimSpace(in.DestinationAccountID),
		AmountCents:          in.AmountCents,
		OccurredOn:           in.OccurredOn,
	}, nil
}
