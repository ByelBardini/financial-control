import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Eyebrow } from '../Eyebrow';
import type { Tone } from '../../types/dashboard';

type DesktopPageHeaderProps = {
  eyebrow?: string;
  eyebrowTone?: Tone;
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

// Cabeçalho único do desktop: eyebrow tonal + título grande (display-lg) +
// subtítulo opcional à esquerda; slot de ações (mês, busca, ocultar valores, CTA)
// à direita. As 4 telas compõem isto — é o que mantém os headers "conversando".
export function DesktopPageHeader({
  eyebrow,
  eyebrowTone = 'secondary',
  title,
  subtitle,
  children,
}: DesktopPageHeaderProps) {
  return (
    <View className="flex-row items-end justify-between border-b border-grid-line px-container-margin py-stack-lg">
      <View className="gap-base">
        {eyebrow ? <Eyebrow label={eyebrow} tone={eyebrowTone} /> : null}
        <Text
          accessibilityRole="header"
          className="font-hanken-bold text-display-lg text-on-surface"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="font-geist-medium text-label-md text-on-surface-variant">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {children ? <View className="flex-row items-center gap-stack-md">{children}</View> : null}
    </View>
  );
}
