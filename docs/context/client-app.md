# App Expo (client/)

> Leia antes de mexer em telas, componentes, hooks ou chamadas à API.
> **Antes de usar qualquer API do Expo/React Native, confirme na doc versionada v56** (ver `client/AGENTS.md` → https://docs.expo.dev/versions/v56.0.0/).

## Estado atual
- Expo 56 / React Native 0.85 / React 19 / TypeScript 6.
- Entry: `index.ts` → `App.tsx`. Roda iOS, Android e Web (`expo start --web`).
- Web em http://localhost:8081.

## Convenções (alvo)
- Estrutura: `src/screens`, `src/components`, `src/hooks`, `src/api`.
- **Componentizado, sem monolitos.** Um componente por arquivo; tela só compõe componentes. Lógica e estado vão pra hooks (`src/hooks`), não inflar a tela. Arquivo perto de 500 linhas = quebrar.
- Componentes funcionais + hooks. Sem class components.
- `strict` no TS; sem `any`.
- Cliente HTTP tipado em `src/api` falando com a API Go (base URL por env). Estado de servidor não fica espalhado nas telas.
- Dinheiro: nunca aritmética com `number` cru (ver `money.md`); formate só na borda da UI.
- TDD: teste primeiro (red→green→refactor) pra componente/hook novo.

## Testes
- Jest + `jest-expo` + `@testing-library/react-native`. Config no `client/package.json` (`"jest": { "preset": "jest-expo" }`).
- Testes ficam em `client/__tests__/` (o Jest já reconhece essa pasta por padrão). Rode: `npm run test --prefix client`.
- **`render` é assíncrono** (RNTL 14 / React 19): use `await render(<Comp />)` e busque via `screen.*`. Ver `gotchas.md`.

## Decisões em aberto
- [ ] Escolher solução de navegação (ex: Expo Router vs React Navigation).
- [ ] Definir camada de estado/queries (ex: React Query).
