import { Image } from 'react-native';

const LOGO = require('../../assets/logo.png');

type BrandLogoProps = {
  size?: number;
  accessibilityLabel?: string;
  testID?: string;
};

// Marca visual do Pobrify (o "P" verde). Sem accessibilityLabel é decorativa
// (ocultada do leitor de tela), pois costuma acompanhar o wordmark "Pobrify"
// que já carrega o significado — mesmo padrão do Icon.
export function BrandLogo({
  size = 28,
  accessibilityLabel,
  testID = 'brand-logo',
}: BrandLogoProps) {
  const decorative = accessibilityLabel === undefined;
  return (
    <Image
      source={LOGO}
      resizeMode="contain"
      style={{ width: size, height: size }}
      testID={testID}
      accessible={!decorative}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'yes'}
    />
  );
}
