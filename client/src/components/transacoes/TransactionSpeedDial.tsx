import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../Icon';
import type { TransactionDirection } from '../../types/transacoes';

type TransactionSpeedDialProps = {
  onPick: (direction: TransactionDirection) => void;
};

// FAB que se expande (speed dial): tocar no "+" abre Receita/Despesa acima dele — cada uma é
// uma pílula de rótulo + um círculo com ícone, tingido pelo tom semântico (verde/vermelho). O
// "+" rotaciona pra "×"; o backdrop fecha. Estilo do próprio app (mesmo FAB bg-primary + glifo
// escuro das outras telas), não uma cópia. Animação com a Animated do core (sem deps novas).
const ACTIONS: {
  direction: TransactionDirection;
  label: string;
  icon: IconName;
  circle: string;
}[] = [
  { direction: 'inflow', label: 'Receita', icon: 'trending_up', circle: 'bg-secondary' },
  { direction: 'outflow', label: 'Despesa', icon: 'trending_down', circle: 'bg-error' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TransactionSpeedDial({ onPick }: TransactionSpeedDialProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  // 0 = fechado, 1 = aberto. Anima a rotação do "+", o fade do backdrop e o pop das opções.
  // useState lazy (não useRef) pra não ler ref no render — Animated.Value é estável e mutável.
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? 200 : 140,
      easing: open ? Easing.out(Easing.back(1.5)) : Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const pick = (direction: TransactionDirection) => {
    setOpen(false);
    onPick(direction);
  };

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <>
      {open ? (
        // Escurece a tela toda (inclusive sob a status bar via top:-insets.top) e fecha ao
        // tocar fora dos ícones. Estilo inline (não className): o AnimatedPressable não recebe
        // o processamento de className do NativeWind.
        <AnimatedPressable
          style={[
            StyleSheet.absoluteFill,
            { top: -insets.top, backgroundColor: 'rgba(0,0,0,0.55)', opacity: anim },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={() => setOpen(false)}
        />
      ) : null}

      <View
        className="absolute right-6 items-end gap-stack-md"
        style={{ bottom: insets.bottom + 88 }}
      >
        {open
          ? ACTIONS.map((a, i) => {
              const translateY = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12 + i * 6, 0], // mais distante = leve stagger
              });
              return (
                <Animated.View
                  key={a.direction}
                  style={{ opacity: anim, transform: [{ translateY }, { scale: anim }] }}
                >
                  <Pressable
                    onPress={() => pick(a.direction)}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                    className="flex-row items-center gap-stack-md"
                  >
                    <View className="rounded-lg bg-surface-container-high px-stack-md py-stack-sm">
                      <Text className="font-geist-semibold text-label-md text-on-surface">
                        {a.label}
                      </Text>
                    </View>
                    <View
                      className={`h-14 w-14 items-center justify-center rounded-full ${a.circle}`}
                    >
                      <Icon name={a.icon} size={26} color="#0c0e12" />
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })
          : null}

        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Fechar nova transação' : 'Nova transação'}
          accessibilityState={{ expanded: open }}
          className="h-14 w-14 items-center justify-center rounded-full bg-primary"
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="add" size={28} color="#3c0091" />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}
