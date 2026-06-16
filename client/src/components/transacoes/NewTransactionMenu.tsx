import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../Icon';
import type { TransactionDirection } from '../../types/transacoes';

// Retângulo do gatilho (em coordenadas da janela, via measureInWindow) pra ancorar o card.
export type MenuAnchor = { x: number; y: number; width: number; height: number };

type NewTransactionMenuProps = {
  visible: boolean;
  onPick: (direction: TransactionDirection) => void;
  onClose: () => void;
  anchor?: MenuAnchor;
};

// Largura do card (w-80 = 320px) — usada pra alinhar a borda direita do card com a do botão.
const CARD_WIDTH = 320;

// Mini menu que "sai" do botão "Nova transação" no header: escolhe Despesa ou Receita antes de
// abrir a página (que já vem com o sentido). Desktop-only — ancorado no canto superior direito,
// abaixo do gatilho. O mobile usa o TransactionSpeedDial. Cada opção é uma linha: tile circular
// tingido + glifo escuro (contraste sobre o tom vivo, mesmo truque do speed dial) → rótulo forte
// + dica menor empilhados. A cor vive no tile/wash, não em texto gritante; o backdrop fecha.
// borderColor é inline (não className): o token `error` é um salmão claro que, em opacidade
// parcial sobre o card escuro, lê quase preto numa borda fina — então a Despesa usa um vermelho
// coral de verdade (suave). O verde mantém o look do secondary/30.
const OPTIONS: {
  direction: TransactionDirection;
  label: string;
  hint: string;
  icon: IconName;
  wash: string;
  tile: string;
  borderColor: string;
}[] = [
  {
    direction: 'outflow',
    label: 'Despesa',
    hint: 'Saiu dinheiro da conta',
    icon: 'trending_down',
    wash: 'bg-error/10',
    tile: 'bg-error',
    borderColor: 'rgba(255, 84, 73, 0.65)',
  },
  {
    direction: 'inflow',
    label: 'Receita',
    hint: 'Entrou dinheiro na conta',
    icon: 'trending_up',
    wash: 'bg-secondary/10',
    tile: 'bg-secondary',
    borderColor: 'rgba(157, 223, 46, 0.3)',
  },
];

// Sombra pra o card "flutuar" sobre o conteúdo (web vira boxShadow; Android usa elevation).
const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.45,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 14,
} as const;

export function NewTransactionMenu({ visible, onPick, onClose, anchor }: NewTransactionMenuProps) {
  // Sai logo ABAIXO do botão (8px de respiro), com a borda direita alinhada à dele. Sem âncora
  // medida (fallback), cai no canto superior direito.
  const position = anchor
    ? {
        top: anchor.y + anchor.height + 8,
        left: Math.max(8, anchor.x + anchor.width - CARD_WIDTH),
      }
    : { top: 88, right: 24 };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
      />
      <View
        style={[{ position: 'absolute', ...position }, cardShadow]}
        className="w-80 gap-stack-lg rounded-2xl border border-outline-variant bg-surface-container p-stack-lg"
      >
        <View className="gap-stack-sm">
          <Text
            accessibilityRole="header"
            accessibilityLabel="Nova transação"
            className="font-hanken-bold text-headline-sm text-on-surface"
          >
            Nova transação
          </Text>
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            O que entrou ou saiu?
          </Text>
        </View>

        <View className="gap-stack-md">
          {OPTIONS.map((o) => (
            <Pressable
              key={o.direction}
              onPress={() => onPick(o.direction)}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              style={{ borderColor: o.borderColor }}
              className={`flex-row items-center gap-gutter rounded-xl border px-gutter py-stack-md ${o.wash}`}
            >
              <View className={`h-12 w-12 items-center justify-center rounded-full ${o.tile}`}>
                <Icon name={o.icon} size={24} color="#0c0e12" />
              </View>
              <View className="flex-1 gap-stack-sm">
                <Text className="font-geist-semibold text-label-md text-on-surface">{o.label}</Text>
                <Text className="font-geist-medium text-label-sm text-on-surface-variant">
                  {o.hint}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
