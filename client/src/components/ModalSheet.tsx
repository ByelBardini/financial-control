import type { ReactNode } from 'react';
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
import { ApiError } from '../api/client';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { Icon } from './Icon';

// Dim do overlay via style (não className): garante o escurecimento na web, onde o flex do Modal
// não estica o conteúdo (ver gotchas.md).
const overlayDim = { backgroundColor: 'rgba(0, 0, 0, 0.6)' } as const;

// apiErrorMessage transforma o erro de uma mutação na mensagem amigável (o server já manda um
// {error} legível). Compartilhado pelos modais que hospedam mutations.
export function apiErrorMessage(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err) return 'Não rolou agora. Tenta de novo.';
  return undefined;
}

type ModalSheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Casca de modal RESPONSIVA: diálogo central no desktop (fade) / bottom-sheet que sobe no mobile
// (slide), com dim no backdrop (fecha ao tocar fora), cabeçalho com título + botão fechar e o
// corpo num ScrollView. Espelha o shell de AccountFormModal/TransactionFormModal sem duplicá-lo.
export function ModalSheet({ title, onClose, children }: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { height } = useWindowDimensions();

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
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
