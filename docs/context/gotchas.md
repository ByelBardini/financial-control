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

## `jest.mock` de componente RN: `_ReactNativeCSSInterop` fora de escopo
- **Sintoma:** `ReferenceError: The module factory of jest.mock() is not allowed to reference any out-of-scope variables. Invalid variable access: _ReactNativeCSSInterop` ao mockar um componente cuja fábrica renderiza algo de `react-native` (via JSX **ou** `React.createElement`).
- **Causa:** o babel hoista a fábrica do `jest.mock` acima dos imports; o transform do NativeWind injeta `_ReactNativeCSSInterop` em qualquer render de componente RN, e essa referência fica fora de escopo no ponto hoisted.
- **Correção:** mova o stub pra um módulo próprio (ex.: `__tests__/_support/DashboardStub.tsx`) e `require`-o **lazy** na fábrica — `jest.mock('…/DashboardScreen', () => ({ DashboardScreen: require('../_support/DashboardStub').DashboardStub }))`. O módulo separado é compilado normalmente (interop no escopo). Mantenha o `// eslint-disable-next-line @typescript-eslint/no-require-imports` na linha do `require`.

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

## React Query nos testes: o jest não sai do processo
- **Sintoma:** os testes passam, mas o `jest` trava no fim ("Jest did not exit…"); só sai com `--forceExit`.
- **Causa:** um `QueryClient` mantém um timer de garbage-collection (`gcTime`, default 5 min) aberto após o teste.
- **Correção:** nos testes, crie o client com `{ defaultOptions: { queries: { retry: false, gcTime: 0 } } }`; se o teste usa o client real do app (ex.: `App.test`), `queryClient.clear()` no `afterEach`. Ver `__tests__/_support/renderWithClient.tsx`.

## Helper em `__tests__/` vira "suíte sem teste"
- **Sintoma:** `Your test suite must contain at least one test` num arquivo de utilidades (ex.: `_support/renderWithClient.tsx`).
- **Causa:** o `testMatch` do jest-expo pega tudo em `__tests__/`, inclusive helpers sem `it()`.
- **Correção:** em `jest.config.js`, `testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/_support/']`.

## `global` não é tipado nos testes
- **Sintoma:** `tsc` acusa `Cannot find name 'global'` ao mockar `global.fetch`.
- **Causa:** sem `@types/node`, o `global` do Node não tem tipo no client.
- **Correção:** use `globalThis` (padrão ES, já tipado): `globalThis.fetch = fetchMock as unknown as typeof fetch`.

## Primeira `<Image>`: asset por `require` e geração dos ícones
- **Sintoma:** dúvida se `<Image source={require('../../assets/x.png')}>` precisa de mock no jest; e por que o favicon não fica arredondado no navegador / o ícone iOS aparece com bordas escuras.
- **Causa:** (a) o preset do jest-expo já mocka o `require` de assets (vira um número), então a `<Image>` renderiza sem arquivo real — não precisa mock extra; consultar uma imagem decorativa é igual a ícone decorativo (`getByTestId(id, { includeHiddenElements: true })`). (b) Cada plataforma arredonda diferente: **iOS** aplica a máscara squircle sozinho (o `icon.png` tem que ser **quadrado opaco, sem pixels transparentes/cantos** — alpha vira borda escura); **Android adaptive** mascara o `foregroundImage` (transparente) sobre o `backgroundColor`; **web** **não** arredonda o favicon, então os cantos têm que ser "queimados" no PNG.
- **Correção:** o `BrandLogo` (`src/components/BrandLogo.tsx`) usa RN core `Image` + `require` (com `// eslint-disable-next-line @typescript-eslint/no-require-imports`). Favicon/ícone saem de `scripts/generate-app-icons.mjs` (`npm run icons`, jimp): favicon com cantos arredondados via máscara alpha (supersample p/ suavizar), `icon.png` opaco sem cantos, `android-icon-foreground.png` transparente + `adaptiveIcon.backgroundColor`. Trocar logo/cor = rerodar o script.

## sqlc lê o schema das migrations goose
- **Sintoma:** dúvida se o sqlc vai dropar tabelas ao ler a migration (que tem Up **e** Down no mesmo arquivo).
- **Causa:** `schema: db/migrations` aponta pro arquivo goose; o sqlc parseia o DDL.
- **Correção:** o sqlc **ignora a seção `-- +goose Down`** (suporta goose/golang-migrate/etc.) — mas os arquivos precisam ter numeração **zero-padded** (`00001_…`) p/ ordenar lexicograficamente. Funções plpgsql entram entre `-- +goose StatementBegin`/`End`.

