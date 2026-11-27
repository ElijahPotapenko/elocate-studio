// Обложка кейса Regnum для сетки портфолио: широкая карточка 21:9 (2240×960) + мобильная 16:10 (1600×1000) —
// на телефоне карточки 16:10, и широкая обложка резалась по центру (заголовок терялся).
// Протокол обложек (как у Support Bot / Analytics Pulse / Nova): не скриншот страницы, а композиция в шрифтах и палитре
// самого кейса — настоящие куски UI демо, снятые в 2×, слоями, с глубиной и наклоном.
// Запуск (нужен дев-сервер `npm run dev` на :4321): node cover-src/regnum.mjs → public/assets/work/regnum.webp
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = path.join(ROOT, 'cover-src', '.tmp'); mkdirSync(TMP, { recursive: true });
const DEMO = 'http://localhost:4321/demos/regnum/index.html';

const b = await chromium.launch();
// 1) куски UI — с живой демки, в 2×
const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(DEMO, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
for (let y = 0; y < 3000; y += 300) { await p.mouse.wheel(0, 300); await p.waitForTimeout(100); }   // Reveal/CountUp доиграли
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
const shot = async (sel, name, nth = 0) => { await p.locator(sel).nth(nth).screenshot({ path: path.join(TMP, name + '.png'), omitBackground: true }); };
await shot('.profile', 'profile');
await shot('.game', 'game1', 0); await shot('.game', 'game2', 1); await shot('.game', 'game3', 3);
await shot('.stats .meter', 'mult', 0);
// колесо — без фона героя (прозрачный PNG)
await p.addStyleTag({ content: 'body,.wheel-panel,.wheel-panel .orn,.wheel-panel .in{background:transparent!important} .wheel-panel .ornw::before,.wheel-panel .in::after,.wheel-panel .cr,.wheel-glow,.guilloche,body::before,body::after,.dust{display:none!important} .wheel-panel .wheel-wrap{padding-top:22px} .wheel{filter:drop-shadow(0 18px 28px rgb(0 0 0 / .7))!important}' });   // колесо живёт в WheelPanel — снимаем без её фона
await p.locator('.wheel-panel .spin-btn').scrollIntoViewIfNeeded(); await p.click('.wheel-panel .spin-btn'); await p.waitForTimeout(8000);                                   // остановилось на призе — с плашкой выигрыша
await shot('.wheel-panel .wheel-wrap', 'wheel');
await p.close();

// 2) композиция 1120×480 (×2 = 2240×960)
const img = (n) => 'data:image/png;base64,' + readFileSync(path.join(TMP, n + '.png')).toString('base64');
const ART = 'data:image/webp;base64,' + readFileSync(path.join(ROOT, 'public/demos/regnum/assets/hero-elves.webp')).toString('base64');
const page = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Manrope:wght@600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box} body{width:1120px;height:480px;overflow:hidden;position:relative;font-family:Manrope;
 background:radial-gradient(45% 70% at 80% 40%, oklch(42% 0.12 158 / .5), transparent 70%), radial-gradient(30% 50% at 80% 40%, oklch(85% 0.06 100 / .16), transparent 70%), radial-gradient(50% 70% at 0% 110%, oklch(40% 0.1 280 / .25), transparent 60%), oklch(8.5% 0.02 165)}
