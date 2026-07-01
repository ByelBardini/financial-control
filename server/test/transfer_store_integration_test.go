//go:build integration

package test

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/store"
)

// userABinanceAcc é a conta exchange do usuário A no seed (usada arquivada no teste de rejeição).
const userABinanceAcc = "a0000000-0000-0000-0000-000000000003"

// TestCreateTransferStore exercita o store.CreateTransfer direto: o caminho feliz move ±valor e
// grava duas pernas no mesmo grupo; e a tabela de rejeições (origem==destino, conta alheia,
// conta arquivada) devolve ErrTransferInvalid sem inserir nada.
func TestCreateTransferStore(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn)

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	today := time.Now()
	balance := func(id string) int64 {
		acc, err := st.GetAccountByID(ctx, userAID, id)
		if err != nil {
			t.Fatalf("GetAccountByID(%s): %v", id, err)
		}
		return acc.BalanceCents
	}

	t.Run("move ±valor e cria 2 pernas no mesmo grupo", func(t *testing.T) {
		origemAntes := balance(userANubankAcc)
		destinoAntes := balance(userACarteiraAcc)

		gid, err := st.CreateTransfer(ctx, userAID, store.TransferInput{
			OriginAccountID:      userANubankAcc,
			DestinationAccountID: userACarteiraAcc,
			AmountCents:          10000,
			Description:          "Transferência",
			OccurredOn:           today,
		})
		if err != nil {
			t.Fatalf("CreateTransfer: %v", err)
		}
		if gid == "" {
			t.Fatal("group id vazio")
		}
		if got := balance(userANubankAcc); got != origemAntes-10000 {
			t.Errorf("saldo origem = %d, quero %d (caiu 100,00)", got, origemAntes-10000)
		}
		if got := balance(userACarteiraAcc); got != destinoAntes+10000 {
			t.Errorf("saldo destino = %d, quero %d (subiu 100,00)", got, destinoAntes+10000)
		}
		assertTransferLegs(t, ctx, dsn, gid, userANubankAcc, userACarteiraAcc, 10000)
	})

	t.Run("origem == destino → inválida", func(t *testing.T) {
		_, err := st.CreateTransfer(ctx, userAID, store.TransferInput{
			OriginAccountID:      userANubankAcc,
			DestinationAccountID: userANubankAcc,
			AmountCents:          5000,
			Description:          "x",
			OccurredOn:           today,
		})
		if !errors.Is(err, store.ErrTransferInvalid) {
			t.Errorf("err = %v, quero ErrTransferInvalid", err)
		}
	})

	t.Run("conta alheia (inexistente p/ o usuário) → inválida", func(t *testing.T) {
		const alheia = "11111111-1111-1111-1111-111111111111"
		_, err := st.CreateTransfer(ctx, userAID, store.TransferInput{
			OriginAccountID:      userANubankAcc,
			DestinationAccountID: alheia,
			AmountCents:          5000,
			Description:          "x",
			OccurredOn:           today,
		})
		if !errors.Is(err, store.ErrTransferInvalid) {
			t.Errorf("err = %v, quero ErrTransferInvalid", err)
		}
	})

	t.Run("conta arquivada → inválida", func(t *testing.T) {
		archiveAccountRaw(t, ctx, dsn, userABinanceAcc)
		_, err := st.CreateTransfer(ctx, userAID, store.TransferInput{
			OriginAccountID:      userANubankAcc,
			DestinationAccountID: userABinanceAcc,
			AmountCents:          5000,
			Description:          "x",
			OccurredOn:           today,
		})
		if !errors.Is(err, store.ErrTransferInvalid) {
			t.Errorf("err = %v, quero ErrTransferInvalid", err)
		}
	})
}

// assertTransferLegs confere que o grupo tem exatamente 2 linhas kind='transfer': a perna de
// saída (expense) na origem e a de entrada (income) no destino, ambas com o valor esperado.
func assertTransferLegs(t *testing.T, ctx context.Context, dsn, groupID, origin, destination string, wantCents int64) {
	t.Helper()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pgx.Connect: %v", err)
	}
	defer conn.Close(ctx)
	rows, err := conn.Query(ctx, `
		SELECT direction, account_id::text, (amount*100)::bigint
		FROM transactions
		WHERE transfer_group_id = $1 AND kind = 'transfer'
		ORDER BY direction`, groupID)
	if err != nil {
		t.Fatalf("consultar pernas: %v", err)
	}
	defer rows.Close()
	type leg struct {
		direction string
		accountID string
		cents     int64
	}
	var legs []leg
	for rows.Next() {
		var l leg
		if err := rows.Scan(&l.direction, &l.accountID, &l.cents); err != nil {
			t.Fatalf("scan perna: %v", err)
		}
		legs = append(legs, l)
	}
	if len(legs) != 2 {
		t.Fatalf("len pernas = %d, quero 2 (dupla entrada)", len(legs))
	}
	// ORDER BY direction → 'expense' (saída/origem) antes de 'income' (entrada/destino).
	if legs[0].direction != "expense" || legs[0].accountID != origin || legs[0].cents != wantCents {
		t.Errorf("perna de saída = %+v, quero {expense, %s, %d}", legs[0], origin, wantCents)
	}
	if legs[1].direction != "income" || legs[1].accountID != destination || legs[1].cents != wantCents {
		t.Errorf("perna de entrada = %+v, quero {income, %s, %d}", legs[1], destination, wantCents)
	}
}

// archiveAccountRaw marca uma conta como arquivada via SQL (pra o teste de rejeição).
func archiveAccountRaw(t *testing.T, ctx context.Context, dsn, accountID string) {
	t.Helper()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pgx.Connect: %v", err)
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, `UPDATE accounts SET is_archived = true WHERE id = $1`, accountID); err != nil {
		t.Fatalf("arquivar conta: %v", err)
	}
}