## NUMERIC vira centavos só por cast no SQL
- **Sintoma:** risco do sqlc gerar `pgtype.Numeric`/`float64` para dinheiro.
- **Causa:** selecionar uma coluna `numeric` crua deixa o tipo a cargo do driver.
- **Correção:** nas queries de leitura, converta no SQL: `(valor * 100)::bigint AS x_cents` → o sqlc devolve `int64` (centavos), nunca float. Ver `money.md`.

## Expo Web não enxerga a API Go sem CORS
- **Sintoma:** no navegador, o fetch pro `:8080` falha com erro de CORS mesmo a API respondendo.
- **Causa:** Expo Web (`:8081`) → API (`:8080`) é cross-origin; sem `Access-Control-Allow-Origin` o browser bloqueia a leitura.
- **Correção:** middleware `httpx.CORS` embrulhando o mux em `router.New` (origem via `CORS_ALLOW_ORIGIN`). RN nativo não tem CORS — só afeta a web.

## Expo Web `output: single` (SPA): refresh em rota profunda dá 404 no host estático
- **Sintoma:** com URL por tela (`/contas`, `/transacoes`…) via History API (`useUrlRoute.web`), navegar clicando funciona, mas **F5 / abrir direto** uma rota profunda **404 num host estático** (`expo export -p web`). No dev (`expo start --web`) funciona.
- **Causa:** o web do projeto é **SPA** (`app.json` → `web.output: "single"`, default do SDK 56): o export gera **um só `index.html`** + assets, sem HTML por rota. O `useUrlRoute` (web) lê `window.location.pathname` no boot pra cair na tela certa — mas isso exige que o host **devolva o `index.html` pra qualquer caminho**. O dev server já faz esse fallback SPA; um host estático cru não.
- **Correção:** configurar **rewrite SPA** no host de produção (todo path desconhecido → `/index.html`, status 200): Netlify/`client/public/_redirects` → `/*    /index.html   200`; Vercel → `{ "rewrites": [{ "source": "/:path*", "destination": "/" }] }`; Nginx → `try_files $uri /index.html;`; Apache → `FallbackResource /index.html`. (`public/` é copiado no export — criar o `_redirects` só quando for hospedar.) Escape hatch p/ host sem rewrite: hash routing (`/#/contas`). Em dev não precisa de nada. Ver `navigation/useUrlRoute.web.ts` + `routePath.ts`.

## `go run` deixa órfão segurando a porta
- **Sintoma:** ao reiniciar o server, `listen tcp :8080: bind: ... only one usage of each socket address`.
- **Causa:** matar o `go run` nem sempre mata o binário-filho compilado, que continua escutando a porta.
- **Correção:** o `npm run dev` usa `nodemon` (mata a árvore no reload) + hooks `predev:*` com `kill-port 8080/8081` (rede de segurança no boot).

## golangci-lint `misspell` acusa palavra em português
- **Sintoma:** `misspell` aponta ex.: `respondendo` como erro de "responded".
- **Causa:** o `misspell` usa dicionário em inglês e confunde palavras próximas do pt-BR.
- **Correção:** reescreva o termo no comentário (ex.: "tratando"). Não vale desabilitar a regra.

## Jest: `toHaveBeenCalledTimes` conta chamadas de testes anteriores do mesmo arquivo
- **Sintoma:** `expect(mock).toHaveBeenCalledTimes(2)` falha com "Received number of calls: 4" mesmo o `it()` só chamando 2x.
- **Causa:** sem `clearMocks` global no preset do jest-expo, o histórico de chamadas de um `jest.fn()`/`jest.mock(...)` acumula entre os `it()` do mesmo arquivo.
- **Correção:** `jest.clearAllMocks()` no `beforeEach` do bloco **antes** de reconfigurar o mock (ex.: `mockResolvedValue`). Aí asserts de count viram relativos ao teste atual.

## `npx jest` fora de `client/` pega um jest do cache e quebra todas as suítes
- **Sintoma:** todas as suítes falham de uma vez com "Cannot use import statement outside a module" / "Jest encountered an unexpected token", e o stack aponta pra `.../npm-cache/_npx/.../jest-runtime`.
- **Causa:** rodar `npx jest` com o CWD fora de `client/` (ex.: depois de um `cd server` numa chamada anterior — o diretório persiste entre comandos) não acha o jest local nem o `jest.config.js`/babel do projeto, então o npx baixa um jest avulso sem transform.
- **Correção:** `cd client` antes (o `npm run test:client` da raiz já faz isso). Não é falha real de teste — é diretório errado.

