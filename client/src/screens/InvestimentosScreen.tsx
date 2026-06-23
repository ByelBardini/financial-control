import { useState } from 'react';
import { AssetDetailModal } from '../components/investimentos/AssetDetailModal';
import { AssetFormModal } from '../components/investimentos/AssetFormModal';
import { TradeModal } from '../components/investimentos/TradeModal';
import { DesktopInvestimentos } from '../components/desktop/DesktopInvestimentos';
import { MobileInvestimentos } from '../components/MobileInvestimentos';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import type { TradeSide } from '../lib/investmentTradeForm';
import type { AppRoute } from '../navigation/routes';

type InvestimentosScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// União discriminada do modal aberto: cadastrar ativo, ver detalhe, editar ativo, ou comprar/vender
// (lado + ticker travados). Só um modal por vez; null = nenhum.
type ModalState =
  | { kind: 'createAsset' }
  | { kind: 'detail'; assetId: string }
  | { kind: 'editAsset'; assetId: string }
  | { kind: 'trade'; assetId: string; ticker: string; side: TradeSide };

// Tela de Investimentos: escolhe o layout (desktop vs mobile), compartilha a máscara e é dona do
// estado dos modais (cadastro/detalhe/edição/operação). Os layouts disparam criar/abrir ativo; o
// detalhe transita pra comprar/vender/editar. O sucesso das mutations invalida e atualiza as telas.
export function InvestimentosScreen({
  route = 'investimentos',
  onNavigate,
  onLogout,
}: InvestimentosScreenProps) {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();
  const [modal, setModal] = useState<ModalState | null>(null);

  const openCreate = () => setModal({ kind: 'createAsset' });
  const openAsset = (assetId: string) => setModal({ kind: 'detail', assetId });
  const close = () => setModal(null);

  const layout = isDesktop ? (
    <DesktopInvestimentos
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCreateAsset={openCreate}
      onOpenAsset={openAsset}
    />
  ) : (
    <MobileInvestimentos
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCreateAsset={openCreate}
      onOpenAsset={openAsset}
    />
  );

  return (
    <>
      {layout}
      {modal?.kind === 'createAsset' ? <AssetFormModal mode="create" onClose={close} /> : null}
      {modal?.kind === 'editAsset' ? (
        <AssetFormModal mode="edit" assetId={modal.assetId} onClose={close} />
      ) : null}
      {modal?.kind === 'detail' ? (
        <AssetDetailModal
          assetId={modal.assetId}
          onClose={close}
          onTrade={(side, ticker) =>
            setModal({ kind: 'trade', assetId: modal.assetId, ticker, side })
          }
          onEdit={() => setModal({ kind: 'editAsset', assetId: modal.assetId })}
        />
      ) : null}
      {modal?.kind === 'trade' ? (
        <TradeModal
          assetId={modal.assetId}
          ticker={modal.ticker}
          side={modal.side}
          onClose={close}
        />
      ) : null}
    </>
  );
}
