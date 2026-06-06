import { Text } from 'react-native';

type SectionHeadingProps = { children: string };

// Título de seção (Contas, Investimentos, ...). role="header" para navegação
// por leitor de tela.
export function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <Text
      accessibilityRole="header"
      className="font-hanken-semibold text-headline-sm text-on-surface"
    >
      {children}
    </Text>
  );
}
