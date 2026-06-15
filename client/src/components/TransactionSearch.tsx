import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from './Icon';

type TransactionSearchProps = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  compact?: boolean;
};

// Campo de busca de transações (controlado). O debounce mora na camada que consome
// (useDebouncedValue), então aqui é só o input — cada tecla chama onChange na hora. `compact`
// encolhe a altura no header desktop (proporcional aos botões); o default ≥44px é pro mobile.
// `outline-none` mata o anel de foco padrão do <input> na web (a "caixa" feia); o foco vira
// um realce na própria borda (border-primary) — mesmo padrão do FormField.
export function TransactionSearch({
  value,
  onChange,
  placeholder = 'Filtrar eventos...',
  compact = false,
}: TransactionSearchProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      accessibilityRole="search"
      className={`${compact ? 'min-h-[36px]' : 'min-h-[44px]'} flex-row items-center gap-stack-sm rounded-full border bg-surface-container-lowest px-stack-md ${
        focused ? 'border-primary' : 'border-outline-variant'
      }`}
    >
      <Icon name="search" size={20} color="#cbc3d7" />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor="#cbc3d7"
        accessibilityLabel="Buscar transações"
        className="flex-1 font-geist-medium text-label-md text-on-surface outline-none"
      />
    </View>
  );
}
