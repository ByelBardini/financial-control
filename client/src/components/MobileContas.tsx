import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BankAccountCard } from './BankAccountCard';
import { BottomNav } from './BottomNav';
import { CarteiraCard } from './CarteiraCard';
import { ContasHero } from './ContasHero';
import { ContasSpeedDial } from './ContasSpeedDial';
import { CreditCardCard } from './CreditCardCard';
import { DiagnosisCard } from './DiagnosisCard';
import { LiquidBalanceHeader } from './LiquidBalanceHeader';
import { PanicMeter } from './PanicMeter';
import { QuerySection } from './QuerySection';
import { SectionHeading } from './SectionHeading';
import { TopBar } from './TopBar';
import { VoucherCard } from './VoucherCard';
import {
  useBankAccounts,
  useCashWallet,
  useCreditCards,
  useManagementTip,
  usePovertyXray,
  useVouchers,
} from '../hooks/useContasQueries';
import { usePatrimonioOverview } from '../hooks/usePatrimonioQueries';
import type { AppRoute } from '../navigation/routes';

type MobileContasProps = {
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

// Pilha vertical do mobile (Contas). Cada seção é uma query independente
// (loading/erro por seção via QuerySection). BottomNav + FAB fixos respeitando o
// safe-area; o conteúdo reserva espaço (pb) pra não ficar atrás deles.
export function MobileContas({
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
}: MobileContasProps) {
  const insets = useSafeAreaInsets();
  const overview = usePatrimonioOverview();
  const banks = useBankAccounts();
  const cards = useCreditCards();
  const vouchers = useVouchers();
  const cash = useCashWallet();
  const xray = usePovertyXray();
  const tip = useManagementTip();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <TopBar hidden={hidden} onToggleHidden={onToggleHidden} onLogout={onLogout} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 24, paddingBottom: insets.bottom + 96 }}
      >
        <ContasHero />

        <QuerySection query={overview} label="o saldo líquido">
          {(data) => (
            <View className="px-container-margin">
              <LiquidBalanceHeader overview={data} hidden={hidden} />
            </View>
          )}
        </QuerySection>

        <QuerySection query={xray} label="o medidor de pânico">
          {(data) => (
            <View className="px-container-margin">
              <PanicMeter panic={data.panic} caption="Tempo Estimado de Vida (Bancária)" />
            </View>
          )}
        </QuerySection>

        <QuerySection query={banks} label="os bancos">
          {(data) => (
            <View className="gap-stack-md px-container-margin">
              <SectionHeading>Bancos</SectionHeading>
              {data.map((account) => (
                <BankAccountCard
                  key={account.id}
                  account={account}
                  hidden={hidden}
                  onPress={onTransferFrom ? () => onTransferFrom(account.id) : undefined}
                  onEdit={onEditAccount ? () => onEditAccount(account.id) : undefined}
                />
              ))}
            </View>
          )}
        </QuerySection>

        <QuerySection query={cards} label="os cartões">
          {(data) => (
            <View className="gap-stack-md px-container-margin">
              <SectionHeading>Cartões</SectionHeading>
              {data.map((card) => (
                <CreditCardCard
                  key={card.id}
                  card={card}
                  hidden={hidden}
                  onPress={onOpenCard ? () => onOpenCard(card.id) : undefined}
                />
              ))}
            </View>
          )}
        </QuerySection>

        <QuerySection query={vouchers} label="os vales">
          {(data) => (
            <View className="gap-stack-md px-container-margin">
              <SectionHeading>Vales (Benefícios)</SectionHeading>
              {data.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  hidden={hidden}
                  onPress={onEditAccount ? () => onEditAccount(voucher.id) : undefined}
                />
              ))}
            </View>
          )}
        </QuerySection>

        <QuerySection query={cash} label="a carteira">
          {(data) => (
            <View className="px-container-margin">
              <CarteiraCard cash={data} hidden={hidden} />
            </View>
          )}
        </QuerySection>

        <QuerySection query={tip} label="a dica">
          {(data) => (
            <View className="px-container-margin">
              <DiagnosisCard diagnosis={data} icon="lightbulb" />
            </View>
          )}
        </QuerySection>
      </ScrollView>

      <ContasSpeedDial onCreate={() => onCreateAccount?.()} onTransfer={() => onTransfer?.()} />

      <View className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom }}>
        <BottomNav currentRoute={route} onNavigate={onNavigate} />
      </View>
    </View>
  );
}
