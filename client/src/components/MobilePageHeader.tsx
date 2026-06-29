import { Text, View } from 'react-native';
import { Eyebrow } from './Eyebrow';
import type { Tone } from '../types/dashboard';

type MobilePageHeaderProps = {
  eyebrow?: string;
  eyebrowTone?: Tone;
  title: string;
};

// Cabeçalho único do mobile: eyebrow tonal + título (headline-md) abaixo do TopBar.
// Espelha o DesktopPageHeader em escala menor — é o que faz as telas mobile
// "conversarem" entre si do mesmo jeito que o desktop.
export function MobilePageHeader({
  eyebrow,
  eyebrowTone = 'secondary',
  title,
}: MobilePageHeaderProps) {
  return (
    <View className="gap-base px-container-margin">
      {eyebrow ? <Eyebrow label={eyebrow} tone={eyebrowTone} /> : null}
      <Text
        accessibilityRole="header"
        className="font-hanken-bold text-headline-md text-on-surface"
      >
        {title}
      </Text>
    </View>
  );
}
