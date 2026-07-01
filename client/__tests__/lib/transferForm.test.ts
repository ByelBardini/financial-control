import {
  initialTransferValues,
  toCreateTransferInput,
  validateTransferForm,
  type TransferFormValues,
} from '../../src/lib/transferForm';

const base: TransferFormValues = {
  originAccountId: 'a1',
  destinationAccountId: 'a2',
  amountCents: 10000,
  occurredOn: '2026-06-15',
  description: '',
};

describe('validateTransferForm', () => {
  it('aceita uma transferência válida (sem erros)', () => {
    expect(validateTransferForm(base)).toEqual({});
  });

  it('exige origem e destino', () => {
    const errors = validateTransferForm({ ...base, originAccountId: '', destinationAccountId: '' });
    expect(errors.origin).toBeDefined();
    expect(errors.destination).toBeDefined();
  });

  it('rejeita origem == destino', () => {
    const errors = validateTransferForm({ ...base, destinationAccountId: 'a1' });
    expect(errors.destination).toContain('diferentes');
  });

  it('rejeita valor <= 0', () => {
    expect(validateTransferForm({ ...base, amountCents: 0 }).amount).toBeDefined();
  });

  it('rejeita data fora do formato', () => {
    expect(validateTransferForm({ ...base, occurredOn: '15/06/2026' }).date).toBeDefined();
  });
});

describe('toCreateTransferInput', () => {
  it('serializa os campos; descrição vazia some do corpo', () => {
    expect(toCreateTransferInput(base)).toEqual({
      originAccountId: 'a1',
      destinationAccountId: 'a2',
      amountCents: 10000,
      occurredOn: '2026-06-15',
    });
  });

  it('mantém a descrição quando preenchida (com trim)', () => {
    expect(toCreateTransferInput({ ...base, description: '  Fatura  ' }).description).toBe(
      'Fatura',
    );
  });
});

describe('initialTransferValues', () => {
  it('zera os campos e usa a data informada', () => {
    expect(initialTransferValues('2026-06-30')).toEqual({
      originAccountId: '',
      destinationAccountId: '',
      amountCents: 0,
      occurredOn: '2026-06-30',
      description: '',
    });
  });
});
