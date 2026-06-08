import { MaterialIcons } from '@expo/vector-icons';

// Vocabulário semântico → glifo MaterialIcons. Único ponto que importa
// @expo/vector-icons; trocar a lib de ícones depois mexe só aqui.
const glyphs = {
  account_balance: 'account-balance',
  credit_card: 'credit-card',
  currency_bitcoin: 'currency-bitcoin',
  trending_up: 'trending-up',
  visibility: 'visibility',
  visibility_off: 'visibility-off',
  dashboard: 'dashboard',
  home: 'home',
  swap_horiz: 'swap-horiz',
  receipt_long: 'receipt-long',
  account_balance_wallet: 'account-balance-wallet',
  settings: 'settings',
  medical_services: 'medical-services',
  add: 'add',
  add_circle: 'add-circle',
  check: 'check',
  close: 'close',
  logout: 'logout',
  restaurant: 'restaurant',
  shopping_basket: 'shopping-basket',
  fastfood: 'fastfood',
  savings: 'savings',
  wallet: 'wallet',
  payments: 'payments',
  corporate_fare: 'corporate-fare',
  lightbulb: 'lightbulb',
} as const;

export type IconName = keyof typeof glyphs;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  testID?: string;
};

// Sem accessibilityLabel o ícone é tratado como decorativo (ocultado do leitor
// de tela), já que costuma acompanhar um texto que já carrega o significado.
export function Icon({
  name,
  size = 24,
  color = '#e2e2e8',
  accessibilityLabel,
  testID,
}: IconProps) {
  const decorative = accessibilityLabel === undefined;
  return (
    <MaterialIcons
      name={glyphs[name]}
      size={size}
      color={color}
      testID={testID}
      accessible={!decorative}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'yes'}
    />
  );
}
