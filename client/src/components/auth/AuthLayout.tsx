import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { BrandLogo } from '../BrandLogo';

type AuthLayoutProps = {
  children: ReactNode;
};

const BRAND = 'Pobrify';
const TAGLINE = 'Sua gestão de crise começa aqui.';

// Rodapé institucional (deboche incluso) — a marca da tela é o produto (Pobrify),
// a empresa que desenvolve assina aqui embaixo.
function CompanyFooter() {
  return (
    <Text className="text-center font-geist-medium text-label-sm text-on-surface-variant">
      © 2026 Evolutiva Sistemas — todos os ativos liquidados.
    </Text>
  );
}

// Shell responsivo compartilhado pelas telas de auth. Desktop (≥1024px): split com
// painel de marca à esquerda (gradiente sutil) e o formulário centralizado à
// direita. Mobile: coluna centralizada com marca compacta no topo, dentro de
// KeyboardAvoidingView + ScrollView (o teclado não cobre os campos).
export function AuthLayout({ children }: AuthLayoutProps) {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();

  if (isDesktop) {
    return (
      <View className="flex-1 flex-row bg-background">
        <View className="flex-1 justify-between overflow-hidden bg-surface-container-lowest p-stack-lg">
          <LinearGradient
            colors={['rgba(157,223,46,0.12)', 'transparent', 'rgba(160,120,255,0.20)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View className="flex-row items-center gap-stack-sm">
            <BrandLogo size={28} />
            <Text className="font-hanken-bold text-headline-md text-primary">{BRAND}</Text>
          </View>
          <View className="gap-stack-md">
            <Text className="font-hanken-bold text-display-lg text-on-surface">{TAGLINE}</Text>
            <Text className="max-w-md font-hanken text-body-lg text-on-surface-variant">
              Acompanhe de perto cada real escorrendo pelos seus dedos.
            </Text>
          </View>
          <CompanyFooter />
        </View>
        <View className="flex-1 items-center justify-center bg-background p-stack-lg">
          <View className="w-full max-w-md">{children}</View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-stack-lg items-center gap-stack-sm">
          <View className="flex-row items-center gap-stack-sm">
            <BrandLogo size={28} />
            <Text className="font-hanken-bold text-headline-md text-primary">{BRAND}</Text>
          </View>
          <Text className="font-hanken text-body-md text-on-surface-variant">{TAGLINE}</Text>
        </View>
        <View className="w-full max-w-md self-center">{children}</View>
        <View className="mt-stack-lg">
          <CompanyFooter />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