body::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg, oklch(100% 0 0 / .018) 0 2px, transparent 2px 10px)}
.art{position:absolute;right:0;top:0;height:100%;width:72%;object-fit:cover;object-position:50% 20%;opacity:.55;-webkit-mask-image:linear-gradient(90deg,transparent,#000 40%);mask-image:linear-gradient(90deg,transparent,#000 40%)}
.eb{position:absolute;left:64px;top:118px;font:700 12px/1 Cinzel;letter-spacing:.28em;color:oklch(84% 0.06 100)}
h1{position:absolute;left:60px;top:146px;font:800 66px/1 Cinzel;color:oklch(95% 0.02 85);letter-spacing:.01em}
h1 b{display:block;margin-top:6px;background:linear-gradient(135deg,oklch(84% 0.06 100),oklch(95% 0.035 108) 40%,oklch(68% 0.06 90));-webkit-background-clip:text;background-clip:text;color:transparent}
.chips{position:absolute;left:64px;top:330px;display:flex;gap:8px}
.chips span{padding:7px 12px;font:700 11px/1 Manrope;letter-spacing:.06em;color:oklch(84% 0.06 100);border:1px solid oklch(62% 0.05 90 / .6);clip-path:polygon(7px 0,calc(100% - 7px) 0,100% 7px,100% calc(100% - 7px),calc(100% - 7px) 100%,7px 100%,0 calc(100% - 7px),0 7px)}
.pc{position:absolute;filter:drop-shadow(0 24px 34px oklch(0% 0 0 / .6))}
</style></head><body>
<img class="art" src="${ART}">
<div class="eb">GAMEDEV · ROYAL CASINO UI</div>
<h1>Rule the<b>game.</b></h1>
<div class="chips"><span>REACT</span><span>DESIGN SYSTEM</span><span>CROWN WHEEL</span></div>
<img class="pc" src="${img('profile')}" style="left:470px;top:30px;width:200px;transform:rotate(-7deg)">
<img class="pc" src="${img('game2')}" style="left:604px;top:282px;width:156px;transform:rotate(-3deg)">
<img class="pc" src="${img('game1')}" style="left:430px;top:300px;width:150px;transform:rotate(-11deg)">
<img class="pc" src="${img('mult')}" style="left:610px;top:34px;width:240px;transform:rotate(4deg);opacity:.95">
<img class="pc" src="${img('wheel')}" style="left:735px;top:72px;width:320px;transform:rotate(5deg)">
<img class="pc" src="${img('game3')}" style="left:930px;top:318px;width:132px;transform:rotate(8deg)">
</body></html>`;
const html = path.join(TMP, 'cover.html'); writeFileSync(html, page);
const pageM = page
  .replace('width:1120px;height:480px', 'width:800px;height:500px')
  .replace(/<img class="pc"[^>]*>\n/g, '')
  .replace('.eb{position:absolute;left:64px;top:118px', '.eb{position:absolute;left:44px;top:64px')
  .replace('h1{position:absolute;left:60px;top:146px;font:800 66px/1 Cinzel', 'h1{position:absolute;left:40px;top:90px;font:800 56px/1 Cinzel')
  .replace('.chips{position:absolute;left:64px;top:330px', '.chips{position:absolute;left:44px;top:236px')
  .replace('</body>', `<img class="pc" src="${img('wheel')}" style="left:470px;top:28px;width:300px;transform:rotate(5deg)">
<img class="pc" src="${img('game1')}" style="left:40px;top:300px;width:140px;transform:rotate(-8deg)">
<img class="pc" src="${img('game2')}" style="left:190px;top:296px;width:140px;transform:rotate(-2deg)">
<img class="pc" src="${img('game3')}" style="left:340px;top:300px;width:136px;transform:rotate(5deg)">
<img class="pc" src="${img('mult')}" style="left:510px;top:372px;width:260px;transform:rotate(-3deg)"></body>`);
const htmlM = path.join(TMP, 'cover-m.html'); writeFileSync(htmlM, pageM);
const c = await b.newPage({ viewport: { width: 1120, height: 480 }, deviceScaleFactor: 2 });
await c.goto('file://' + html, { waitUntil: 'networkidle' }); await c.evaluate(() => document.fonts.ready); await c.waitForTimeout(400);
const png = await c.screenshot();
const cm = await b.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 2 });
await cm.goto('file://' + htmlM, { waitUntil: 'networkidle' }); await cm.evaluate(() => document.fonts.ready); await cm.waitForTimeout(400);
const pngM = await cm.screenshot();
await b.close();
await sharp(png).webp({ quality: 84 }).toFile(path.join(ROOT, 'public', 'assets', 'work', 'regnum.webp'));
await sharp(pngM).webp({ quality: 84 }).toFile(path.join(ROOT, 'public', 'assets', 'work', 'regnum-m.webp'));   // телефон: карточка 16:10
console.log('✓ public/assets/work/regnum.webp · regnum-m.webp');
