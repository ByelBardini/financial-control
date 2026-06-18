import { Pressable, Text, View } from 'react-native';
import type { TransactionEntryKind } from '../../lib/transactionForm';
import type { TransactionDirection } from '../../types/transacoes';

type EntryKindSelectProps = {
  value: TransactionEntryKind;
  direction: TransactionDirection;
  onChange: (kind: TransactionEntryKind) => void;
};

// Tipo de lançamento: Único (avulso), Parcelado (N parcelas) ou Fixo (recorrente).
// Segmentado acessível — espelha o AccountTypeSelect. Parcelado é sempre despesa, então some
// quando o sentido é Receita (inflow) — só Único/Fixo.
const OPTIONS: { value: TransactionEntryKind; label: string }[] = [
  { value: 'unico', label: 'Único' },
  { value: 'parcelado', label: 'Parcelado' },
  { value: 'fixo', label: 'Fixo' },
];

export function EntryKindSelect({ value, direction, onChange }: EntryKindSelectProps) {
  const options = direction === 'inflow' ? OPTIONS.filter((o) => o.value !== 'parcelado') : OPTIONS;
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
        Tipo de lançamento
      </Text>
      <View className="flex-row gap-stack-sm">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              className={`min-h-11 flex-1 items-center justify-center rounded-lg border py-stack-md ${
                selected ? 'border-primary bg-surface-container-highest' : 'border-outline-variant'
              }`}
            >
              <Text
                className={`font-geist-semibold text-label-md ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
