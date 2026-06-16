import { render, screen, userEvent } from '@testing-library/react-native';
import { SelectField, type SelectOption } from '../../src/components/SelectField';

const options = [
  { value: 'a', label: 'Opção A' },
  { value: 'b', label: 'Opção B' },
];

describe('SelectField', () => {
  it('abre, lista as opções e escolhe (fechando)', async () => {
    const onChange = jest.fn();
    await render(
      <SelectField
        label="Conta"
        value=""
        options={options}
        onChange={onChange}
        placeholder="Escolha"
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Conta: Escolha'));
    await user.press(screen.getByRole('menuitem', { name: 'Opção B' }));

    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('mostra o label da opção atual quando há valor', async () => {
    await render(<SelectField label="Conta" value="a" options={options} onChange={jest.fn()} />);
    expect(screen.getByLabelText('Conta: Opção A')).toBeOnTheScreen();
  });

  it('disabled não abre o menu', async () => {
    await render(
      <SelectField label="Conta" value="a" options={options} onChange={jest.fn()} disabled />,
    );
    const user = userEvent.setup();
    const trigger = screen.getByLabelText('Conta: Opção A');

    expect(trigger).toBeDisabled();
    await user.press(trigger);
    expect(screen.queryByRole('menuitem', { name: 'Opção B' })).toBeNull();
  });

  it('mostra o erro', async () => {
    await render(
      <SelectField
        label="Conta"
        value=""
        options={options}
        onChange={jest.fn()}
        error="Escolha uma conta."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha uma conta.');
  });

  it('renderiza o ícone da opção atual no gatilho e em cada opção', async () => {
    const withIcons: SelectOption[] = [
      { value: 'a', label: 'Nubank', icon: 'account_balance', dotColor: '#d0bcff' },
      { value: 'b', label: 'Itaú', icon: 'account_balance', dotColor: '#004990' },
    ];
    await render(<SelectField label="Conta" value="a" options={withIcons} onChange={jest.fn()} />);
    const user = userEvent.setup();

    expect(
      screen.getByTestId('select-trigger-icon', { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    await user.press(screen.getByLabelText('Conta: Nubank'));
    expect(
      screen.getByTestId('select-option-icon-a', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('select-option-icon-b', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });
});
