import { View } from 'react-native';
import { BottomNavItem } from './BottomNavItem';
import type { IconName } from './Icon';
import type { AppRoute } from '../navigation/routes';

type NavEntry = { label: string; icon: IconName; route?: AppRoute };

// Destinos com route definida navegam; os demais ainda são decorativos.
const NAV_ENTRIES: NavEntry[] = [
  { label: 'Início', icon: 'dashboard', route: 'dashboard' },
  { label: 'Transações', icon: 'receipt_long', route: 'transacoes' },
  { label: 'Contas', icon: 'account_balance_wallet', route: 'contas' },
  { label: 'Investimentos', icon: 'trending_up' },
  { label: 'Ajustes', icon: 'settings' },
];

type BottomNavProps = {
  currentRoute?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
};

// Barra de navegação inferior. currentRoute/onNavigate são opcionais (default
// 'dashboard') pra quem ainda a compõe sem rota. O posicionamento (safe-area /
// absolute) é responsabilidade da tela.
export function BottomNav({ currentRoute = 'dashboard', onNavigate }: BottomNavProps) {
  return (
    <View className="flex-row border-t border-outline-variant bg-surface-container-lowest px-base py-stack-sm">
      {NAV_ENTRIES.map((entry) => (
        <BottomNavItem
          key={entry.label}
          label={entry.label}
          icon={entry.icon}
          active={entry.route === currentRoute}
          onPress={entry.route && onNavigate ? () => onNavigate(entry.route!) : undefined}
        />
      ))}
    </View>
  );
}
