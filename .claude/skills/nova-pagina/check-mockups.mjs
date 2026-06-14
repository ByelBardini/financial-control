#!/usr/bin/env node
// check-mockups.mjs <page-slug>
//
// Step 0 do fluxo /nova-pagina. Aterra a conversa em fatos do repo ANTES de
// qualquer pergunta/planejamento:
//   1. Acha os DOIS mockups de referencia (desktop + mobile) em docs/pages/<slug>/
//      — sem assumir nome exato (o do dashboard se chama "dashbopard.html").
//   2. Lista as rotas ja existentes (AppRoute em routes.ts) pra propor um slug
//      coerente com o padrao atual.
//   3. Cruza os tokens de cor que o mockup USA com os que existem no
//      tailwind.config.js do app → diz quais reusar e quais faltam (decidir:
//      adicionar token OU remapear pra um existente). Concretiza a regra
//      "adapte aos nossos tokens, nao cole o hex do Material".
//
// Uso: node .claude/skills/nova-pagina/check-mockups.mjs contas
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const slug = process.argv[2];
if (!slug) {
  console.error('uso: node check-mockups.mjs <page-slug>   (ex.: contas)');
  console.error('paginas com mockup:', listPageSlugs().join(', ') || '(nenhuma)');
  process.exit(2);
}

const COLOR_PREFIX = /^(?:bg|text|border|from|via|to|ring|fill|stroke|divide|outline|decoration|placeholder|caret|accent)-(.+)$/;

function listPageSlugs() {
  try {
    return readdirSync('docs/pages', { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

// Chaves de cor de um bloco `colors: { ... }` (linhas "<token>: '#..'" ou "'token': 'rgba(..'").
function colorKeys(source) {
  const keys = new Set();
  const re = /['"]?([a-z][a-z0-9-]*)['"]?\s*:\s*['"](?:#|rgba?\()/g;
  let m;
  while ((m = re.exec(source))) keys.add(m[1]);
  return keys;
}

// Tokens de cor efetivamente usados no markup (class="..."), ja sem variante/opacidade.
function usedColorTokens(html, vocab) {
  const used = new Set();
  for (const cls of html.matchAll(/class="([^"]+)"/g)) {
    for (let token of cls[1].split(/\s+/)) {
      token = token.split(':').pop().split('/')[0]; // tira hover: dark: md: e /opacidade
      const hit = token.match(COLOR_PREFIX);
      if (hit && vocab.has(hit[1])) used.add(hit[1]);
    }
  }
  return used;
}

function findMockups(slug) {
  const dir = join('docs/pages', slug);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.html'));
  } catch {
    console.log(`\n# Referencia: ${dir}`);
    console.log('  !! Pasta nao existe. Toda pagina nova precisa de mockup desktop + mobile aqui.');
    console.log(`     paginas com mockup hoje: ${listPageSlugs().join(', ') || '(nenhuma)'}`);
    console.log('     => peca ao usuario os DOIS HTML de referencia antes de prosseguir.');
    process.exit(1);
  }
  const mobile = files.find((f) => /-mobile\.html$/.test(f));
  const desktop = files.find((f) => !/-mobile\.html$/.test(f));
  return { dir, desktop, mobile };
}

function lineCount(path) {
  return readFileSync(path, 'utf8').split('\n').length;
}

function currentRoutes() {
  try {
    const src = readFileSync('client/src/navigation/routes.ts', 'utf8');
    const union = src.match(/AppRoute\s*=\s*([^;]+);/);
    if (!union) return [];
    return [...union[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

const { dir, desktop, mobile } = findMockups(slug);
console.log(`\n# Referencia: ${dir}`);
if (!desktop || !mobile) {
  console.log('  !! FALTA mockup. Esperado: uma versao desktop + uma "*-mobile.html".');
  console.log(`     encontrado: desktop=${desktop ?? 'NENHUM'} | mobile=${mobile ?? 'NENHUM'}`);
  console.log('     => sem as DUAS referencias, pare e peca os mockups ao usuario.');
  process.exit(1);
}
const desktopPath = join(dir, desktop);
const mobilePath = join(dir, mobile);
console.log(`  desktop: ${desktop}  (${lineCount(desktopPath)} linhas)`);
console.log(`  mobile : ${mobile}  (${lineCount(mobilePath)} linhas)`);

console.log('\n# Rotas atuais (client/src/navigation/routes.ts → AppRoute)');
const routes = currentRoutes();
console.log(`  ${routes.length ? routes.map((r) => `'${r}'`).join(' | ') : '(nao encontrei o union AppRoute)'}`);
console.log(`  => proponha um slug novo no mesmo padrao; confirme o caminho com o usuario (regra fixa do fluxo).`);

let appColors = new Set();
try {
  appColors = colorKeys(readFileSync('client/tailwind.config.js', 'utf8'));
} catch {
  console.log('\n  (nao li client/tailwind.config.js — pulei o cruzamento de tokens)');
}

if (appColors.size) {
  const mockHtml = readFileSync(desktopPath, 'utf8') + '\n' + readFileSync(mobilePath, 'utf8');
  const mockVocab = colorKeys(mockHtml); // paleta declarada no <script> do mockup
  const used = usedColorTokens(mockHtml, mockVocab);
  const reuse = [...used].filter((t) => appColors.has(t)).sort();
  const missing = [...used].filter((t) => !appColors.has(t)).sort();

  console.log('\n# Tokens de cor — mockup x tailwind.config.js do app');
  console.log(`  reusar (ja existem no app): ${reuse.join(', ') || '(nenhum)'}`);
  console.log(`  FALTAM no app (decidir: adicionar token OU remapear): ${missing.join(', ') || '(nenhum)'}`);
  console.log('  => nunca cole o hex do Material no JSX; use o nome do token (NativeWind).');
}

console.log('\nProximo passo: faça as perguntas (caminho/rota + escopo) ANTES de planejar.\n');
