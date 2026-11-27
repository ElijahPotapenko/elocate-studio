// ════════════════════════════════════════════════════════════════════════════════════════
// Regnum DS — эффекты. Правило отбора: проверенные бесплатные решения, которые работают ТОЛЬКО в момент действия
// (переход, наведение, выигрыш, появление) — в простое страница стоит и ничего не стоит (см. perf/ — пул тестов).
//   • View Transitions API — нативный переход между разделами (Chrome/Edge 111+, Safari 18+, Firefox 144+); 0 КБ.
//   • Подсветка под курсором (spotlight) — приём Linear/Vercel: координаты курсора в CSS-переменные одной карточки.
//   • canvas-confetti (MIT, ~6 КБ) — салют на выигрыш, грузится по требованию, цвета — из токенов темы.
//   • GSAP + SplitText (бесплатно с 30.04.2025, включая коммерцию) — проявление заголовка по словам, один раз.
// Всё уважает prefers-reduced-motion.
// ════════════════════════════════════════════════════════════════════════════════════════
import { flushSync } from 'react-dom';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── View Transitions: обёртка над обновлением состояния. Нет поддержки / reduced motion → просто обновить ── */
export function viewTransition(update) {
  if (!document.startViewTransition || reduced()) { update(); return null; }
  return document.startViewTransition(() => flushSync(update));   // переход — для тех, кому нужен его конец (.finished)
}

/* ── Spotlight: один слушатель на документ; переменные --mx/--my пишутся только в карточку под курсором ── */
let spotOn = false;
export function initSpotlight(selector = '.spot') {
  if (spotOn) return; spotOn = true;
  let el = null, rect = null, x = 0, y = 0, raf = 0;
  const paint = () => { raf = 0; if (el && rect) { el.style.setProperty('--mx', (x - rect.left) + 'px'); el.style.setProperty('--my', (y - rect.top) + 'px'); } };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const t = e.target.closest && e.target.closest(selector);
    if (t !== el) { el = t; rect = t ? t.getBoundingClientRect() : null; }
    if (!el) return;
    x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  addEventListener('scroll', () => { if (el) rect = el.getBoundingClientRect(); }, { passive: true });
}

/* ── Тост: ЕДИНСТВЕННЫЙ способ сообщить что-то пользователю — плашка внизу экрана (одна за раз, сама уходит).
   icon — путь линейной иконки 24×24, kind — вид (ok · win · info · wallet · bell): красит значок. Обёртка с выбором
   иконки по виду — notify() в components.js; напрямую toast() не зовём ── */
let toastEl = null, toastT = 0;
export function toast(text, { icon = '', kind = 'info', ms = 2800 } = {}) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'rg-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
  toastEl.dataset.kind = kind;
  toastEl.innerHTML = (icon ? `<span class="tt-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${icon}"/></svg></span>` : '') + '<span class="tt-tx"></span>';
  toastEl.querySelector('.tt-tx').textContent = text;
  toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
  return toastEl;
}

/* ── Цвета темы → hex (canvas-confetti понимает только hex/rgb) ── */
function themeHex(vars) {
  const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d', { willReadFrequently: true });
  return vars.map((v) => {
    const probe = document.createElement('i'); probe.style.color = `var(${v})`; document.body.appendChild(probe);
    const col = getComputedStyle(probe).color; probe.remove();
    g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = col; g.fillRect(0, 0, 1, 1);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data; return '#' + [r, gr, b].map((n) => n.toString(16).padStart(2, '0')).join('');
  });
}

/* ── Салют на выигрыш: два залпа из центра элемента, металл и акцент темы ── */
let confettiP = null;
export async function celebrate(el, { big = false } = {}) {
  if (reduced()) return;
  confettiP ||= import('https://esm.sh/canvas-confetti@1.9.3').then((m) => m.default);
  const confetti = await confettiP;
  const r = el?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const origin = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight };
  const colors = themeHex(['--metal-hi', '--metal', '--metal-2', '--accent', '--accent-2', '--gem']);
  const base = { origin, colors, disableForReducedMotion: true, zIndex: 50, ticks: 220, scalar: 1.05, gravity: 0.9 };
  confetti({ ...base, particleCount: big ? 160 : 110, spread: 75, startVelocity: 42, shapes: ['circle', 'circle', 'square'] });
  setTimeout(() => confetti({ ...base, particleCount: big ? 90 : 60, spread: 120, startVelocity: 28, decay: 0.92, shapes: ['circle'] }), 180);
}

/* ── Заголовок: проявление по словам из-под маски строк (GSAP SplitText). Один раз на монтирование ── */
let gsapP = null;
const loadGsap = () => (gsapP ||= Promise.all([import('gsap'), import('gsap/SplitText')]).then(([g, s]) => {
  const gsap = g.gsap || g.default, SplitText = s.SplitText || s.default; gsap.registerPlugin(SplitText); return { gsap, SplitText };
}));
export async function revealHeadline(el, { delay = 0.05 } = {}) {
  if (!el || reduced() || el.dataset.revealed) return;
  el.dataset.revealed = '1';
  el.style.visibility = 'hidden';                                   // не мигнуть «голым» текстом до разбиения
  if (document.getElementById('rg-loader')) await new Promise((r) => addEventListener('rg:loaded', r, { once: true }));   // играть после экрана загрузки
  try {
    const { gsap, SplitText } = await loadGsap();
    await document.fonts.ready;
    // высота заголовка — замок: строки-маски чуть выше обычных; без замка блок менял высоту и дёргал текст и кнопки
    const h0 = el.getBoundingClientRect().height; el.style.height = h0 + 'px';
    const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'rv-line', wordsClass: 'rv-word' });
    // слова внутри металлического акцента (b.metal-text) получают свой градиент — иначе background-clip:text
    // родителя не красит сдвигаемые дочерние слова
    split.words.forEach((w) => { if (w.closest('.metal-text') && !w.classList.contains('metal-text')) w.classList.add('metal-text'); });
    el.style.visibility = '';
    gsap.from(split.words, { yPercent: 110, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.055, delay,
      // разметку НЕ возвращаем сразу: revert в конце сдвигал вторую строку на 3 px и перекрашивал градиент «€500» —
      // заметный рывок «после анимации» (слово Элайджи 2026-11-27). Возвращаем только при смене ширины (строки всё равно пересобираются)
      onComplete: () => { const w0 = innerWidth; const back = () => { if (innerWidth === w0) return; removeEventListener('resize', back); split.revert(); el.style.height = ''; };
        addEventListener('resize', back, { passive: true }); } });
  } catch { el.style.visibility = ''; el.style.height = ''; }
}
