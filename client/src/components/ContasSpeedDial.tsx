import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';

type ContasSpeedDialProps = {
  onCreate: () => void;
  onTransfer: () => void;
};

// FAB "+" da tela de Contas que se expande (speed dial) em "Transferir" + "Nova conta" — espelha o
// TransactionSpeedDial (mesma animação/backdrop). O "+" rotaciona pra "×"; o backdrop fecha.
type Action = { key: string; label: string; icon: IconName; circle: string; run: () => void };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ContasSpeedDial({ onCreate, onTransfer }: ContasSpeedDialProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? 200 : 140,
      easing: open ? Easing.out(Easing.back(1.5)) : Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const actions: Action[] = [
    {
      key: 'transfer',
      label: 'Transferir',
      icon: 'swap_horiz',
      circle: 'bg-secondary',
      run: onTransfer,
    },
    {
      key: 'create',
      label: 'Nova conta',
      icon: 'account_balance',
      circle: 'bg-primary',
      run: onCreate,
    },
  ];

  const pick = (run: () => void) => {
    setOpen(false);
    run();
  };

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <>
      {open ? (
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
          ? actions.map((a, i) => {
              const translateY = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12 + i * 6, 0],
              });
              return (
                <Animated.View
                  key={a.key}
                  style={{ opacity: anim, transform: [{ translateY }, { scale: anim }] }}
                >
                  <Pressable
                    onPress={() => pick(a.run)}
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
          accessibilityLabel={open ? 'Fechar ações' : 'Ações da conta'}
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
