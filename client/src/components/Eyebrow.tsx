import { Text } from 'react-native';
import { toneText } from '../theme/toneClass';
import type { Tone } from '../types/dashboard';

type EyebrowProps = {
  label: string;
  tone?: Tone;
};

// Rótulo tonal em CAIXA ALTA acima do título da página/card — o "eyebrow" do
// padrão de cabeçalho. A caixa alta é só CSS (`uppercase`); o texto-fonte fica
// intacto pro leitor de tela e pros testes.
export function Eyebrow({ label, tone = 'secondary' }: EyebrowProps) {
  return (
    <Text className={`font-geist-semibold text-label-sm uppercase ${toneText(tone)}`}>{label}</Text>
  );
}
