---
name: nova-pagina
description: Guia para construir uma TELA/PÁGINA nova no app (client/ Expo + RN). Use quando o usuário pedir para criar/adicionar uma nova tela, página, rota ou view — "nova página", "criar tela", "adicionar página", "build a new screen/page". Parte dos mockups de referência em docs/pages/<slug>/ (desktop + mobile), adapta ao padrão de mercado em vez de copiar 1:1, SEMPRE pergunta o caminho/rota antes, e entrevista bastante antes de planejar.
---

# Construir uma página nova (`/nova-pagina`)

Fluxo para criar uma tela nova no app. **Não é** um gerador automático: é um guia que
**entrevista o usuário, decide a rota junto com ele e adapta os mockups** — nunca cola 1:1.

Toda tela nova tem referência em `docs/pages/<slug>/`: uma versão **desktop** e uma **mobile**
(HTML/Tailwind estático, fora do runtime). Elas são **referência de intenção**, não gabarito.
Os tokens do `client/tailwind.config.js` foram extraídos desses mockups — então "adaptar" =
**reusar nossos tokens NativeWind, não colar o hex do Material**.

> Caminhos abaixo são relativos à **raiz do repo**. Uma página nova costuma tocar `client/`
> (tela + layouts + componentes + hooks + api + types), `docs/context/` e, se precisar de dados
> novos, `server/`.

## Regras inegociáveis (o usuário pediu explicitamente)

1. **SEMPRE pergunte o caminho/rota da tela antes de qualquer coisa.** Ofereça 2–3 ideias de
   slug, **diga qual é a recomendada pelo padrão de mercado e por quê**, e confirme com o usuário.
   Hoje a "rota" é um valor do union `AppRoute` (`client/src/navigation/routes.ts`) — não há lib de
   URL ainda; o slug que você escolher vira o segmento de URL quando o Expo Router entrar. Os slugs
   existentes são em **português, minúsculo, substantivo no plural** (`dashboard`, `contas`) → para
   uma tela de transações, recomende `'transacoes'` (coerente com o padrão atual) e ofereça
   `'movimentacoes'`/`'extrato'` como alternativas, explicando o trade-off.
2. **Entreviste BASTANTE antes de planejar.** Nada de código nem de plano antes de várias perguntas
   respondidas. Isso reforça o CLAUDE.md ("Interview me on non-trivial features (3+ steps)";
   "Plan only when asked. No code until told to proceed").
3. **Adapte, não copie.** Pegue do mockup o que segue padrão de mercado e usabilidade; descarte o
   que for específico do protótipo. Justifique cada desvio relevante.

## Passo 0 — rode o check (aterra a conversa em fatos)

Antes de perguntar qualquer coisa, rode o driver com o slug que o usuário mencionou (ou o candidato):

```bash
node .claude/skills/nova-pagina/check-mockups.mjs contas
```

Ele: (a) acha os **dois** mockups sem depender do nome exato (o do dashboard se chama
`dashbopard.html` — typo real); (b) lista as **rotas atuais** pra você propor um slug coerente;
(c) cruza os **tokens de cor** que o mockup usa com o `tailwind.config.js`, separando
"reusar" de "FALTAM (decidir: adicionar token ou remapear)". Saída real (resumida):

```
# Referencia: docs/pages/contas
  desktop: contas.html  (669 linhas)
  mobile : contas-mobile.html  (522 linhas)
# Rotas atuais (... AppRoute)
  'dashboard' | 'contas'
# Tokens de cor — mockup x tailwind.config.js do app
  reusar (ja existem no app): primary, secondary, surface-container, ...
  FALTAM no app (decidir: adicionar token OU remapear): secondary-fixed, tertiary-container, ...
```

- **Sem os dois mockups** (pasta ausente ou faltando desktop/mobile) → ele sai com código ≠ 0 e te
  manda **parar e pedir os HTML ao usuário**. Não invente a tela sem referência.

## Passo 1 — entreviste ANTES de planejar

Leia os **dois** mockups (`Read` no desktop e no mobile) e o `docs/context/client-app.md`. Depois
faça perguntas em rodada, **começando pela rota**. Cubra ao menos:

- **Caminho/rota** (regra 1): proponha slugs + recomende um + confirme. **Sempre primeiro.**
- **Propósito e usuário**: o que a pessoa vem fazer aqui? Qual a ação principal?
- **Dados**: vêm de endpoint que já existe (`server-api.md`) ou precisa criar no `server/`? Formato?
  (Monetário é **centavos inteiros**; ver `docs/context/money.md` — nunca float.)
- **Seções/cards** e prioridade visual: o que é hero, o que é secundário.
- **Ações**: só leitura? CRUD? modal (como o `AccountFormModal`)? navega pra onde?
- **Estados**: vazio, carregando (skeleton), erro **por seção** (`QuerySection`), valores ocultos
  (a app tem `useHideValues`/`HideValuesToggle`).
