import { View } from 'react-native';
import { BottomNavItem } from './BottomNavItem';
import type { IconName } from './Icon';

type NavEntry = { label: string; icon: IconName; active?: boolean };

const NAV_ENTRIES: NavEntry[] = [
  { label: 'Início', icon: 'dashboard', active: true },
  { label: 'Transações', icon: 'receipt_long' },
  { label: 'Contas', icon: 'account_balance_wallet' },
  { label: 'Investimentos', icon: 'trending_up' },
  { label: 'Ajustes', icon: 'settings' },
];

// Barra de navegação inferior estática (visual). O posicionamento (safe-area /
// absolute) é responsabilidade da tela que a compõe.
export function BottomNav() {
  return (
    <View className="flex-row border-t border-outline-variant bg-surface-container-lowest px-base py-stack-sm">
      {NAV_ENTRIES.map((entry) => (
        <BottomNavItem
          key={entry.label}
          label={entry.label}
          icon={entry.icon}
          active={entry.active}
        />
      ))}
    </View>
  );
}
