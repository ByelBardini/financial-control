import { render, screen, userEvent } from '@testing-library/react-native';
import { AppearancePicker } from '../../../src/components/contas/AppearancePicker';

describe('AppearancePicker', () => {
  it('marca a cor atual e troca cor/ícone ao tocar', async () => {
    const onChangeColor = jest.fn();
    const onChangeIcon = jest.fn();
    await render(
      <AppearancePicker
        dotColor="#d0bcff"
        icon="account_balance"
        onChangeColor={onChangeColor}
        onChangeIcon={onChangeIcon}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText('Cor #d0bcff')).toBeSelected();

    await user.press(screen.getByLabelText('Cor #9ddf2e'));
    expect(onChangeColor).toHaveBeenCalledWith('#9ddf2e');

    await user.press(screen.getByLabelText('Ícone restaurant'));
    expect(onChangeIcon).toHaveBeenCalledWith('restaurant');
  });
});
