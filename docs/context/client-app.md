# App Expo (client/)

> Leia antes de mexer em telas, componentes, hooks ou chamadas à API.
> **Antes de usar qualquer API do Expo/React Native, confirme na doc versionada v56** (ver `client/AGENTS.md` → https://docs.expo.dev/versions/v56.0.0/).

## Estado atual
- Expo 56 / React Native 0.85 / React 19 / TypeScript 6 (strict). New Architecture ligada (default do SDK 56).
- Entry: `index.ts` (importa `./global.css`) → `App.tsx`. Roda iOS, Android e Web. Web em http://localhost:8081.
- **Estilo: NativeWind v4.2** (Tailwind RN). Tokens do tema (cores/spacing/type scale/fontes) em `tailwind.config.js`. Tema **dark único** (`userInterfaceStyle: "dark"`).
- **Fontes:** Hanken Grotesk (headings/body) + Geist (labels) via `@expo-google-fonts`, carregadas em `useAppFonts` com gate de splash (`expo-splash-screen`).
- **Ícones:** `@expo/vector-icons` (MaterialIcons) embrulhados em `src/components/Icon.tsx` (único ponto que importa a lib; vocabulário semântico → glifo). Sem label = decorativo (oculto pro leitor de tela).
- **Tela Dashboard ("Pobrify") responsiva** e mockada (sem backend): em tela larga (≥1024px, web/PC) renderiza o **layout desktop** (sidebar fixa + grid enterprise de células com bordas finas + glow `expo-linear-gradient`); em tela estreita, a **pilha mobile**. Navegação (sidebar/bottom-nav) é **estática** (visual, não navega).

## Estrutura `src/`
- `screens/` — `DashboardScreen` só escolhe o layout via `useIsDesktop` e injeta `data` + estado de máscara; `MobileDashboard`/`DesktopDashboard` são presentacionais (recebem `data`/`hidden`/`onToggleHidden`). O shell (SafeAreaProvider, gate de fontes, StatusBar) vive no `App.tsx`, deixando a tela portável pra um futuro Expo Router.
- `components/` — um componente por arquivo. Mobile: TopBar, BalanceHero, AccountsSection/AccountRow, InvestmentsSection/InvestmentRow, CategorySpendSection/CategoryBar, DiagnosisCard, BottomNav/BottomNavItem, MobileDashboard. Primitivos compartilhados: MoneyText, ProgressBar, StatusBadge, SectionHeading, SubMetric, Icon, ErrorBoundary.
- `components/desktop/` — layout enterprise: SideNav/SideNavItem, DesktopHeader, SaldoHero, ContasPanel, InvestimentosPanel, EsteMesPanel, CategoriasPanel, TickerPanel, DesktopDashboard (grid 12-col com bordas `border-grid-line`).
- `hooks/` — `useDashboardData` (seam de dados), `useHideValues` (mascarar valores), `useAppFonts`, `useIsDesktop` (breakpoint 1024 via `useWindowDimensions`).
- `lib/` — puro, sem RN: `money.ts` (`formatBRL`), `percent.ts` (`formatDailyChange`, `changeTone`).
- `theme/` — `colors.ts` (paleta em JS pra cor de ícone, que é prop e não className).
- `types/` — `dashboard.ts` (modelo tipado; **monetário em centavos inteiros**).
- `mocks/` — **`dashboardSnapshot.ts` é o único dado fake e é deletável**: quando a API real chegar, troque o corpo de `useDashboardData` por `useQuery` e apague `src/mocks/`. Nenhum componente importa o mock direto.

## Convenções
- **Componentizado, sem monolitos.** Um componente por arquivo; tela só compõe; lógica/estado em hooks. Arquivo perto de 500 linhas = quebrar.
- Componentes funcionais + hooks. **Exceção:** `ErrorBoundary` é class component (React 19 ainda exige classe pra `getDerivedStateFromError`).
- `strict` no TS; sem `any`.
- Dinheiro: nunca aritmética com `number` cru (ver `money.md`); formate só na borda via `lib/money.ts#formatBRL`.
- **Acessibilidade é padrão:** toggles com `accessibilityRole`/estado, alvos de toque ≥44px, ícones decorativos ocultos, barras com `accessibilityValue`, valores mascarados com `accessibilityLabel="valor oculto"`.
- **Seam de dados:** `useDashboardData` retorna `{ data, isLoading, isError, error }` (formato TanStack Query) — adotar React Query depois não toca os componentes.
- TDD: teste primeiro (red→green→refactor) pra todo componente/hook/função nova.

## Testes
- Jest + `jest-expo` + `@testing-library/react-native` v14. Config em `client/jest.config.js` (estende o preset do jest-expo: libera `nativewind` no `transformIgnorePatterns` e carrega `jest.setup.ts`). Testes em `client/__tests__/` espelhando `src/`. Rode: `npm run test:client`.
- **Idiomas RNTL 14:** matchers embutidos (`toBeOnTheScreen`, `toBeChecked`, `toBeSelected`, `toHaveAccessibilityValue`, `toHaveStyle`) — **não** `.toBeTruthy()`. Interações com `userEvent` (`await userEvent.setup().press(...)`), não `fireEvent`.
- **`render`, `renderHook` e `act` são assíncronos** (RNTL 14 / React 19): use `await`. Ver `gotchas.md`.
- Componentes testam texto/role/estado, nunca `style`/`className` (NativeWind não aplica estilo no jest). `jest.setup.ts` mocka fontes, splash e SafeAreaProvider.

## Decisões resolvidas
- **Navegação:** adiada de propósito — só a tela Dashboard com barra inferior estática. Quando entrar, candidato é Expo Router (shell já isolado no `App.tsx`).
- **Estado/queries:** seam `useDashboardData` no formato TanStack Query, pronto pra adotar React Query sem refatorar consumidores.