## pgx `Exec` com args só aceita 1 statement
- **Sintoma:** `ERROR: cannot insert multiple commands into a prepared statement (SQLSTATE 42601)` ao rodar vários `INSERT;`/`UPDATE;` num só `conn.Exec(ctx, sql, args...)`.
- **Causa:** com argumentos, o pgx usa o **protocolo estendido** (prepared statement), que permite só um comando por chamada. O protocolo simples (`Exec` **sem** args — ex.: o `seed.sql`) aceita múltiplos statements.
- **Correção:** um `Exec` por statement (cada um com seus args), ou um `pgx.Batch`/transação. Ver `seedUserB` em `server/test/auth_integration_test.go`.

## bcrypt do pgcrypto (`crypt`) ↔ `x/crypto/bcrypt` do Go
- **Sintoma:** dúvida se dá pra semear o hash da senha no SQL e validar no Go (ou vice-versa).
- **Causa:** ambos implementam o bcrypt do OpenBSD. `crypt('senha', gen_salt('bf', 10))` do pgcrypto gera um hash `$2a$10$…` que o `bcrypt.CompareHashAndPassword` do Go aceita — e o inverso também.
- **Correção:** o usuário padrão é semeado na migration `00002` via `crypt(...)`; **casar o cost com o `bcrypt.DefaultCost` do Go (10)**. O login do `teste@teste.com`/`12345` no teste de integração prova a interoperabilidade.

## JWT: fixe o algoritmo na verificação (alg pinning)
- **Sintoma:** risco de aceitar um token forjado com `alg:none` (sem assinatura) ou confusão RS/HS.
- **Causa:** sem restringir, o `ParseWithClaims` confia no header `alg` do próprio token.
- **Correção:** sempre `jwt.WithValidMethods([]string{"HS256"})` no parse (ver `internal/auth/token.go`); o teste `TestTokenAlgNoneRejeitado` trava isso. Segredo via env obrigatório (≥32 bytes), sem default de dev no código.

## RN `Modal` na web não estica o conteúdo via flex (overlay/sheet transparente)
- **Sintoma:** um `<Modal transparent>` com overlay `flex-1 justify-end bg-black/50` + painel `max-h-[92%] bg-surface` aparece **sem o dim e com o fundo do painel transparente** na web — o conteúdo do form (que tem bg próprio) flutua por cima do dashboard, que vaza por trás. No nativo o mesmo código fica certo.
- **Causa:** o `Modal` do `react-native-web` renderiza o conteúdo num `ModalContent` cujo container interno é só `{flex:1, top:0}`. O `flex-1` do nosso overlay e o `max-h-[92%]` percentual do painel acabam resolvendo contra uma altura que **colapsa pra ~0** nessa cadeia, então `bg-black/50` (dim) e `bg-surface` (painel) não pintam área nenhuma. `justify-end` também não posiciona. NativeWind **funciona** dentro do Modal (inputs/botões com bg pintam) — o problema é puramente a altura/flex dos contêineres estruturais.
- **Correção:** dar ao overlay altura concreta com `style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}` (cor do dim no `style`, não em className) e alinhar o painel via className (`justify-end` mobile / `items-center justify-center` desktop). Backdrop de toque-pra-fechar = um `<Pressable style={StyleSheet.absoluteFill}>` **antes** do painel (o painel, vindo depois, fica por cima). Ver `AccountFormModal.tsx`. Mesmo padrão `absoluteFill` já usado nos gradientes do desktop.
- **Dimensão do painel (largura/altura):** **não** dependa de valores arbitrários de NativeWind tipo `max-w-[480px]`/`ml-gutter` aqui — não aplicaram (o painel desktop continuou full-width; a margem do prefixo não apareceu). Use **número no `style`** (`{ width: 480, maxHeight: Math.round(height * 0.88) }` via `useWindowDimensions`), token **nomeado** (`max-w-md`, como no `AuthLayout`) ou classe da **escala padrão** (`ml-4`, não `ml-gutter`). Centralize o painel com `self-center`. No mobile, bottom sheet (`justify-end` + `slide`); no desktop, diálogo centralizado (`items-center justify-center` + `fade`).
- **Scroll do conteúdo:** o `ScrollView` interno **não** pode usar `flex-1` (a altura do painel é guiada pelo conteúdo, não é definida → `flex-basis:0` colapsa pra 0). Dê um **`maxHeight` numérico** ao próprio `ScrollView` (`{ maxHeight: Math.round(height * 0.72) }`), senão o form transborda o painel (overflow visível), e o que fica embaixo (cores/ícones + botão "Criar conta") sai pra fora da viewport e **não dá pra clicar**.

