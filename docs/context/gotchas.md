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
