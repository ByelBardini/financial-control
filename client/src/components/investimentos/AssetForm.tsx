import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthButton } from '../auth/AuthButton';
import { FormField } from '../auth/FormField';
import { SelectField } from '../SelectField';
import { MoneyField } from '../contas/MoneyField';
import { ArchiveAssetButton } from './ArchiveAssetButton';
import { TickerAutocomplete } from './TickerAutocomplete';
import { Icon } from '../Icon';
import {
  ASSET_CLASSES,
  ASSET_ICON_PRESETS,
  assetClassMeta,
  validateAssetForm,
  type AssetFormErrors,
  type AssetFormValues,
} from '../../lib/assetForm';
import { colors } from '../../theme/colors';
import type { AssetClass, CatalogoItem } from '../../types/investimentos';

const classOptions = ASSET_CLASSES.map((c) => ({
  value: c.value,
  label: c.label,
  icon: c.defaultIcon,
}));

type AssetFormProps = {
  mode: 'create' | 'edit';
  initial: AssetFormValues;
  submitting?: boolean;
  serverError?: string;
  onSubmit: (values: AssetFormValues) => void;
  onArchive?: () => void;
  archiving?: boolean;
};

// Formulário de ATIVO (criar/editar). A classe é IMUTÁVEL na edição (gatilho travado, igual à conta
// em TransactionForm); trocá-la na criação repõe o ícone padrão da classe. Valida no client; o
// parent (modal) mapeia os valores e chama a mutation, devolvendo submitting/serverError.
export function AssetForm({
  mode,
  initial,
  submitting = false,
  serverError,
  onSubmit,
  onArchive,
  archiving = false,
}: AssetFormProps) {
  const [values, setValues] = useState<AssetFormValues>(initial);
  const [errors, setErrors] = useState<AssetFormErrors>({});

  function patch(next: Partial<AssetFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  function handleClassChange(assetClass: AssetClass) {
    patch({ assetClass, icon: assetClassMeta(assetClass).defaultIcon });
  }

  // Escolher uma sugestão preenche ticker + nome; o preço só quando a fonte traz (ações/FIIs via
  // brapi) — cripto vem sem preço na busca, então não sobrescreve o que o usuário já tiver digitado.
  function handlePick(item: CatalogoItem) {
    const next: Partial<AssetFormValues> = { ticker: item.ticker, name: item.name };
    if (item.priceCents > 0) next.currentPriceCents = item.priceCents;
    patch(next);
  }

  function handleSubmit() {
    const nextErrors = validateAssetForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  }

  return (
    <View className="gap-gutter">
      {values.assetClass === 'renda_fixa' ? (
        <FormField
          label="Ticker"
          value={values.ticker}
          onChangeText={(ticker) => patch({ ticker })}
          placeholder="Ex.: Tesouro IPCA+ 2029"
          autoCapitalize="characters"
          error={errors.ticker}
        />
      ) : (
        <TickerAutocomplete
          value={values.ticker}
          onChangeText={(ticker) => patch({ ticker })}
          onPick={handlePick}
          assetClass={values.assetClass}
          error={errors.ticker}
        />
      )}

      <FormField
        label="Nome"
        value={values.name}
        onChangeText={(name) => patch({ name })}
        placeholder="Ex.: WEG ON"
        error={errors.name}
      />

      <SelectField
        label="Classe"
        value={values.assetClass}
        options={classOptions}
        onChange={(v) => handleClassChange(v as AssetClass)}
        disabled={mode === 'edit'}
      />

      <MoneyField
        label="Preço atual"
        valueCents={values.currentPriceCents}
        onChangeCents={(currentPriceCents) => patch({ currentPriceCents })}
        error={errors.currentPrice}
      />

      <View className="gap-stack-sm">
        <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
          Ícone
        </Text>
        <View className="flex-row flex-wrap gap-stack-sm">
          {ASSET_ICON_PRESETS.map((name) => {
            const selected = name === values.icon;
            return (
              <Pressable
                key={name}
                onPress={() => patch({ icon: name })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Ícone ${name}`}
                className={`h-11 w-11 items-center justify-center rounded-lg border ${
                  selected
                    ? 'border-primary bg-surface-container-highest'
                    : 'border-outline-variant'
                }`}
              >
                <Icon
                  name={name}
                  size={20}
                  color={selected ? colors.primary : colors.onSurfaceVariant}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {serverError ? (
        <Text accessibilityRole="alert" className="text-label-sm text-error">
          {serverError}
        </Text>
      ) : null}

      <AuthButton
        label={mode === 'create' ? 'Criar ativo' : 'Salvar'}
        onPress={handleSubmit}
        loading={submitting}
      />

      {mode === 'edit' && onArchive ? (
        <ArchiveAssetButton onArchive={onArchive} archiving={archiving} />
      ) : null}
    </View>
  );
}
