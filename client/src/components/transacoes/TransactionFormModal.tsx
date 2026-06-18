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
import { useAccounts } from '../../hooks/useDashboardQueries';
import { useCategories } from '../../hooks/useTransacoesQueries';
import {
  useCreateInstallmentPurchase,
  useCreateRecurringRule,
  useCreateTransaction,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '../../hooks/useTransactionMutations';
import {
  detailToFormValues,
  initialValues,
  toCreateInput,
  toInstallmentInput,
  toRecurringRuleInput,
  toUpdateInput,
  type TransactionFormValues,
} from '../../lib/transactionForm';
import { Icon } from '../Icon';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { TransactionForm } from './TransactionForm';
import type { TransactionDirection } from '../../types/transacoes';

type TransactionFormModalProps = {
  mode: 'create' | 'edit';
  direction?: TransactionDirection; // sentido pré-selecionado no mini menu (criação)
  transactionId?: string; // edição
  onClose: () => void;
};

// Dim do overlay via style (não className): garante o escurecimento na web, onde o flex do
// Modal não estica o conteúdo (ver gotchas.md).
const overlayDim = { backgroundColor: 'rgba(0, 0, 0, 0.6)' } as const;

function errorMessage(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err) return 'Não rolou agora. Tenta de novo.';
  return undefined;
}

// Data de hoje no fuso local como YYYY-MM-DD (default do campo Data na criação).
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Modal (overlay) de criar/editar transação — espelha o AccountFormModal (diálogo central no
// PC com `fade`, bottom sheet que sobe no mobile com `slide`). Carrega contas/categorias pros
// selects, pré-preenche a edição (useTransaction), monta as mutations e fecha no sucesso. O
// sentido vem travado do mini menu (não há toggle dentro); o título reflete isso.
export function TransactionFormModal({
  mode,
  direction,
  transactionId,
  onClose,
}: TransactionFormModalProps) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { height } = useWindowDimensions();
  const accountsQ = useAccounts();
  const categoriesQ = useCategories();
  const detail = useTransaction(mode === 'edit' ? transactionId : undefined);
  const createMut = useCreateTransaction();
  const installmentMut = useCreateInstallmentPurchase();
  const recurringMut = useCreateRecurringRule();
  const updateMut = useUpdateTransaction();
  const deleteMut = useDeleteTransaction();

  const submitting =
    createMut.isPending ||
    installmentMut.isPending ||
    recurringMut.isPending ||
    updateMut.isPending;
  const serverError = errorMessage(
    createMut.error ??
      installmentMut.error ??
      recurringMut.error ??
      updateMut.error ??
      deleteMut.error,
  );

  // 'parcelado' → endpoint de parcelas (N linhas); 'fixo' → regra + lançamento de agora;
  // 'unico' → CRUD normal.
  function handleCreate(values: TransactionFormValues) {
    if (values.entryKind === 'parcelado') {
      installmentMut.mutate(toInstallmentInput(values), { onSuccess: onClose });
      return;
    }
    if (values.entryKind === 'fixo') {
      recurringMut.mutate(toRecurringRuleInput(values), { onSuccess: onClose });
      return;
    }
    createMut.mutate(toCreateInput(values), { onSuccess: onClose });
  }
  function handleUpdate(values: TransactionFormValues) {
    if (!transactionId) return;
    updateMut.mutate({ id: transactionId, input: toUpdateInput(values) }, { onSuccess: onClose });
  }
  function handleDelete() {
    if (!transactionId) return;
    deleteMut.mutate(transactionId, { onSuccess: onClose });
  }

  // Título contextual: o sentido já foi escolhido no menu, então o reforçamos aqui.
  const title =
    mode === 'edit' ? 'Editar transação' : direction === 'inflow' ? 'Nova receita' : 'Nova despesa';

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
            {renderBody()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  function renderBody() {
    const loading =
      accountsQ.isPending || categoriesQ.isPending || (mode === 'edit' && detail.isPending);
    if (loading) return <SectionSkeleton />;

    const failed = accountsQ.isError || categoriesQ.isError || (mode === 'edit' && detail.isError);
    if (failed)
      return (
        <SectionError
          label="o formulário"
          onRetry={() => {
            void accountsQ.refetch();
            void categoriesQ.refetch();
            if (mode === 'edit') void detail.refetch();
          }}
        />
      );

    const accounts = accountsQ.data ?? [];
    const categories = categoriesQ.data ?? [];

    if (mode === 'create') {
      const initial: TransactionFormValues = {
        ...initialValues(todayISO()),
        accountId: accounts[0]?.id ?? '',
        direction: direction ?? 'outflow',
      };
      return (
        <TransactionForm
          mode="create"
          initial={initial}
          accounts={accounts}
          categories={categories}
          submitting={submitting}
          serverError={serverError}
          onSubmit={handleCreate}
        />
      );
    }

    if (!detail.data) return null;
    return (
      <TransactionForm
        mode="edit"
        initial={detailToFormValues(detail.data)}
        accounts={accounts}
        categories={categories}
        submitting={submitting}
        deleting={deleteMut.isPending}
        serverError={serverError}
        onSubmit={handleUpdate}
        onDelete={handleDelete}
      />
    );
  }
}
