import { Pressable, Text, View } from 'react-native';
import { DateField } from '../DateField';
import { SelectField } from '../SelectField';
import type { RecurrenceEndMode } from '../../lib/transactionForm';
import type { RecurrenceFrequency } from '../../types/transacoes';

// Sub-formulário da recorrência ("Fixo"): frequência + como termina (indefinido / até data /
// nº de vezes), com os campos do fim revelados sob demanda (progressive disclosure).
export type RecurrenceValues = {
  frequency: RecurrenceFrequency;
  endMode: RecurrenceEndMode;
  endDate: string;
  occurrences: number;
};

type RecurrenceFieldsProps = {
  values: RecurrenceValues;
  errors?: { endDate?: string; occurrences?: string };
  onChange: (next: Partial<RecurrenceValues>) => void;
};

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'daily', label: 'Diária' },
  { value: 'yearly', label: 'Anual' },
];

const END_MODES: { value: RecurrenceEndMode; label: string }[] = [
  { value: 'forever', label: 'Indefinido' },
  { value: 'until', label: 'Até data' },
  { value: 'count', label: 'Nº de vezes' },
];

const OCCURRENCE_OPTIONS = [2, 3, 6, 12, 24, 36].map((n) => ({ value: String(n), label: `${n}×` }));

export function RecurrenceFields({ values, errors, onChange }: RecurrenceFieldsProps) {
  return (
    <View className="gap-gutter rounded-lg border border-outline-variant p-stack-md">
      <SelectField
        label="Frequência"
        value={values.frequency}
        options={FREQUENCY_OPTIONS}
        onChange={(f) => onChange({ frequency: f as RecurrenceFrequency })}
      />

      <View className="gap-stack-sm">
        <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
          Termina
        </Text>
        <View className="flex-row gap-stack-sm">
          {END_MODES.map((m) => {
            const selected = m.value === values.endMode;
            return (
              <Pressable
                key={m.value}
                onPress={() => onChange({ endMode: m.value })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={m.label}
                className={`min-h-11 flex-1 items-center justify-center rounded-lg border py-stack-sm ${
                  selected
                    ? 'border-primary bg-surface-container-highest'
                    : 'border-outline-variant'
                }`}
              >
                <Text
                  className={`font-geist-medium text-label-sm ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {values.endMode === 'until' ? (
        <View className="gap-stack-sm">
          <DateField
            label="Até"
            value={values.endDate}
            onChange={(endDate) => onChange({ endDate })}
          />
          {errors?.endDate ? (
            <Text accessibilityRole="alert" className="text-label-sm text-error">
              {errors.endDate}
            </Text>
          ) : null}
        </View>
      ) : null}

      {values.endMode === 'count' ? (
        <SelectField
          label="Repetições"
          value={String(values.occurrences)}
          options={OCCURRENCE_OPTIONS}
          onChange={(n) => onChange({ occurrences: Number(n) })}
          error={errors?.occurrences}
        />
      ) : null}
    </View>
  );
}
