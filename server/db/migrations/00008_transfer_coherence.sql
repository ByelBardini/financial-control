-- +goose Up
-- Transferência entre contas = dupla entrada (duas linhas com o mesmo transfer_group_id:
-- uma 'expense' na origem, uma 'income' no destino). Aqui só o guarda por linha: o
-- transfer_group_id existe SE E SOMENTE SE kind='transfer' — espelha tx_installment_coherent.
-- A integridade do PAR (exatamente duas pernas, sentidos opostos, mesmo valor) é garantida
-- pelo INSERT de statement único do store (CreateTransfer), não por este CHECK (uma linha não
-- enxerga a irmã), igual à liquidação de investimento. Ver docs/context/transacoes.md.

ALTER TABLE transactions ADD CONSTRAINT tx_transfer_coherent CHECK (
    (kind =  'transfer' AND transfer_group_id IS NOT NULL)
    OR
    (kind <> 'transfer' AND transfer_group_id IS NULL)
);

-- +goose Down
ALTER TABLE transactions DROP CONSTRAINT tx_transfer_coherent;
