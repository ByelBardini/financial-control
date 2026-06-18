import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

type DateFieldProps = { label: string; value: string; onChange: (date: string) => void };

// Formata um Date no fuso local como YYYY-MM-DD (evita o shift de dia do toISOString UTC).
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Variante NATIVA (iOS/Android): um campo que abre o calendário do datetimepicker. value e
// onChange em YYYY-MM-DD; vazio mostra "Selecionar". (No web, o DateField.web usa o
// <input type="date"> do browser — ver gotchas/plano.)
export function DateField({ label, value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();

  const handle = (event: DateTimePickerEvent, picked?: Date) => {
    setOpen(false);
    if (event.type === 'set' && picked) {
      onChange(fmt(picked));
    }
  };

  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'selecionar data'}`}
        className="min-h-[44px] justify-center rounded-lg border border-outline-variant px-stack-md"
      >
        <Text className="font-geist-medium text-label-md text-on-surface">
          {value || 'Selecionar'}
        </Text>
      </Pressable>
      {open ? <DateTimePicker value={current} mode="date" onChange={handle} /> : null}
    </View>
  );
}
