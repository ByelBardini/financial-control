import { View } from 'react-native';
import { PanelHeading } from './PanelHeading';
import { RecurrenceRow } from '../RecurrenceRow';
import type { Recurrence } from '../../types/transacoes';

type RecorrenciasPanelProps = { recurrences: Recurrence[]; hidden: boolean };

// Painel lateral de Recorrências (desktop): cabeçalho com contagem + as linhas
// (reusa RecurrenceRow do mobile, presentacional). Receitas e assinaturas juntas.
export function RecorrenciasPanel({ recurrences, hidden }: RecorrenciasPanelProps) {
  return (
    <View className="gap-stack-md p-stack-lg">
      <PanelHeading
        icon="event_repeat"
        iconColor="#d0bcff"
        title="Recorrências"
        count={`${recurrences.length} ATIVAS`}
      />
      {recurrences.map((recurrence) => (
        <RecurrenceRow key={recurrence.id} recurrence={recurrence} hidden={hidden} />
      ))}
    </View>
  );
}
