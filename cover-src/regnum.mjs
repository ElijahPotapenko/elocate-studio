// Обложка кейса Regnum для сетки портфолио: широкая 21:9 (2240×960) + мобильная 16:10 (1600×1000).
// Минимализм (слово Элайджи 2026-11-27): иллюстрация кейса фоном + логотип по центру — корона и надпись.
// Один центр композиции → на телефоне ничего не режется. Дев-сервер не нужен: собирается из файлов кейса.
// Запуск: node cover-src/regnum.mjs → public/assets/work/regnum.webp · regnum-m.webp
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PH } from '../public/demos/regnum/ds/icons.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = 'data:image/webp;base64,' + readFileSync(path.join(ROOT, 'public/demos/regnum/assets/hero-elves.webp')).toString('base64');

// цвета — как у темы Elven (лунное серебро-золото по хвойно-чёрному)
const page = (w, h, logo) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;position:relative;background:oklch(9% .02 165);display:grid;place-items:center}
.art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 22%;filter:saturate(1.05)}
/* затемнение к центру-логотипу и виньетка: картинка читается по краям, логотип — на спокойной середине */
.veil{position:absolute;inset:0;background:radial-gradient(42% 58% at 50% 50%, rgb(5 14 11 / .86), rgb(5 14 11 / .62) 55%, rgb(4 10 8 / .5) 80%, rgb(3 8 6 / .78)), rgb(4 12 9 / .18)}
.logo{position:relative;display:flex;flex-direction:column;align-items:center;gap:${logo * .18}px}
.logo svg{width:${logo * .9}px;height:${logo * .9}px;filter:drop-shadow(0 0 ${logo * .35}px oklch(85% .06 100 / .35))}
.word{font:900 ${logo}px/1 Cinzel;letter-spacing:.14em;padding-left:.14em;
  background:linear-gradient(180deg, oklch(96% .03 105), oklch(84% .06 100) 45%, oklch(66% .06 90));-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 oklch(20% .03 120 / .6)) drop-shadow(0 0 ${logo * .5}px oklch(85% .06 100 / .25))}
.rule{display:flex;align-items:center;gap:${logo * .2}px;width:${logo * 4.2}px}
.rule i{flex:1;height:1px;background:linear-gradient(90deg, transparent, oklch(80% .06 100 / .7), transparent)}
.rule b{width:${logo * .14}px;height:${logo * .14}px;transform:rotate(45deg);background:oklch(84% .06 100)}
</style></head><body>
<img class="art" src="${ART}"><div class="veil"></div>
<div class="logo">
  <svg viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="oklch(96% .03 105)"/><stop offset=".5" stop-color="oklch(84% .06 100)"/><stop offset="1" stop-color="oklch(66% .06 90)"/></linearGradient></defs>
    <path d="${PH.crown[0]}" fill="url(#g)" opacity=".35"/><path d="${PH.crown[1]}" fill="url(#g)"/></svg>
  <div class="word">Regnum</div>
  <div class="rule"><i></i><b></b><i></i></div>
</div></body></html>`;

const b = await chromium.launch();
const shot = async (w, h, logo) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.setContent(page(w, h, logo), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const png = await p.screenshot(); await p.close(); return png;
};
const wide = await shot(1120, 480, 64);      // 21:9 — широкая карточка
const mob = await shot(800, 500, 60);        // 16:10 — телефон
await b.close();
await sharp(wide).webp({ quality: 84 }).toFile(path.join(ROOT, 'public', 'assets', 'work', 'regnum.webp'));
await sharp(mob).webp({ quality: 84 }).toFile(path.join(ROOT, 'public', 'assets', 'work', 'regnum-m.webp'));
console.log('✓ public/assets/work/regnum.webp · regnum-m.webp');