- **Responsividade**: além do layout, o que muda de conteúdo entre desktop e mobile?
- **Navegação**: entra no `SideNav` (desktop) e `BottomNav` (mobile)? Com que ícone/label?
- **Escopo do MVP** vs. depois (CLAUDE.md: máx. 5 arquivos por fase).

Só passe para o plano quando o usuário responder e mandar prosseguir ("pode ir" / "do it").

## Passo 2 — planeje e implemente (pipeline desta base)

Plano em fases (≤5 arquivos cada), **TDD test-first** (`client/__tests__/` espelhando `src/`).
A ordem de fiação de uma página nova neste repo:

1. **Rota** — adicione o slug ao union em `client/src/navigation/routes.ts` e o branch em
   `client/src/navigation/AuthenticatedApp.tsx`.
2. **Nav** — entrada (label + ícone + `route`) em `client/src/components/desktop/SideNav.tsx` e
   `client/src/components/BottomNav.tsx` (já navegam por `currentRoute`/`onNavigate`).
3. **Tela** — `client/src/screens/<Page>Screen.tsx`: escolhe layout por `useIsDesktop`, repassa
   `route`/`onNavigate`/`onLogout`, é dona do estado de UI (ex.: modal). Nada de fetch aqui.
4. **Layouts** — `client/src/components/Mobile<Page>.tsx` e
   `client/src/components/desktop/Desktop<Page>.tsx`. **Presentacionais/prop-driven.**
5. **Componentes de seção** — um por arquivo, em `components/` (mobile+compartilhado) /
   `components/desktop/`. Reuse os primitivos: `MoneyText`, `ProgressBar`, `StatusBadge`,
   `SectionHeading`, `QuerySection`/`QuerySection2`, `Icon`, etc.
6. **Dados** — hooks por seção em `client/src/hooks/use<Page>Queries.ts` (um `useQuery` por card,
   chave própria); chamadas só em `client/src/api/<page>.ts` (use `apiGet`/`apiPost`/… do
   `client.ts` — **nenhum `.tsx` faz `fetch`**). Tipos em `client/src/types/<page>.ts`.
7. **Server (se precisar dado novo)** — leia `docs/context/server-api.md` + `database.md` antes:
   `handler → service → store` + migration goose + query sqlc. **Test-first** (`server/test/` p/ e2e).
8. **Docs** — atualize `docs/context/client-app.md` (e `server-api.md`/`database.md` se mexeu no
   server). O doc é a fonte de verdade da próxima tarefa.
9. **Veja rodar** — confira visualmente (`npm run dev:client`, web em :8081) ou use a skill `/run`.

Comandos de teste do projeto (ver `AGENTS.md`): `npm run test:client` (client) / `npm test` (tudo).

## Adaptar o mockup, não copiar

- O HTML usa a paleta **completa** do Material; o app usa um **subconjunto curado** (`tailwind.config.js`).
  Para cada token na lista "FALTAM" do Passo 0: **remapeie** para o token existente mais próximo
  (preferido) ou, se for essencial, **adicione** ao `tailwind.config.js` — nunca hardcode o hex no JSX.
- O mockup é HTML/CSS; o app é **React Native + NativeWind v4**. Nem toda classe web existe
  (`Image` é core RN via `BrandLogo`; ícones via `Icon`; sombra/grid diferem). Confirme APIs do
  Expo/RN **v56** antes de usar (ver `client/AGENTS.md`).
- Padrão de mercado > fidelidade ao protótipo: alvos de toque ≥44px, hierarquia clara, estados
  vazio/erro/carregando, acessibilidade (roles/labels — ver `client-app.md`). Se o mockup ferir
  isso, **adapte e explique**.

## Gotchas

- **Nome do mockup é inconsistente** (`dashbopard.html` tem typo). Sempre rode o Passo 0 para
  resolver os arquivos por sufixo `-mobile`, não por nome chutado.
- **Não há lib de routing.** "Rota" = valor do union `AppRoute` + estado no `AuthenticatedApp`.
  Não instale router sem pedir; o shell já está isolado para um futuro Expo Router.
- **Dinheiro em centavos inteiros**, formate só na borda (`lib/money.ts#formatBRL`). Nunca float.
- **Telas não fazem fetch.** Toda chamada vive em `src/api`; dados chegam por hook React Query.
- **`render` é assíncrono** (RNTL 14): `await render(...)`, `screen.findBy…`, `userEvent` (ver
  `docs/context/gotchas.md`).

## O driver

`check-mockups.mjs` (neste diretório) — valida referência, lista rotas e cruza tokens. Node puro,
sem deps. Uso: `node .claude/skills/nova-pagina/check-mockups.mjs <slug>`. Exit 0 ok, 1 falta
mockup, 2 uso errado.
