import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Icon } from '../Icon';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { AccountForm } from './AccountForm';
import {
  detailToFormValues,
  initialValues,
  toNewAccountInput,
  toUpdateAccountInput,
  type AccountFormValues,
} from '../../lib/accountForm';
import {
  useAccount,
  useArchiveAccount,
  useCreateAccount,
  useUpdateAccount,
} from '../../hooks/useAccountMutations';
import { useAccounts } from '../../hooks/useDashboardQueries';
import type { SelectOption } from '../SelectField';

type AccountFormModalProps = {
  mode: 'create' | 'edit';
  accountId?: string;
  onClose: () => void;
};

// Dim do overlay via style (não className): garante o escurecimento mesmo na web,
// onde o flex do Modal não estica o conteúdo (ver gotchas.md).
const overlayDim = { backgroundColor: 'rgba(0, 0, 0, 0.6)' } as const;

// Mensagem amigável do erro de mutação. O server já manda um {error} legível.
function errorMessage(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err) return 'Não rolou agora. Tenta de novo.';
  return undefined;
}

// Modal (overlay) de criar/editar conta. Monta as mutations, pré-preenche a edição
// (useAccount) e fecha no sucesso. O parent monta/desmonta este componente.
export function AccountFormModal({ mode, accountId, onClose }: AccountFormModalProps) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { height } = useWindowDimensions();
  const createMut = useCreateAccount();
  const updateMut = useUpdateAccount();
  const archiveMut = useArchiveAccount();
  const detail = useAccount(mode === 'edit' ? accountId : undefined);
  const accounts = useAccounts();

  // Contas de banco (checking/savings) elegíveis como conta de pagamento do cartão —
  // exclui a própria conta na edição (um cartão não paga a si mesmo). Espelha a regra do
  // server (só bancos podem pagar a fatura). Ver docs/context/client-app.md.
  const paymentAccountOptions: SelectOption[] = (accounts.data ?? [])
    .filter((a) => a.accountType === 'checking' || a.accountType === 'savings')
    .filter((a) => a.id !== accountId)
    .map((a) => ({ value: a.id, label: a.name, icon: a.icon, dotColor: a.dotColor }));

  const submitting = createMut.isPending || updateMut.isPending;
  const serverError = errorMessage(createMut.error ?? updateMut.error ?? archiveMut.error);

  function handleCreate(values: AccountFormValues) {
    createMut.mutate(toNewAccountInput(values), { onSuccess: onClose });
  }
  function handleUpdate(values: AccountFormValues) {
    if (!accountId) return;
    updateMut.mutate(
      { id: accountId, input: toUpdateAccountInput(values) },
      { onSuccess: onClose },
    );
  }
  function handleArchive() {
    if (!accountId) return;
    archiveMut.mutate(accountId, { onSuccess: onClose });
  }

  const title = mode === 'create' ? 'Nova conta' : 'Editar conta';

  // O Modal da web (react-native-web) não estica o conteúdo via flex; o overlay
  // precisa de StyleSheet.absoluteFill + cor explícita, senão o dim e o painel
  // não pintam e o dashboard vaza por trás. Ver docs/context/gotchas.md.
  return (
    <Modal
      visible
      transparent
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View
        style={[StyleSheet.absoluteFill, overlayDim]}
        className={isDesktop ? 'items-center justify-center p-gutter' : 'justify-end'}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Fechar formulário"
          onPress={onClose}
        />
        <View
          className={
            isDesktop
              ? 'self-center rounded-xl border border-grid-line bg-surface-container-low px-container-margin py-stack-lg'
              : 'rounded-t-full bg-surface-container-low px-container-margin pt-stack-lg'
          }
          style={
            isDesktop
              ? { width: 480, maxHeight: Math.round(height * 0.88) }
              : { maxHeight: Math.round(height * 0.92), paddingBottom: insets.bottom + 16 }
          }
        >
          <View className="mb-stack-md flex-row items-center justify-between">
            <Text
              accessibilityRole="header"
              className="font-hanken-bold text-headline-sm text-on-surface"
            >
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={12}
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name="close" size={24} color="#cbc3d7" accessibilityLabel="Fechar" />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: Math.round(height * (isDesktop ? 0.72 : 0.78)) }}
          >
            {mode === 'edit' ? (
              renderEdit()
            ) : (
              <AccountForm
                mode="create"
                initial={initialValues('checking')}
                paymentAccountOptions={paymentAccountOptions}
                submitting={submitting}
                serverError={serverError}
                onSubmit={handleCreate}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  function renderEdit() {
    if (detail.isPending) return <SectionSkeleton />;
    if (detail.isError)
      return <SectionError label="a conta" onRetry={() => void detail.refetch()} />;
    return (
      <AccountForm
        mode="edit"
        initial={detailToFormValues(detail.data)}
        paymentAccountOptions={paymentAccountOptions}
        submitting={submitting}
        archiving={archiveMut.isPending}
        serverError={serverError}
        onSubmit={handleUpdate}
        onArchive={handleArchive}
      />
    );
  }
}
