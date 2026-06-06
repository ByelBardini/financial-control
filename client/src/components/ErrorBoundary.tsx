import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { crashed: boolean };

// Exceção consciente à regra "sem class components": React 19 ainda exige
// classe para capturar erros de render (getDerivedStateFromError).
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center gap-base bg-background p-gutter">
        <Text className="font-hanken-bold text-headline-sm text-on-surface">
          Algo quebrou aqui.
        </Text>
        <Text className="font-hanken text-body-md text-on-surface-variant">
          Respira — não foi sua conta bancária.
        </Text>
      </View>
    );
  }
}
