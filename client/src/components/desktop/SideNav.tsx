import { Pressable, Text, View } from 'react-native';
import { SideNavItem } from './SideNavItem';
import { Icon, type IconName } from '../Icon';
import { BrandLogo } from '../BrandLogo';
import type { AppRoute } from '../../navigation/routes';

type NavEntry = { label: string; icon: IconName; route?: AppRoute };

// Destinos com route definida navegam; os demais ainda são decorativos.
const NAV_ENTRIES: NavEntry[] = [
  { label: 'Início', icon: 'home', route: 'dashboard' },
  { label: 'Transações', icon: 'swap_horiz', route: 'transacoes' },
  { label: 'Contas', icon: 'account_balance_wallet', route: 'contas' },
  { label: 'Investimentos', icon: 'trending_up' },
  { label: 'Ajustes', icon: 'settings' },
];

type SideNavProps = {
  currentRoute?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Rail fixo do desktop: marca, perfil e navegação. currentRoute/onNavigate são
// opcionais (default 'dashboard'). Com sessão, um botão "Sair" no rodapé volta
// pro login.
export function SideNav({ currentRoute = 'dashboard', onNavigate, onLogout }: SideNavProps) {
  return (
    <View className="w-64 border-r border-outline-variant bg-surface-container-lowest p-gutter">
      <View className="mb-stack-lg flex-row items-center gap-stack-md px-base pt-stack-sm">
        <BrandLogo size={40} />
        <Text className="font-hanken-bold text-headline-md text-on-surface">Pobrify</Text>
      </View>

      <View className="gap-stack-sm">
        {NAV_ENTRIES.map((entry) => (
          <SideNavItem
            key={entry.label}
            label={entry.label}
            icon={entry.icon}
            active={entry.route === currentRoute}
            onPress={entry.route && onNavigate ? () => onNavigate(entry.route!) : undefined}
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
