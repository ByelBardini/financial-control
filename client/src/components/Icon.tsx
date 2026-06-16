import { MaterialIcons } from '@expo/vector-icons';

// Vocabulário semântico → glifo MaterialIcons. Único ponto que importa
// @expo/vector-icons; trocar a lib de ícones depois mexe só aqui.
const glyphs = {
  account_balance: 'account-balance',
  credit_card: 'credit-card',
  currency_bitcoin: 'currency-bitcoin',
  trending_up: 'trending-up',
  trending_down: 'trending-down',
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
  search: 'search',
  local_gas_station: 'local-gas-station',
  family_restroom: 'family-restroom',
  subscriptions: 'subscriptions',
  fitness_center: 'fitness-center',
  smartphone: 'smartphone',
  event_repeat: 'event-repeat',
  expand_more: 'expand-more',
  chevron_left: 'chevron-left',
  chevron_right: 'chevron-right',
  directions_car: 'directions-car',
  sports_esports: 'sports-esports',
  category: 'category',
  filter_list: 'filter-list',
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
