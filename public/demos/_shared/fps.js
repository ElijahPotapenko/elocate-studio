// FPS у курсора — общий для всех кейсов и сайта Elocate (механика, без цветов кейса).
// Показывает кадры в секунду и худший кадр за полсекунды; цвет: ≥55 зелёный, ≥40 жёлтый, ниже — красный.
// Кожа — у каждого проекта своя: переменные --fps-bg/-fg/-font/-tracking/-ring/-radius/-good/-mid/-bad в его :root
// (запасные значения — нейтральная тёмная плашка). Механика общая, вид — локальный.
// Включение: по умолчанию на localhost; на проде — ?fps=1 (запоминается), выключить — ?fps=0 или Shift+F.
// Дёшево: позиция плашки обновляется в том же rAF (transform), текст — дважды в секунду.
const KEY = 'elocate-fps';
const store = { get() { try { return localStorage.getItem(KEY); } catch { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch { /* приватный режим */ } } };
const q = new URLSearchParams(location.search).get('fps');
if (q === '1' || q === '0') store.set(q);
const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
let on = store.get() ? store.get() === '1' : local;

let el, raf = 0, frames = 0, worst = 0, last = 0, t0 = 0, mx = -1, my = -1, moved = true;
function mount() {
  el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.className = 'fps-meter no-audit';   // служебный инструмент — вне типографики кейсов (typeAudit его пропускает)
  el.className = 'fps-meter';
  el.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform;white-space:nowrap;font-variant-numeric:tabular-nums;'
    + 'font:var(--fps-font, 600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace);letter-spacing:var(--fps-tracking, 0);'
    + 'color:var(--fps-fg, #fff);background:var(--fps-bg, rgba(10,10,12,.78));padding:5px 9px;border-radius:var(--fps-radius, 7px);'
    + 'box-shadow:var(--fps-ring, 0 0 0 1px rgba(255,255,255,.14));';
  el.textContent = '… fps';
  document.body.appendChild(el);
  last = t0 = performance.now(); frames = 0; worst = 0; moved = true;
  raf = requestAnimationFrame(tick);
}
function unmount() { cancelAnimationFrame(raf); el && el.remove(); el = null; }
function tick(t) {
  const dt = t - last; last = t; frames++; if (dt > worst) worst = dt;
  if (t - t0 >= 500) {
    const fps = Math.round(frames * 1000 / (t - t0));
    const c = fps >= 55 ? 'var(--fps-good, #6ee7a0)' : fps >= 40 ? 'var(--fps-mid, #facc15)' : 'var(--fps-bad, #f87171)';
    el.innerHTML = `<span style="color:${c}">●</span> ${fps} fps · ${Math.round(worst)} ms`;
    frames = 0; worst = 0; t0 = t;
  }
  if (moved) {   // двигаем плашку только когда мышь сдвинулась — иначе сам счётчик дёргал бы стили каждый кадр
    moved = false;
    const x = mx < 0 ? innerWidth - 120 : Math.min(mx + 16, innerWidth - 120), y = my < 0 ? innerHeight - 40 : Math.min(my + 18, innerHeight - 28);
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
  }
  raf = requestAnimationFrame(tick);
}
addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; moved = true; }, { passive: true });
addEventListener('resize', () => { moved = true; });
addEventListener('keydown', (e) => {
  if (e.shiftKey && (e.key === 'F' || e.key === 'f') && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) {
    on = !on; store.set(on ? '1' : '0'); on ? mount() : unmount();
  }
});
if (on) { document.readyState === 'loading' ? addEventListener('DOMContentLoaded', mount, { once: true }) : mount(); }
