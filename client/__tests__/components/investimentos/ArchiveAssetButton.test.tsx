import { render, screen, userEvent } from '@testing-library/react-native';
import { ArchiveAssetButton } from '../../../src/components/investimentos/ArchiveAssetButton';

describe('ArchiveAssetButton', () => {
  it('confirma em dois passos e chama onArchive', async () => {
    const onArchive = jest.fn();
    await render(<ArchiveAssetButton onArchive={onArchive} />);
    const user = userEvent.setup();

    // passo 1: só o gatilho, sem o confirmar ainda
    expect(screen.queryByRole('button', { name: 'Confirmar arquivamento' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Arquivar ativo' }));

    // passo 2: confirma
    await user.press(screen.getByRole('button', { name: 'Confirmar arquivamento' }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('cancelar volta ao passo 1 sem arquivar', async () => {
    const onArchive = jest.fn();
    await render(<ArchiveAssetButton onArchive={onArchive} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Arquivar ativo' }));
    await user.press(screen.getByRole('button', { name: 'Cancelar arquivamento' }));

    expect(onArchive).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Arquivar ativo' })).toBeOnTheScreen();
  });

  it('desabilita o confirmar enquanto arquiva', async () => {
    await render(<ArchiveAssetButton onArchive={jest.fn()} archiving={true} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Arquivar ativo' }));
    expect(screen.getByRole('button', { name: 'Confirmar arquivamento' })).toBeDisabled();
  });
});
