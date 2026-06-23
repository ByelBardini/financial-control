import { ModalSheet, apiErrorMessage } from '../ModalSheet';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { AssetForm } from './AssetForm';
import {
  assetDetailToFormValues,
  initialAssetValues,
  toCreateAssetInput,
  toUpdateAssetInput,
  type AssetFormValues,
} from '../../lib/assetForm';
import {
  useArchiveAsset,
  useAsset,
  useCreateAsset,
  useUpdateAsset,
} from '../../hooks/useInvestmentMutations';

type AssetFormModalProps = {
  mode: 'create' | 'edit';
  assetId?: string;
  onClose: () => void;
};

// Modal de criar/editar ATIVO. Monta as mutations, pré-preenche a edição (useAsset) e fecha no
// sucesso. Espelha o AccountFormModal usando a casca compartilhada ModalSheet.
export function AssetFormModal({ mode, assetId, onClose }: AssetFormModalProps) {
  const createMut = useCreateAsset();
  const updateMut = useUpdateAsset();
  const archiveMut = useArchiveAsset();
  const detail = useAsset(mode === 'edit' ? assetId : undefined);

  const submitting = createMut.isPending || updateMut.isPending;
  const serverError = apiErrorMessage(createMut.error ?? updateMut.error ?? archiveMut.error);

  function handleCreate(values: AssetFormValues) {
    createMut.mutate(toCreateAssetInput(values), { onSuccess: onClose });
  }
  function handleUpdate(values: AssetFormValues) {
    if (!assetId) return;
    updateMut.mutate({ id: assetId, input: toUpdateAssetInput(values) }, { onSuccess: onClose });
  }
  function handleArchive() {
    if (!assetId) return;
    archiveMut.mutate(assetId, { onSuccess: onClose });
  }

  return (
    <ModalSheet title={mode === 'create' ? 'Novo ativo' : 'Editar ativo'} onClose={onClose}>
      {mode === 'edit' ? (
        renderEdit()
      ) : (
        <AssetForm
          mode="create"
          initial={initialAssetValues('acoes')}
          submitting={submitting}
          serverError={serverError}
          onSubmit={handleCreate}
        />
      )}
    </ModalSheet>
  );

  function renderEdit() {
    if (detail.isPending) return <SectionSkeleton />;
    if (detail.isError)
      return <SectionError label="o ativo" onRetry={() => void detail.refetch()} />;
    return (
      <AssetForm
        mode="edit"
        initial={assetDetailToFormValues(detail.data)}
        submitting={submitting}
        archiving={archiveMut.isPending}
        serverError={serverError}
        onSubmit={handleUpdate}
        onArchive={handleArchive}
      />
    );
  }
}
