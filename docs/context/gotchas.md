# Gotchas

> Registre aqui padrões contraintuitivos e bugs recorrentes assim que aparecerem.
> Formato por entrada: **Sintoma → Causa → Correção**, com SHA/issue quando houver.

## RNTL 14: `render` é assíncrono
- **Sintoma:** `TypeError: getByText is not a function` ao desestruturar `const { getByText } = render(...)`, ou `render function has not been called` ao usar `screen.getByText`.
- **Causa:** `@testing-library/react-native` v14 (React 19, concurrent) faz `render` retornar uma **Promise**. A desestruturação síncrona pega a Promise vazia.
- **Correção:** `await render(<Componente />)` e busque elementos via `screen.*`:
  ```tsx
  await render(<App />);
  expect(screen.getByText(/.../)).toBeTruthy();
  ```
  O callback do `it(...)` precisa ser `async`.

## RNTL 14: `renderHook` e `act` também são assíncronos
- **Sintoma:** `Cannot read properties of undefined (reading 'current')` após `const { result } = renderHook(...)`; ou estado não atualiza após `act(() => ...)` (warning "called act(async) without await").
- **Causa:** sob React 19, `renderHook` retorna Promise e o `act` precisa ser aguardado pra fazer flush do re-render.
- **Correção:** `const { result } = await renderHook(...)` e `await act(async () => { result.current.toggle(); })`.

## RNTL 14: matchers de estado mudaram
- **Sintoma:** `expect(...).toHaveAccessibilityState is not a function`.
- **Causa:** os matchers embutidos do RNTL 14 substituíram o `toHaveAccessibilityState` do antigo jest-native.
- **Correção:** use os dedicados: `toBeChecked()`/`not.toBeChecked()` (switch/checkbox), `toBeSelected()`, `toBeDisabled()`, etc.

## RNTL: `getByRole`/`getByTestId` e elementos de acessibilidade
- **Sintoma:** `Unable to find an element with role: progressbar/button` mesmo com `accessibilityRole` no `<View>`; ou `getByTestId` não acha um ícone decorativo.
- **Causa:** `getByRole` só enxerga elementos acessíveis; um `<View>` com role mas sem `accessible` não conta. E `getByTestId` exclui elementos ocultos da árvore de acessibilidade por padrão (ícone decorativo com `accessibilityElementsHidden`/`importantForAccessibility="no"`).
- **Correção:** ponha `accessible` no `<View>` que tem role; pra inspecionar um nó decorativo, use `getByTestId(id, { includeHiddenElements: true })`.

## NativeWind v4 no jest
- **Sintoma:** `SyntaxError: Cannot use import statement outside a module` vindo de `expo-modules-core`, OU `className` não estilizando.
- **Causa:** sobrescrever o `transformIgnorePatterns` do jest-expo quebra a allowlist dele (prefixos como `expo` sem barra final). O preset já transforma todos os `react-native-*` (inclui `react-native-css-interop`); falta só liberar `nativewind`.
- **Correção:** em `jest.config.js`, estenda o preset e injete `nativewind` na allowlist (ex.: `.replace('native-base', 'native-base|nativewind')`), em vez de reescrever o regex à mão. Não asserte estilo no jest — só texto/role.

## SDK 56: `@expo/vector-icons` e `expo-asset` não vêm automáticos
- **Sintoma:** `Cannot find module '@expo/vector-icons'`, depois `Cannot find module 'expo-asset' from expo-font/FontLoader`.
- **Causa:** no SDK 56 o `@expo/vector-icons` não é instalado por padrão, e ele puxa `expo-font` → `expo-asset` (que precisa existir).
- **Correção:** `npx expo install @expo/vector-icons expo-asset`.

## SafeAreaProvider não renderiza filhos no jest
- **Sintoma:** árvore vazia (`<RNCSafeAreaProvider />`) e nenhum texto encontrado.
- **Causa:** `SafeAreaProvider` espera medir os insets (layout) antes de renderizar os filhos — evento que não chega no jest.
- **Correção:** no `jest.setup.ts`, `jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)` (injeta métricas iniciais).

## `Intl` de moeda emite NBSP
- **Sintoma:** assert de string de dinheiro falha por um espaço "invisível" diferente entre web/device/Node.
- **Causa:** `Intl.NumberFormat('pt-BR', {style:'currency'})` usa NBSP (` `) / narrow-NBSP (` `) entre `R$` e o número, e a saída varia por engine.
- **Correção:** normalizar dentro do `formatBRL` (`.replace(/[  ]/g, ' ')`) — nunca só tolerar no teste.
