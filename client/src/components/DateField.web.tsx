import { Text, View } from 'react-native';

type DateFieldProps = { label: string; value: string; onChange: (date: string) => void };

// Variante WEB (alvo principal — PC): usa o date input nativo do browser, que já traz um
// calendário de verdade, sem dependência. value/onChange em YYYY-MM-DD. O widget é estilizado
// pelo browser (color-scheme dark deixa o calendário escuro).
export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">{label}</Text>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{
          backgroundColor: '#1e2024',
          color: '#e2e2e8',
          border: '1px solid #494454',
          borderRadius: 8,
          padding: 8,
          fontFamily: 'Geist_500Medium',
          fontSize: 14,
          colorScheme: 'dark',
        }}
      />
    </View>
  );
}
