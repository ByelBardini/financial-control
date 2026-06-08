import { render, screen, userEvent } from '@testing-library/react-native';
import { ArchiveAccountButton } from '../../../src/components/contas/ArchiveAccountButton';

describe('ArchiveAccountButton', () => {
  it('confirma em dois passos e chama onArchive', async () => {
    const onArchive = jest.fn();
    await render(<ArchiveAccountButton onArchive={onArchive} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Arquivar conta' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar arquivamento' }));

    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('cancelar volta ao gatilho sem arquivar', async () => {
    const onArchive = jest.fn();
    await render(<ArchiveAccountButton onArchive={onArchive} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Arquivar conta' }));
    await user.press(screen.getByRole('button', { name: 'Cancelar arquivamento' }));

    expect(onArchive).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Arquivar conta' })).toBeOnTheScreen();
  });
});
