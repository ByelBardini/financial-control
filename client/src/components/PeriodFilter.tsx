import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { DateField } from './DateField';
import { Icon } from './Icon';
import type { TransactionPeriod } from '../types/transacoes';

type PeriodOption = { label: string; value: TransactionPeriod };

const OPTIONS: PeriodOption[] = [
  { label: '30 Dias', value: '30d' },
  { label: '3 Meses', value: '3m' },
  { label: '6 Meses', value: '6m' },
  { label: '1 Ano', value: '1y' },
  { label: 'Personalizado', value: 'custom' },
];

type PeriodFilterProps = {
  value: TransactionPeriod;
  from: string;
  to: string;
  onChange: (period: TransactionPeriod) => void;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
};

// Dropdown de período (single-select): 30 Dias / 3 Meses / 6 Meses / 1 Ano / Personalizado.
// "Personalizado" mantém o modal aberto e revela os campos De/Até (DateField). O backdrop
// fecha ao tocar fora; o conteúdo engole o toque pra não fechar à toa.
export function PeriodFilter({
  value,
  from,
  to,
  onChange,
  onFromChange,
  onToChange,
}: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  const choose = (period: TransactionPeriod) => {
    onChange(period);
    if (period !== 'custom') setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Período: ${current.label}`}
        hitSlop={8}
        className="min-h-[44px] flex-row items-center gap-stack-sm rounded-full border border-outline-variant px-stack-md"
      >
        <Text className="font-geist-semibold text-label-sm text-on-surface-variant">
          Período: {current.label}
        </Text>
        <Icon name="expand_more" size={16} color="#cbc3d7" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel="Fechar"
          className="flex-1 items-center justify-center bg-black/50 px-container-margin"
        >
          <Pressable
            onPress={() => {}}
            className="w-full rounded-xl border border-outline-variant bg-surface-container p-stack-md"
            style={{ maxWidth: 360 }}
          >
            <Text
              accessibilityRole="header"
              className="mb-stack-md font-hanken-semibold text-headline-sm text-on-surface"
            >
              Período
            </Text>
            {OPTIONS.map((o) => (
              <PeriodOptionRow
                key={o.value}
                label={o.label}
                active={o.value === value}
                onPress={() => choose(o.value)}
              />
            ))}
            {value === 'custom' ? (
              <View className="mt-stack-md gap-stack-md border-t border-outline-variant pt-stack-md">
                <DateField label="De" value={from} onChange={onFromChange} />
                <DateField label="Até" value={to} onChange={onToChange} />
                <Pressable
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Aplicar período"
                  className="min-h-[44px] items-center justify-center rounded-lg bg-surface-container-highest"
                >
                  <Text className="font-geist-semibold text-label-md text-primary">Aplicar</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type PeriodOptionRowProps = { label: string; active: boolean; onPress: () => void };

function PeriodOptionRow({ label, active, onPress }: PeriodOptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: active }}
      className="min-h-[44px] flex-row items-center justify-between rounded-lg px-stack-sm"
    >
      <Text
        className={`font-geist-medium text-label-md ${active ? 'text-primary' : 'text-on-surface'}`}
      >
        {label}
      </Text>
      {active ? <Icon name="check" size={18} color="#d0bcff" /> : null}
    </Pressable>
  );
}
