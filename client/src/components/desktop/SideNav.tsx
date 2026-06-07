import { Pressable, Text, View } from 'react-native';
import { SideNavItem } from './SideNavItem';
import { Icon, type IconName } from '../Icon';
import { BrandLogo } from '../BrandLogo';

type NavEntry = { label: string; icon: IconName; active?: boolean };

const NAV_ENTRIES: NavEntry[] = [
  { label: 'Início', icon: 'home', active: true },
  { label: 'Transações', icon: 'swap_horiz' },
  { label: 'Contas', icon: 'account_balance_wallet' },
  { label: 'Investimentos', icon: 'trending_up' },
  { label: 'Ajustes', icon: 'settings' },
];

type SideNavProps = {
  onLogout?: () => void;
};

// Rail fixo do desktop: marca, perfil e navegação (estática). Quando há sessão,
// um botão "Sair" no rodapé do rail volta pro login.
export function SideNav({ onLogout }: SideNavProps) {
  return (
    <View className="w-64 border-r border-outline-variant bg-surface-container-lowest p-gutter">
      <View className="mb-stack-lg flex-row items-center gap-stack-md px-base pt-stack-sm">
        <BrandLogo size={40} />
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

      {onLogout ? (
        <Pressable
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Sair"
          className="mt-stack-lg flex-row items-center gap-stack-md rounded-lg border-t border-outline-variant px-base pt-stack-md"
        >
          <Icon name="logout" size={20} color="#cbc3d7" />
          <Text className="font-geist-medium text-label-md text-on-surface-variant">Sair</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