## Comparar período-calendário entre fusos: hoje (local) × data do banco (UTC)
- **Sintoma:** o botão "Registrar" de uma recorrência **reaparecia logo após registrar** (e dava pra registrar 2× no mesmo período / o `isDue` voltava `true`), só num servidor com fuso negativo (ex.: BRT −3). Os testes unitários (todos em UTC) passavam; só a integração com Postgres pegou.
- **Causa:** `today` vem de `time.Now()` (fuso **local**) e o `last_occurred_on` vem do Postgres como `date` → `pgtype.Date.Time` em **UTC**. O `periodStart` construía o início do mês preservando o fuso de cada um: `1º jun 00:00 −03:00` é um **instante posterior** a `1º jun 00:00 UTC`, então `periodStart(today).After(periodStart(last))` dava `true` (parecia um novo período).
- **Correção:** comparar por **data-civil num fuso fixo**, não por instante. `civilDay(t) = time.Date(t.Year(), t.Month(), t.Day(), 0,0,0,0, time.UTC)` normaliza o ano/mês/dia do relógio de origem pra UTC; todo o `periodStart`/limites operam sobre isso. Ver `server/internal/transacoes/due.go` + o teste de regressão `TestIsDueIgnoraFusoEntreRelogioLocalEDataUTC`. (Regra geral: data de competência é civil/sem hora — nunca compare como instante com TZ.)

## Componente "presentacional" que é dono de uma mutation precisa do QueryClientProvider no teste
- **Sintoma:** um teste que renderiza um componente de UI com `render(...)` (sem provider) quebra com `No QueryClient set, use QueryClientProvider` — mesmo o componente parecendo presentacional. Apareceu ao `RecorrenciasPanel.test`/`RecurrenceRow.test` passarem a renderizar o `RegisterRecurrenceButton`.
- **Causa:** o botão é **autocontido** (chama `useRegisterRecurrence` → `useQueryClient`), então qualquer pai que o renderize condicionalmente (ex.: `RecurrenceRow` quando `isDue`) passa a depender de um `QueryClient` na árvore — não dá mais pra usar o `render` cru.
- **Correção:** nesses testes, troque `render` pelo `renderWithClient` (`__tests__/_support/renderWithClient.tsx`, que embrulha no `QueryClientProvider` de teste). Vale pra todo componente que **embute** mutation/hook de React Query, não só o de form. (Alternativa de design: receber `onAction`+`pending` por prop em vez de embutir a mutation — aí o componente volta a ser testável com `render` cru; aqui optou-se por autocontido pra evitar prop-drilling por `RecorrenciasPanel`/`MobileTransacoes`.)

