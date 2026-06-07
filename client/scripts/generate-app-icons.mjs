// Gera favicon (web) e ícones do app (iOS/Android) a partir de assets/logo.png,
// compondo o logo sobre o fundo azul-escuro da marca. Rode: `npm run icons` (em client/).
//
// Quem arredonda os cantos:
//   - web favicon  -> o navegador NÃO arredonda; os cantos são "queimados" aqui (máscara alpha).
//   - iOS icon     -> o SO aplica a máscara squircle; icon.png precisa ser um quadrado opaco.
//   - Android      -> o launcher mascara o foregroundImage sobre o backgroundColor (app.json).
import { Jimp } from 'jimp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const SOURCE = join(ASSETS, 'logo.png');

const BG = 0x0b1f3aff; // #0B1F3A opaco (fundo azul-escuro da marca; só do ícone)
const TRANSPARENT = 0x00000000;

// Centraliza o logo (já contido numa caixa quadrada) sobre um canvas quadrado.
function compose(canvas, logoSquare) {
  const offset = Math.round((canvas.bitmap.width - logoSquare.bitmap.width) / 2);
  return canvas.composite(logoSquare, offset, offset);
}

// Zera o alpha fora de um retângulo de cantos arredondados (raio r).
function roundCorners(image, r) {
  const { width: w, height: h } = image.bitmap;
  image.scan(0, 0, w, h, (x, y, idx) => {
    let cx = x;
    let cy = y;
    if (x < r) cx = r;
    else if (x > w - 1 - r) cx = w - 1 - r;
    else return;
    if (y < r) cy = r;
    else if (y > h - 1 - r) cy = h - 1 - r;
    else return;
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) image.bitmap.data[idx + 3] = 0;
  });
  return image;
}

async function loadLogo() {
  const logo = await Jimp.read(SOURCE);
  return logo.autocrop(); // remove a margem transparente -> os ratios controlam o tamanho real
}

// Logo contido numa caixa `box`×`box` (preserva proporção, fundo transparente).
function logoBox(logo, box) {
  return logo.clone().contain({ w: box, h: box });
}

async function buildFavicon(logo) {
  const SS = 256; // supersample p/ cantos suaves; reduz pra 64 no fim
  const out = 64;
  const canvas = new Jimp({ width: SS, height: SS, color: BG });
  compose(canvas, logoBox(logo, Math.round(SS * 0.7)));
  roundCorners(canvas, Math.round(SS * 0.22));
  canvas.resize({ w: out, h: out });
  const path = join(ASSETS, 'favicon.png');
  await canvas.write(path);
  return [path, out];
}

async function buildIcon(logo) {
  const size = 1024;
  const canvas = new Jimp({ width: size, height: size, color: BG }); // opaco, sem cantos (iOS mascara)
  compose(canvas, logoBox(logo, Math.round(size * 0.66)));
  const path = join(ASSETS, 'icon.png');
  await canvas.write(path);
  return [path, size];
}

async function buildAndroidForeground(logo) {
  const size = 1024;
  const canvas = new Jimp({ width: size, height: size, color: TRANSPARENT }); // SO desenha o backgroundColor
  compose(canvas, logoBox(logo, Math.round(size * 0.55))); // safe zone do adaptive icon
  const path = join(ASSETS, 'android-icon-foreground.png');
  await canvas.write(path);
  return [path, size];
}

const logo = await loadLogo();
for (const build of [buildFavicon, buildIcon, buildAndroidForeground]) {
  const [path, size] = await build(logo);
  console.log(`✓ ${path} (${size}×${size})`);
}
