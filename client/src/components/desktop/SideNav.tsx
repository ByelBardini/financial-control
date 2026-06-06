import { Text, View } from 'react-native';
import { SideNavItem } from './SideNavItem';
import type { IconName } from '../Icon';

type NavEntry = { label: string; icon: IconName; active?: boolean };

const NAV_ENTRIES: NavEntry[] = [
  { label: 'Início', icon: 'home', active: true },
  { label: 'Transações', icon: 'swap_horiz' },
  { label: 'Contas', icon: 'account_balance_wallet' },
  { label: 'Investimentos', icon: 'trending_up' },
  { label: 'Ajustes', icon: 'settings' },
];

// Rail fixo do desktop: marca, perfil e navegação (estática).
export function SideNav() {
  return (
    <View className="w-64 border-r border-outline-variant bg-surface-container-lowest p-gutter">
      <View className="mb-stack-lg flex-row items-center gap-stack-md px-base pt-stack-sm">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary-container">
          <Text className="font-hanken-bold text-on-primary-container">P</Text>
        </View>
        <Text className="font-hanken-bold text-headline-md text-on-surface">Pobrify</Text>
      </View>

      <View className="mb-stack-lg flex-row items-center gap-stack-md rounded-lg border border-outline-variant bg-surface-container-low p-stack-md">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest">
          <Text className="font-hanken-bold text-on-surface">U</Text>
        </View>
        <View>
          <Text className="font-geist-medium text-label-md text-on-surface">Gestão de Crise</Text>
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            Junho, 2025
          </Text>
        </View>
      </View>

      <View className="gap-stack-sm">
        {NAV_ENTRIES.map((entry) => (
          <SideNavItem
            key={entry.label}
            label={entry.label}
            icon={entry.icon}
            active={entry.active}
          />
        ))}
      </View>
    </View>
  );
}
