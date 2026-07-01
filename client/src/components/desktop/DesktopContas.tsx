import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BancosPanel } from './BancosPanel';
import { CartoesPanel } from './CartoesPanel';
import { ContasHeader } from './ContasHeader';
import { RaioXPanel } from './RaioXPanel';
import { SideNav } from './SideNav';
import { ValesPanel } from './ValesPanel';
import { CarteiraCard } from '../CarteiraCard';
import { DiagnosisCard } from '../DiagnosisCard';
import { LiquidBalanceHeader } from '../LiquidBalanceHeader';
import { QuerySection } from '../QuerySection';
import {
  useBankAccounts,
  useCashWallet,
  useCreditCards,
  useManagementTip,
  usePovertyXray,
  useVouchers,
} from '../../hooks/useContasQueries';
import { usePatrimonioOverview } from '../../hooks/usePatrimonioQueries';
import type { AppRoute } from '../../navigation/routes';

type DesktopContasProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
  onCreateAccount?: () => void;
  onEditAccount?: (id: string) => void;
  onOpenCard?: (id: string) => void;
  onTransfer?: () => void;
  onTransferFrom?: (id: string) => void;
};

// Layout enterprise da tela de Contas: rail fixo + header (título + "Nova conta") + faixa do
// "Saldo líquido" (bancos + espécie, do mesmo /patrimonio/overview que a Início → conciliam)
// + grid 2/3 (Bancos + Cartões + Vales) / 1/3 (Carteira + Raio-X + Dica), dividido por
// border-grid-line. Cada célula é uma query independente. Brilho verde→roxo no fundo.
export function DesktopContas({
  hidden,
  onToggleHidden,
  route = 'contas',
  onNavigate,
  onLogout,
  onCreateAccount,
  onEditAccount,
  onOpenCard,
  onTransfer,
  onTransferFrom,
}: DesktopContasProps) {
  const overview = usePatrimonioOverview();
  const banks = useBankAccounts();
  const cards = useCreditCards();
  const vouchers = useVouchers();
  const cash = useCashWallet();
  const xray = usePovertyXray();
  const tip = useManagementTip();

  return (
    <View className="flex-1 flex-row bg-surface-container-lowest">
      <LinearGradient
        colors={['rgba(6,78,59,0.18)', 'transparent', 'rgba(76,29,149,0.18)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SideNav currentRoute={route} onNavigate={onNavigate} onLogout={onLogout} />
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <ContasHeader
          hidden={hidden}
          onToggleHidden={onToggleHidden}
          onCreateAccount={onCreateAccount}
          onTransfer={onTransfer}
        />

        <View className="border-t border-grid-line p-stack-lg">
          <QuerySection query={overview} label="o saldo líquido">
            {(data) => <LiquidBalanceHeader overview={data} hidden={hidden} size="desktop" />}
          </QuerySection>
        </View>

        <View className="flex-1 flex-row border-t border-grid-line">
          <View className="border-r border-grid-line" style={{ flex: 2 }}>
            <QuerySection query={banks} label="os bancos">
              {(data) => (
                <BancosPanel
                  accounts={data}
                  hidden={hidden}
                  onTransferFrom={onTransferFrom}
                  onEditAccount={onEditAccount}
                />
              )}
            </QuerySection>
            <View className="border-t border-grid-line">
              <QuerySection query={cards} label="os cartões">
                {(data) => <CartoesPanel cards={data} hidden={hidden} onOpenCard={onOpenCard} />}
              </QuerySection>
            </View>
            <View className="border-t border-grid-line">
              <QuerySection query={vouchers} label="os vales">
                {(data) => (
                  <ValesPanel
                    vouchers={data}
                    hidden={hidden}
                    onTransferFrom={onTransferFrom}
                    onEditAccount={onEditAccount}
                  />
                )}
              </QuerySection>
            </View>
          </View>

          <View className="flex-1 gap-stack-lg p-stack-lg">
            <QuerySection query={cash} label="a carteira">
              {(data) => <CarteiraCard cash={data} hidden={hidden} />}
            </QuerySection>
            <QuerySection query={xray} label="o raio-x">
              {(data) => <RaioXPanel xray={data} hidden={hidden} />}
            </QuerySection>
            <QuerySection query={tip} label="a dica">
              {(data) => <DiagnosisCard diagnosis={data} icon="lightbulb" />}
            </QuerySection>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
