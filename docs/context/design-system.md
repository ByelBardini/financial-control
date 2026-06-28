# Design System (client/)

> Leia antes de criar/alterar qualquer componente visual. Fonte de verdade do **padrão visual** do app — o que mantém as telas "conversando entre si". Tokens concretos ficam em `client/tailwind.config.js`; este doc define **como aplicá-los** e quais primitivos compartilhados usar.

## Princípio

O mecanismo de estilo é único (**NativeWind v4 + tokens**), mas o problema histórico foi **reuso**: cada tela reimplementava cabeçalho/botão/card com escolhas diferentes. A regra agora: **componha primitivos compartilhados**, não reescreva `Pressable`/`View` solto. Telas só compõem.

## Tokens (definidos em `tailwind.config.js` — não duplicar)

- **Cores:** `background`/`surface*` (escala `surface-container-lowest`→`surface-bright`), `on-surface`/`on-surface-variant`, `primary` (#d0bcff), `secondary` (#9ddf2e), `error` (#ffb4ab), `outline`/`outline-variant`, `grid-line` (linha fina dos grids desktop).
- **Espaçamento:** `stack-sm` (4) · `base` (8) · `stack-md` (12) · `gutter` (16) · `stack-lg` (24) · `container-margin` (24). Não usar pixels crus.
- **Raio:** `DEFAULT` (2) · `lg` (4) · `xl` (8) · `full` (12).
- **Tipografia:** famílias `hanken`/`hanken-semibold`/`hanken-bold` (títulos/corpo) e `geist-medium`/`geist-semibold` (labels). Escala: `display-lg` (48) / `display-lg-mobile` (36) · `headline-md` (24) · `headline-sm` (20) · `body-lg`/`body-md` · `label-md`/`label-sm`.

### Regra do NativeWind: classes **estáticas**
O compilador não resolve `text-${tone}` montado em runtime. Para cor por tom em `className`, use o helper `theme/toneClass.ts` (`toneText`/`toneBg`/`toneBorder`), que retorna a string literal de um mapa. Para cor em **prop** (`color=`, ex.: glifo do `Icon`), use `theme/colors.ts#toneColor`. Os dois espelham os mesmos tokens — `toneClass` para className, `toneColor` para prop.

## Caixa / casing (decisão de produto)

- **Título da página:** caixa normal (sem `uppercase`) — "Suas contas", "Transações", "Investimentos", "Visão geral".
- **Eyebrow:** rótulo pequeno tonal em **CAIXA ALTA** (`uppercase`, `label-sm`), uma por tela ("MONITOR DE SOBREVIVÊNCIA", "RISCO MÁXIMO", etc.).
- **Botão CTA:** **caixa de frase** — "Nova conta", "Novo ativo", "Nova transação" (casa com o `accessibilityLabel`).

## Padrão de cabeçalho (todas as 4 telas)

Estrutura única: **eyebrow tonal + título grande + subtítulo opcional** à esquerda; **slot de ações** à direita (pílula de mês, busca, ocultar valores, CTA).
- **Desktop:** `DesktopPageHeader` — `display-lg`, shell `flex-row items-end justify-between border-b border-grid-line px-container-margin py-stack-lg`.
- **Mobile:** `MobilePageHeader` — `headline-md`, abaixo do `TopBar`.

## Primitivos compartilhados

| Primitivo | Arquivo | Estado | Papel |
|---|---|---|---|
| `toneClass` | `src/theme/toneClass.ts` | ✅ pronto | `Tone` → className literal (`text-`/`bg-`/`border-`) |
| `toneColor` / `colors` | `src/theme/colors.ts` | ✅ pronto | `Tone` → hex para props `color=` |
| `Icon` / `BrandLogo` | `src/components/` | ✅ pronto | glifo semântico / logo da marca |
| `Eyebrow` | `src/components/Eyebrow.tsx` | ✅ pronto | rótulo tonal CAIXA ALTA |
| `Button` | `src/components/Button.tsx` | ✅ pronto (migração ampla na Onda 2) | botão único (variantes/ícone/loading/anchor) — substitui `Pressable` solto |
| `Fab` | `src/components/Fab.tsx` | ✅ pronto (Contas/Investimentos mobile) | botão de ação flutuante (round, só ícone) das telas mobile |
| `DesktopPageHeader` | `src/components/desktop/DesktopPageHeader.tsx` | ✅ pronto (4 headers desktop migrados) | cabeçalho desktop |
| `MobilePageHeader` | `src/components/MobilePageHeader.tsx` | ✅ pronto (4 telas mobile migradas) | cabeçalho mobile |
| `Card` | `src/components/Card.tsx` | ✅ pronto (todos os cards migrados; `EditableCard` removido) | base dos cards (variantes outlined/accent/row/plain; Pressable+a11y quando `onPress`) |
| `FieldShell` | `src/components/FieldShell.tsx` | ✅ pronto | casca de campo: label CAIXA ALTA + erro (alert); composta por `FormField` (e via ele `MoneyField`/`QuantityField`/`PasswordField`) e `SelectField` |

> Conforme cada onda do refactor (ver `docs/context/client-app.md` e o plano) entrega um primitivo, atualize a coluna "Estado" e mova as telas para compô-lo.

## Acessibilidade (já é padrão no app)

Toggles com `accessibilityRole`/estado; alvos de toque ≥44px; ícones decorativos ocultos (sem label); barras com `accessibilityValue`; valores mascarados com `accessibilityLabel="valor oculto"`. Os primitivos novos herdam isso (ex.: `Button` carrega `accessibilityRole="button"` + label).

## Testes (RNTL 14)

Testar **texto/role/estado, nunca className** (NativeWind não aplica estilo no jest). `await render`, consultar via `screen.*`, `userEvent` (não `fireEvent`). Componente que embute mutation → `renderWithClient`. Ver `docs/context/gotchas.md` e `docs/context/client-app.md#testes`.