## Autocomplete de ativo: cripto fora do `IDPadrao` cadastra mas não cota
- **Sintoma:** o usuário escolhe uma cripto no autocomplete do cadastro (ela aparece na busca), cadastra, mas o preço fica 0 e o gráfico/histórico vazio — diferente de BTC/ETH, que cotam sozinhas.
- **Causa:** a busca (CoinGecko `/api/v3/search`, em `cotacao/busca.go`) acha **qualquer** moeda, mas a *cotação*/backfill resolve `ticker→id` via `IDPadrao` (mapa fixo de ~12 moedas em `coingecko.go`). Moeda fora do mapa → `idDe` devolve `(_,false)` → sem cotação automática. A busca e a cotação usam caminhos diferentes (a busca devolve o símbolo; a cotação re-deriva o id pelo símbolo).
- **Correção:** decisão v1 — aceita-se (sem regressão: o ativo entra, só fica com preço manual via PATCH). Ampliar `IDPadrao` conforme a carteira cresce; persistir o `provider_id` da CoinGecko ficou como evolução futura (exigiria migração + mudança na resolução de preço). Ver `cotacao.md` (#6) e `investimentos.md`.

## Busca brapi (`/api/quote/list`) casa só por ticker; `close` ≠ `regularMarketPrice`
- **Sintoma:** digitar "petrobras"/"weg" no autocomplete de Ações/FIIs não acha nada (só "PETR"/"WEGE" acham); e o struct de cotação existente não desserializa a resposta da busca.
- **Causa:** o `search` do `/api/quote/list` da brapi filtra por **substring do TICKER**, não do nome (o CoinGecko `/search` casa nome+símbolo — por isso o mesmo campo se comporta diferente entre classes). E a lista traz o preço em `close`, enquanto `/api/quote/{tickers}` traz `regularMarketPrice` — shapes diferentes, structs diferentes (`brapiListResp` em `busca.go`).
- **Correção:** o placeholder/empty-state do `TickerAutocomplete` orienta a digitar o **código** (ex.: PETR4); `close` ausente/`null` vira preço 0 (`precoOpcional`), nunca erro. Não tente "consertar" pra busca por nome — não há endpoint grátis pra isso.

## Jest: suíte grande estoura o timeout default sob paralelismo
- **Sintoma:** suítes pesadas (dashboard + React Query) falham com "Exceeded timeout of 5000 ms" no `npm test`, mas **passam rodando isoladas** ou com `--maxWorkers=50%`.
- **Causa:** com todas as suítes em paralelo, a contenção de CPU faz o wall-clock de testes de ~300ms passar dos 5s default. Não é bug nem vazamento de handle.
- **Correção:** `testTimeout: 15000` no `jest.config.js` (folga sem mascarar lentidão real). Diagnóstico: rodar a suíte sozinha confirma que o código está certo.

## Cartão exige conta de pagamento (migration 00009): CHECK + limpeza de legados + cast do sqlc
- **Sintoma:** (a) aplicar a `00009` num banco com cartões antigos falha ou apaga cartões; (b) criar cartão sem `paymentAccountId` (ou apontando conta que não é banco) volta **400**, não 500; (c) o sqlc gerou `PaymentAccountID interface{}` (em vez de `string`) na leitura, quebrando o mapeamento no store.
- **Causa:** a `00009` adiciona `accounts.payment_account_id` (FK) + CHECK `card_payment_account_coherent` (**cartão ⇔ tem conta de pagamento; não-cartão ⇔ NULL**). Cartões legados têm o campo NULL e violariam o CHECK, então a migration os **apaga** antes de criá-lo (as transações do cartão caem por `ON DELETE CASCADE` — decisão de produto: cartão sem vínculo deixa de existir, **sem fallback**). O CHECK **não** valida que o alvo é banco/próprio — isso é no Go (`account.ensurePaymentAccount` via `IsBankAccountOwned`/`CountEligiblePaymentAccount`, só `checking`/`savings` ativas do usuário). O `COALESCE(a.payment_account_id::text, '')` sozinho o sqlc infere como `interface{}` (COALESCE de cast); precisa de um **cast externo** `(COALESCE(...))::text` pra virar `string`.
- **Correção:** rode a `00009` num banco onde os cartões possam ser recriados com vínculo (dev usa o seed; o `seedContas` dos testes já insere `payment_account_id`). Nos testes/integração, todo cadastro de cartão manda `paymentAccountId` de uma conta de banco do usuário (ex.: `userANubankAcc`). Ao adicionar leitura de uuid nullable como string no sqlc, use `(COALESCE(col::text, ''))::text`. No client, o cartão sempre tem vínculo, então "Pagar fatura" trava a origem (`lockedOriginId`) sem caminho de escolha manual.

## Testes de integração compartilham `DATABASE_URL` e o seed dá `TRUNCATE` (apagavam o dev)
- **Sintoma:** dados que você criou no app (contas/transações/investimentos) "somem" e voltam pro portfólio demo ao reabrir o server. Forense: o banco fica **só** com dados do usuário `teste@teste.com` (seed) + fixtures de teste (contas `Alelo/Sodexo/Ticket` de IDs `…fd/fe/ff`, usuários `userb@`/`evol@`/`evol2@`), tudo com o **mesmo timestamp** — assinatura de uma rodada da suíte de integração.
- **Causa:** todo teste em `server/test/` lê `os.Getenv("DATABASE_URL")` (a **mesma** env do server de dev) e chama `applySeed` → `server/db/seed.sql`, que faz `TRUNCATE … CASCADE` em todas as tabelas de dado. Apontando pro banco de dev, `go test -tags integration ./test/...` zera tudo (o `TRUNCATE` **não** inclui `users`, por isso os usuários sobrevivem mas contas/transações/investimentos voltam ao demo). `npm test`/`npm run ci` **não** disparam (os arquivos têm `//go:build integration` e não compilam sem a tag; ainda pulam sem `DATABASE_URL`).
- **Correção:** `applySeed` chama `requireTestDB(t, dsn)` (em `server/test/dashboard_integration_test.go`), que **aborta** se o nome do banco não terminar em `_test` — rodar a suíte contra o dev falha limpo, **antes** do `TRUNCATE`, sem apagar nada. Rode a integração num banco dedicado `financial_control_test` (setup no README, seção "Banco de dados"). O `seed.sql` em si continua rodável à mão no dev (reset intencional do demo) — a guarda é só no caminho dos testes.
