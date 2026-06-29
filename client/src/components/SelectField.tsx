import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { FieldShell } from './FieldShell';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';

// icon/dotColor são opcionais: a Conta passa os dois (o glifo tingido pela cor da marca),
// a Categoria passa só o icon (tom neutro). Sem icon, o gatilho/opção fica só com o texto.
export type SelectOption = { value: string; label: string; icon?: IconName; dotColor?: string };

const ICON_NEUTRAL = colors.onSurfaceVariant;

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
};

// Select single-value genérico (Conta, Categoria): um gatilho que abre um modal de opções
// e fecha ao escolher — espelha o dropdown do PeriodFilter. disabled deixa o gatilho mudo
// (usado na edição, onde a conta não troca). O backdrop fecha; o conteúdo engole o toque.
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecionar',
  disabled = false,
  error,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const display = current?.label ?? placeholder;

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const borderClass = error ? 'border-error' : 'border-outline-variant';

  return (
    <FieldShell label={label} error={error}>
      <Pressable
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityLabel={`${label}: ${display}`}
        className={`min-h-[44px] flex-row items-center justify-between rounded-lg border bg-surface-container-lowest px-gutter ${borderClass} ${
          disabled ? 'opacity-60' : ''
        }`}
      >
        <View className="flex-1 flex-row items-center gap-stack-sm">
          {current?.icon ? (
            <Icon
              name={current.icon}
              size={18}
              color={current.dotColor ?? ICON_NEUTRAL}
              testID="select-trigger-icon"
            />
          ) : null}
          <Text
            className={`font-geist-medium text-body-md ${current ? 'text-on-surface' : 'text-on-surface-variant'}`}
          >
            {display}
          </Text>
        </View>
        {!disabled ? <Icon name="expand_more" size={18} color={ICON_NEUTRAL} /> : null}
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
              {label}
            </Text>
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {options.map((o) => (
                <SelectOptionRow
                  key={o.value}
                  option={o}
                  active={o.value === value}
                  onPress={() => choose(o.value)}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </FieldShell>
  );
}

type SelectOptionRowProps = { option: SelectOption; active: boolean; onPress: () => void };

function SelectOptionRow({ option, active, onPress }: SelectOptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: active }}
      accessibilityLabel={option.label}
      className="min-h-[44px] flex-row items-center justify-between rounded-lg px-stack-sm"
    >
      <View className="flex-1 flex-row items-center gap-stack-sm">
        {option.icon ? (
          <Icon
            name={option.icon}
            size={18}
            color={option.dotColor ?? ICON_NEUTRAL}
            testID={`select-option-icon-${option.value}`}
          />
        ) : null}
        <Text
          className={`font-geist-medium text-label-md ${active ? 'text-primary' : 'text-on-surface'}`}
        >
          {option.label}
        </Text>
      </View>
      {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}
