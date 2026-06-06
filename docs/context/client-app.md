# App Expo (client/)

> Leia antes de mexer em telas, componentes, hooks ou chamadas à API.
> **Antes de usar qualquer API do Expo/React Native, confirme na doc versionada v56** (ver `client/AGENTS.md` → https://docs.expo.dev/versions/v56.0.0/).

## Estado atual
- Expo 56 / React Native 0.85 / React 19 / TypeScript 6 (strict). New Architecture ligada (default do SDK 56).
- Entry: `index.ts` (importa `./global.css`) → `App.tsx`. Roda iOS, Android e Web. Web em http://localhost:8081.
- **Estilo: NativeWind v4.2** (Tailwind RN). Tokens do tema (cores/spacing/type scale/fontes) em `tailwind.config.js`. Tema **dark único** (`userInterfaceStyle: "dark"`).
- **Fontes:** Hanken Grotesk (headings/body) + Geist (labels) via `@expo-google-fonts`, carregadas em `useAppFonts` com gate de splash (`expo-splash-screen`).
- **Ícones:** `@expo/vector-icons` (MaterialIcons) embrulhados em `src/components/Icon.tsx` (único ponto que importa a lib; vocabulário semântico → glifo). Sem label = decorativo (oculto pro leitor de tela).
- **Tela Dashboard ("Pobrify") responsiva** e ligada à **API real** (React Query, dados por seção; CORS habilitado no server): em tela larga (≥1024px, web/PC) renderiza o **layout desktop** (sidebar fixa + grid enterprise de células com bordas finas + glow `expo-linear-gradient`); em tela estreita, a **pilha mobile**. Navegação (sidebar/bottom-nav) é **estática** (visual, não navega).

## Estrutura `src/`
- `screens/` — `DashboardScreen` só escolhe o layout via `useIsDesktop` e compartilha o estado de máscara. `MobileDashboard`/`DesktopDashboard` buscam os dados **por seção** (cada card é um `useQuery`) e usam `QuerySection`/`QuerySection2` (gate skeleton/erro/dados) — os componentes de seção seguem presentacionais (prop-driven). O shell (QueryClientProvider, SafeAreaProvider, gate de fontes, StatusBar) vive no `App.tsx`, deixando a tela portável pra um futuro Expo Router.
- `components/` — um componente por arquivo. Mobile: TopBar, BalanceHero, AccountsSection/AccountRow, InvestmentsSection/InvestmentRow, CategorySpendSection/CategoryBar (a barra revela o share — `percent` do total — ao lado do valor no hover no PC / toque no mobile), DiagnosisCard, BottomNav/BottomNavItem, MobileDashboard. Primitivos compartilhados: MoneyText, ProgressBar, StatusBadge, SectionHeading, SubMetric, Icon, ErrorBoundary, QuerySection/QuerySection2 (gate de query), SectionSkeleton, SectionError.
- `components/desktop/` — layout enterprise: SideNav/SideNavItem, DesktopHeader, SaldoHero, ContasPanel, InvestimentosPanel, EsteMesPanel, CategoriasPanel, TickerPanel, DesktopDashboard (grid 12-col com bordas `border-grid-line`).
- `hooks/` — `useDashboardQueries` (hooks por recurso: `useAccounts`/`useMonthBalance`/… cada um um `useQuery`), `useHideValues` (mascarar valores), `useHoverReveal` (revela algo no hover do mouse e, no toque, esconde sozinho após ~2s — usado pelo `CategoryBar` pro share %), `useAppFonts`, `useIsDesktop` (breakpoint 1024 via `useWindowDimensions`).
- `lib/` — puro, sem RN: `money.ts` (`formatBRL`), `percent.ts` (`formatDailyChange`, `changeTone`).
- `theme/` — `colors.ts` (paleta em JS pra cor de ícone, que é prop e não className).
- `types/` — `dashboard.ts` (modelo tipado; **monetário em centavos inteiros**).
- `api/` — camada de dados: `config.ts` (base URL via `EXPO_PUBLIC_API_URL`), `client.ts` (`apiGet`/`ApiError` — único `fetch`), `dashboard.ts` (uma função por endpoint), `queryClient.ts` (QueryClient compartilhado).
- `mocks/` — `dashboardSnapshot.ts` é **fixture de teste** (injetado nos testes dos componentes apresentacionais). Sem importador em runtime.

## Convenções
- **Componentizado, sem monolitos.** Um componente por arquivo; tela só compõe; lógica/estado em hooks. Arquivo perto de 500 linhas = quebrar.
- Componentes funcionais + hooks. **Exceção:** `ErrorBoundary` é class component (React 19 ainda exige classe pra `getDerivedStateFromError`).
- `strict` no TS; sem `any`.
- Dinheiro: nunca aritmética com `number` cru (ver `money.md`); formate só na borda via `lib/money.ts#formatBRL`.
- **Acessibilidade é padrão:** toggles com `accessibilityRole`/estado, alvos de toque ≥44px, ícones decorativos ocultos, barras com `accessibilityValue`, valores mascarados com `accessibilityLabel="valor oculto"`.
- **Camada de dados:** toda chamada HTTP vive em `src/api` (`client.ts#apiGet` é o único `fetch`; `dashboard.ts` tem uma função por endpoint). Nenhum `.tsx` chama API. React Query (`@tanstack/react-query`) provê cache/loading/erro via hooks por recurso em `src/hooks/useDashboardQueries.ts`. Base URL: `EXPO_PUBLIC_API_URL` (default `http://localhost:8080`).
- TDD: teste primeiro (red→green→refactor) pra todo componente/hook/função nova.

## Testes
- Jest + `jest-expo` + `@testing-library/react-native` v14. Config em `client/jest.config.js` (estende o preset do jest-expo: libera `nativewind` no `transformIgnorePatterns` e carrega `jest.setup.ts`). Testes em `client/__tests__/` espelhando `src/`. Rode: `npm run test:client`.
- **Idiomas RNTL 14:** matchers embutidos (`toBeOnTheScreen`, `toBeChecked`, `toBeSelected`, `toHaveAccessibilityValue`, `toHaveStyle`) — **não** `.toBeTruthy()`. Interações com `userEvent` (`await userEvent.setup().press(...)`), não `fireEvent`.
- **`render`, `renderHook` e `act` são assíncronos** (RNTL 14 / React 19): use `await`. Ver `gotchas.md`.
- Componentes testam texto/role/estado, nunca `style`/`className` (NativeWind não aplica estilo no jest). `jest.setup.ts` mocka fontes, splash e SafeAreaProvider.
- **React Query nos testes:** `jest.mock('../../src/api/dashboard')` + o helper `__tests__/_support/renderWithClient.tsx` (`renderWithClient` envolve num `QueryClientProvider` de teste com `gcTime: 0`/`retry: false` — senão o timer de GC segura o processo; `mockDashboardApi()` resolve cada endpoint do `dashboardSnapshot`). Dados chegam async → use `await screen.findBy…`. `_support/` é ignorado pelo jest (`testPathIgnorePatterns`).
- **Cobertura de seção/dados:** o gate `QuerySection`/`QuerySection2` é testado direto (skeleton, erro com `label`, retry→`refetch`, dados) com fakes do `UseQueryResult`; os dashboards testam **isolamento de erro** (uma `useQuery` rejeitada vira `SectionError` só na seção e o resto renderiza — `mockDashboardApi()` + `mockRejectedValue` num endpoint). Os hooks de `useDashboardQueries` cobrem `month`→`queryFn` + chave de cache por mês; `src/api/dashboard` cobre o `monthQuery` (`?month=` vs omitido) mockando `apiGet`; `CategoryBar` cobre a máscara (`hidden`) e o revelar do share no toque.

## Decisões resolvidas
- **Navegação:** adiada de propósito — só a tela Dashboard com barra inferior estática. Quando entrar, candidato é Expo Router (shell já isolado no `App.tsx`).
- **Estado/queries:** React Query adotado. Dados por recurso em `src/hooks/useDashboardQueries.ts`, chamadas em `src/api`, loading/erro **por seção** via `QuerySection`. Base URL em `EXPO_PUBLIC_API_URL` (build-time; reinicie o Expo ao mudar; device físico usa o IP da LAN).
